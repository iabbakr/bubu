// screens/WithdrawFundsScreen.tsx - EXAMPLE USAGE
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PinAuthModal } from '@/components/PinAuthModal';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useSecureTransaction } from '@/hooks/useSecureTransaction';
import { walletService } from '@/services/walletService';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';

export default function WithdrawFundsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    executeTransaction,
    showPinAuth,
    handlePinSuccess,
    handlePinCancel,
  } = useSecureTransaction();

  const handleWithdraw = async () => {
    if (!user) return;

    // Validate inputs
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 1000) {
      Alert.alert('Error', 'Minimum withdrawal amount is ₦1,000');
      return;
    }

    if (!accountName || !accountNumber || !bankName) {
      Alert.alert('Error', 'Please fill all bank details');
      return;
    }

    // Execute with security check
    executeTransaction({
      transactionType: 'withdrawal',
      onSuccess: async () => {
        setLoading(true);
        try {
          await walletService.withdrawFromWallet(user.uid, withdrawAmount, {
            accountName,
            accountNumber,
            bankName,
          });

          Alert.alert(
            'Success',
            'Withdrawal request submitted successfully',
            [
              {
                text: 'OK',
                onPress: () => {
                  setAmount('');
                  setAccountName('');
                  setAccountNumber('');
                  setBankName('');
                },
              },
            ]
          );
        } catch (error: any) {
          if (error.message === 'AUTH_REQUIRED') {
            // This shouldn't happen as executeTransaction handles it
            return;
          }
          Alert.alert('Error', error.message || 'Withdrawal failed');
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => {
        console.log('Withdrawal cancelled');
      },
    });
  };

  return (
    <>
      <ScreenScrollView>
        <View style={styles.container}>
          {/* Security Notice */}
          <View
            style={[
              styles.securityNotice,
              {
                backgroundColor: theme.primary + '15',
                borderColor: theme.primary + '30',
              },
            ]}
          >
            <Feather name="shield" size={24} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ marginLeft: Spacing.md, flex: 1 }}
            >
              This transaction is secured with PIN/Biometric authentication
            </ThemedText>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
              Withdrawal Amount
            </ThemedText>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText type="h3" style={{ marginRight: Spacing.xs }}>
                ₦
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, fontSize: 24 },
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
            >
              Minimum: ₦1,000
            </ThemedText>
          </View>

          {/* Bank Details */}
          <View style={styles.section}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Bank Details
            </ThemedText>

            <View style={{ marginBottom: Spacing.md }}>
              <ThemedText
                type="caption"
                style={{ marginBottom: Spacing.xs }}
              >
                Account Name
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={accountName}
                onChangeText={setAccountName}
                placeholder="Enter account name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={{ marginBottom: Spacing.md }}>
              <ThemedText
                type="caption"
                style={{ marginBottom: Spacing.xs }}
              >
                Account Number
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Enter account number"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <View>
              <ThemedText
                type="caption"
                style={{ marginBottom: Spacing.xs }}
              >
                Bank Name
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Enter bank name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>

          {/* Withdraw Button */}
          <PrimaryButton
            title={loading ? 'Processing...' : 'Withdraw Funds'}
            onPress={handleWithdraw}
            disabled={loading}
            icon={
              loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Feather name="arrow-right" size={20} color="#fff" />
              )
            }
          />

          {/* Info */}
          <ThemedText
            type="caption"
            style={{
              color: theme.textSecondary,
              textAlign: 'center',
              marginTop: Spacing.lg,
            }}
          >
            Withdrawals are processed within 24 hours
          </ThemedText>
        </View>
      </ScreenScrollView>

      {/* PIN Authentication Modal */}
      {showPinAuth && user && (
        <PinAuthModal
          visible={showPinAuth}
          userId={user.uid}
          title="Confirm Withdrawal"
          description="Enter your PIN to authorize this withdrawal"
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontWeight: '600',
  },
  textInput: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
});