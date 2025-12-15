// services/walletService.ts - ENHANCED WITH SECURITY
import { firebaseService } from './firebaseService';
import { securityService, TransactionType } from './securityService';
import { soundManager } from '@/lib/soundManager';

export const walletService = {
  /**
   * Get wallet for a user
   */
  async getWallet(userId: string) {
    return await firebaseService.getWallet(userId);
  },

  /**
   * Debit wallet with security check
   */
  async debitWallet(
    userId: string, 
    amount: number, 
    options: { 
      description: string;
      requireAuth?: boolean;
      transactionType?: TransactionType;
    }
  ): Promise<void> {
    // Security check if required
    if (options.requireAuth !== false) {
      const settings = await securityService.getSecuritySettings(userId);
      if (settings?.isPinEnabled || settings?.isBiometricEnabled) {
        throw new Error('AUTH_REQUIRED');
      }
    }

    const wallet = await firebaseService.getWallet(userId);
    
    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    wallet.balance -= amount;
    wallet.transactions.unshift({
      id: Date.now().toString(),
      type: 'debit',
      amount,
      description: options.description,
      timestamp: Date.now(),
      status: 'completed',
    });

    await firebaseService.updateWallet(wallet);
    await soundManager.play('debit');
  },

  /**
   * Withdraw from wallet with security
   */
  async withdrawFromWallet(
    userId: string,
    amount: number,
    bankDetails: {
      accountName: string;
      accountNumber: string;
      bankName: string;
    }
  ): Promise<void> {
    // Security check is REQUIRED for withdrawals
    const settings = await securityService.getSecuritySettings(userId);
    if (settings?.requireAuthForWithdrawal && 
        (settings?.isPinEnabled || settings?.isBiometricEnabled)) {
      throw new Error('AUTH_REQUIRED');
    }

    const wallet = await firebaseService.getWallet(userId);
    
    if (wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    if (amount < 1000) {
      throw new Error('Minimum withdrawal amount is ₦1,000');
    }

    wallet.balance -= amount;
    wallet.transactions.unshift({
      id: Date.now().toString(),
      type: 'debit',
      amount,
      description: `Withdrawal to ${bankDetails.accountName} - ${bankDetails.bankName}`,
      timestamp: Date.now(),
      status: 'completed',
    });

    await firebaseService.updateWallet(wallet);
    await soundManager.play('debit');

    // TODO: Integrate with actual payment provider for bank transfer
    console.log('Withdrawal request:', { amount, bankDetails });
  },

  /**
   * Add money to wallet
   */
  async addMoneyToWallet(
    userId: string, 
    amount: number, 
    reference: string
  ): Promise<void> {
    await firebaseService.addMoneyToWallet(userId, amount, reference);
  },

  /**
   * Credit pending balance (held payment)
   */
  async creditPendingBalance(
    userId: string,
    amount: number,
    options: { description: string }
  ): Promise<void> {
    const wallet = await firebaseService.getWallet(userId);
    
    wallet.pendingBalance += amount;
    wallet.transactions.unshift({
      id: Date.now().toString(),
      type: 'credit',
      amount,
      description: options.description,
      timestamp: Date.now(),
      status: 'pending',
    });

    await firebaseService.updateWallet(wallet);
  },

  /**
   * Release held payment (move from pending to main balance)
   */
  async releaseHeldPayment(
    professionalId: string,
    patientId: string,
    amount: number,
    options: { description: string }
  ): Promise<void> {
    const professionalWallet = await firebaseService.getWallet(professionalId);
    
    professionalWallet.pendingBalance = Math.max(
      0, 
      professionalWallet.pendingBalance - amount
    );
    professionalWallet.balance += amount;
    professionalWallet.transactions.unshift({
      id: Date.now().toString(),
      type: 'credit',
      amount,
      description: options.description,
      timestamp: Date.now(),
      status: 'completed',
    });

    await firebaseService.updateWallet(professionalWallet);
    await soundManager.play('deposit');
  },

  /**
   * Refund held payment (return to patient)
   */
  async refundHeldPayment(
    professionalId: string,
    patientId: string,
    amount: number,
    options: { description: string }
  ): Promise<void> {
    // Remove from professional's pending
    const professionalWallet = await firebaseService.getWallet(professionalId);
    professionalWallet.pendingBalance = Math.max(
      0, 
      professionalWallet.pendingBalance - amount
    );
    professionalWallet.transactions.unshift({
      id: Date.now().toString(),
      type: 'debit',
      amount,
      description: 'Refund: ' + options.description,
      timestamp: Date.now(),
      status: 'completed',
    });
    await firebaseService.updateWallet(professionalWallet);

    // Add back to patient's main balance
    const patientWallet = await firebaseService.getWallet(patientId);
    patientWallet.balance += amount;
    patientWallet.transactions.unshift({
      id: Date.now().toString(),
      type: 'credit',
      amount,
      description: options.description,
      timestamp: Date.now(),
      status: 'completed',
    });
    await firebaseService.updateWallet(patientWallet);
    await soundManager.play('deposit');
  },

  /**
   * Check if authentication is required for a transaction
   */
  async isAuthRequired(
    userId: string,
    transactionType: TransactionType
  ): Promise<boolean> {
    const settings = await securityService.getSecuritySettings(userId);
    
    if (!settings?.isPinEnabled && !settings?.isBiometricEnabled) {
      return false;
    }

    switch (transactionType) {
      case 'withdrawal':
        return settings.requireAuthForWithdrawal;
      case 'booking':
        return settings.requireAuthForBookings;
      case 'purchase':
      case 'transfer':
      case 'wallet_action':
        return settings.requireAuthForTransactions;
      default:
        return true;
    }
  },
};