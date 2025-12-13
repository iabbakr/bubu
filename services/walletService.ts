// services/walletService.ts - NEW FILE FOR WALLET OPERATIONS
import { firebaseService } from './firebaseService';

export const walletService = {
  /**
   * Get wallet for a user
   */
  async getWallet(userId: string) {
    return await firebaseService.getWallet(userId);
  },

  /**
   * Debit wallet (remove money)
   */
  async debitWallet(
    userId: string, 
    amount: number, 
    options: { description: string }
  ): Promise<void> {
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
    
    professionalWallet.pendingBalance = Math.max(0, professionalWallet.pendingBalance - amount);
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
    professionalWallet.pendingBalance = Math.max(0, professionalWallet.pendingBalance - amount);
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
  },
};