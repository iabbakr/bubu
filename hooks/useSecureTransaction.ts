// hooks/useSecureTransaction.ts
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { securityService, TransactionType } from '@/services/securityService';
import { useAuth } from './useAuth';

interface UseSecureTransactionOptions {
  transactionType: TransactionType;
  onSuccess: () => void | Promise<void>;
  onCancel?: () => void;
  skipAuth?: boolean;
}

export function useSecureTransaction() {
  const { user } = useAuth();
  const [showPinAuth, setShowPinAuth] = useState(false);
  const [currentTransaction, setCurrentTransaction] = 
    useState<UseSecureTransactionOptions | null>(null);

  /**
   * Execute a transaction with security check
   */
  const executeTransaction = useCallback(
    async (options: UseSecureTransactionOptions) => {
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Skip auth if explicitly requested
      if (options.skipAuth) {
        await options.onSuccess();
        return;
      }

      try {
        const settings = await securityService.getSecuritySettings(user.uid);
        
        // No security enabled
        if (!settings?.isPinEnabled && !settings?.isBiometricEnabled) {
          await options.onSuccess();
          return;
        }

        // Check if auth is required for this transaction type
        const requiresAuth = await requiresAuthForTransaction(
          settings,
          options.transactionType
        );

        if (!requiresAuth) {
          await options.onSuccess();
          return;
        }

        // Check if account is locked
        const locked = await securityService['isAccountLocked'](user.uid);
        if (locked) {
          const remainingTime = Math.ceil(
            ((settings.lockedUntil || 0) - Date.now()) / 60000
          );
          Alert.alert(
            'Account Locked',
            `Too many failed attempts. Try again in ${remainingTime} minute(s)`,
            [{ text: 'OK', onPress: options.onCancel }]
          );
          return;
        }

        // Try biometric first if enabled
        if (settings.isBiometricEnabled) {
          const { available } = await securityService.isBiometricAvailable();
          if (available) {
            const result = await securityService.authenticateWithBiometric();
            if (result.success) {
              await options.onSuccess();
              return;
            }
            // If biometric fails, fall through to PIN
          }
        }

        // Show PIN input if enabled
        if (settings.isPinEnabled) {
          setCurrentTransaction(options);
          setShowPinAuth(true);
          return;
        }

        // No security enabled, allow transaction
        await options.onSuccess();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Transaction failed');
        options.onCancel?.();
      }
    },
    [user]
  );

  /**
   * Handle successful PIN verification
   */
  const handlePinSuccess = useCallback(async () => {
    setShowPinAuth(false);
    
    if (currentTransaction) {
      try {
        await currentTransaction.onSuccess();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Transaction failed');
      } finally {
        setCurrentTransaction(null);
      }
    }
  }, [currentTransaction]);

  /**
   * Handle PIN cancellation
   */
  const handlePinCancel = useCallback(() => {
    setShowPinAuth(false);
    currentTransaction?.onCancel?.();
    setCurrentTransaction(null);
  }, [currentTransaction]);

  return {
    executeTransaction,
    showPinAuth,
    handlePinSuccess,
    handlePinCancel,
    currentTransaction,
  };
}

/**
 * Helper to check if auth is required
 */
function requiresAuthForTransaction(
  settings: any,
  type: TransactionType
): boolean {
  if (!settings?.isPinEnabled && !settings?.isBiometricEnabled) {
    return false;
  }

  switch (type) {
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
}