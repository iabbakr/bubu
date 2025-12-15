// screens/SecuritySettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenScrollView } from '@/components/ScreenScrollView';
import { ThemedText } from '@/components/ThemedText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { securityService, SecuritySettings } from '@/services/securityService';
import { SetupPinModal } from '@/components/SetupPinModal';
import { PinAuthModal } from '@/components/PinAuthModal';
import { Spacing, BorderRadius } from '@/constants/theme';

export default function SecuritySettingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [biometricType, setBiometricType] = useState<string>('');
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [showVerifyPin, setShowVerifyPin] = useState(false);
  const [pendingAction, setPendingAction] = useState<'changePin' | 'disablePin' | null>(null);

  useEffect(() => {
    loadSettings();
    checkBiometricSupport();
  }, []);

  const loadSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const data = await securityService.getSecuritySettings(user.uid);
      setSettings(data);
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometricSupport = async () => {
    const { available, type } = await securityService.isBiometricAvailable();
    if (available) {
      const typeNames = {
        fingerprint: 'Fingerprint',
        face: 'Face ID',
        iris: 'Iris',
        none: 'None',
      };
      setBiometricType(typeNames[type]);
    }
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (!user) return;

    try {
      if (enabled) {
        const success = await securityService.enableBiometric(user.uid);
        if (success) {
          Alert.alert('Success', 'Biometric authentication enabled');
          loadSettings();
        } else {
          Alert.alert('Failed', 'Could not enable biometric authentication');
        }
      } else {
        await securityService.disableBiometric(user.uid);
        Alert.alert('Success', 'Biometric authentication disabled');
        loadSettings();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSetupPin = () => {
    if (!settings?.isPinEnabled) {
      setShowSetupPin(true);
    } else {
      // PIN already set, ask if they want to change it
      Alert.alert(
        'Change PIN',
        'Would you like to change your PIN or disable it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change PIN',
            onPress: () => {
              setPendingAction('changePin');
              setShowVerifyPin(true);
            },
          },
          {
            text: 'Disable PIN',
            style: 'destructive',
            onPress: () => {
              setPendingAction('disablePin');
              setShowVerifyPin(true);
            },
          },
        ]
      );
    }
  };

  const handlePinSetupSuccess = async () => {
    setShowSetupPin(false);
    Alert.alert('Success', 'PIN has been set successfully');
    await loadSettings();
  };

  const handlePinVerifySuccess = () => {
    setShowVerifyPin(false);
    
    if (pendingAction === 'changePin') {
      setShowSetupPin(true);
    } else if (pendingAction === 'disablePin') {
      handleDisablePin();
    }
    
    setPendingAction(null);
  };

  const handleDisablePin = async () => {
    if (!user) return;

    try {
      await securityService.disablePin(user.uid, '');
      Alert.alert('Success', 'PIN has been disabled');
      await loadSettings();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleRequirement = async (
    key: keyof SecuritySettings,
    value: boolean
  ) => {
    if (!user || !settings) return;

    try {
      const newSettings = { ...settings, [key]: value };
      await securityService['saveSecuritySettings'](user.uid, newSettings);
      setSettings(newSettings);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const renderSettingRow = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    disabled?: boolean
  ) => (
    <View
      style={[
        styles.settingRow,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIcon,
            { backgroundColor: theme.primary + '20' },
          ]}
        >
          <Feather name={icon as any} size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ marginBottom: 4 }}>{title}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {subtitle}
          </ThemedText>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary + '80' }}
        thumbColor={value ? theme.primary : theme.textSecondary}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!settings || !user) return null;

  return (
    <>
      <ScreenScrollView>
        <View style={styles.container}>
          {/* Info Banner */}
          <View
            style={[
              styles.infoBanner,
              { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
            ]}
          >
            <Feather name="shield" size={24} color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ marginLeft: Spacing.md, flex: 1 }}
            >
              Secure your wallet and transactions with PIN or biometric
              authentication
            </ThemedText>
          </View>

          {/* Authentication Methods */}
          <View style={styles.section}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
              Authentication Methods
            </ThemedText>

            {/* PIN Setup */}
            <Pressable
              style={[
                styles.methodCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: settings.isPinEnabled
                    ? theme.primary
                    : theme.border,
                  borderWidth: settings.isPinEnabled ? 2 : 1,
                },
              ]}
              onPress={handleSetupPin}
            >
              <View style={styles.methodLeft}>
                <View
                  style={[
                    styles.methodIcon,
                    {
                      backgroundColor: settings.isPinEnabled
                        ? theme.primary
                        : theme.primary + '20',
                    },
                  ]}
                >
                  <Feather
                    name="lock"
                    size={24}
                    color={
                      settings.isPinEnabled ? '#fff' : theme.primary
                    }
                  />
                </View>
                <View>
                  <ThemedText type="h4">PIN Code</ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 4 }}
                  >
                    {settings.isPinEnabled
                      ? 'PIN is active'
                      : 'Set up a 4-6 digit PIN'}
                  </ThemedText>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>

            {/* Biometric */}
            {biometricType && (
              <View
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: settings.isBiometricEnabled
                      ? theme.primary
                      : theme.border,
                    borderWidth: settings.isBiometricEnabled ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.methodLeft}>
                  <View
                    style={[
                      styles.methodIcon,
                      {
                        backgroundColor: settings.isBiometricEnabled
                          ? theme.primary
                          : theme.primary + '20',
                      },
                    ]}
                  >
                    <Feather
                      name="smartphone"
                      size={24}
                      color={
                        settings.isBiometricEnabled ? '#fff' : theme.primary
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="h4">{biometricType}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary, marginTop: 4 }}
                    >
                      {settings.isBiometricEnabled
                        ? 'Biometric is active'
                        : 'Enable biometric authentication'}
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={settings.isBiometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: theme.border, true: theme.primary + '80' }}
                  thumbColor={
                    settings.isBiometricEnabled ? theme.primary : theme.textSecondary
                  }
                />
              </View>
            )}
          </View>

          {/* Security Requirements */}
          <View style={styles.section}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
              Require Authentication For
            </ThemedText>

            {renderSettingRow(
              'credit-card',
              'Wallet Withdrawals',
              'Require PIN when withdrawing funds',
              settings.requireAuthForWithdrawal,
              (value) =>
                handleToggleRequirement('requireAuthForWithdrawal', value),
              !settings.isPinEnabled && !settings.isBiometricEnabled
            )}

            {renderSettingRow(
              'calendar',
              'Professional Bookings',
              'Require PIN when booking consultations',
              settings.requireAuthForBookings,
              (value) =>
                handleToggleRequirement('requireAuthForBookings', value),
              !settings.isPinEnabled && !settings.isBiometricEnabled
            )}

            {renderSettingRow(
              'shopping-bag',
              'All Transactions',
              'Require PIN for all wallet transactions',
              settings.requireAuthForTransactions,
              (value) =>
                handleToggleRequirement('requireAuthForTransactions', value),
              !settings.isPinEnabled && !settings.isBiometricEnabled
            )}
          </View>

          {/* Account Status */}
          {settings.lockedUntil && Date.now() < settings.lockedUntil && (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: '#ff4444' + '15', borderColor: '#ff4444' + '30' },
              ]}
            >
              <Feather name="alert-triangle" size={24} color="#ff4444" />
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <ThemedText type="h4" style={{ color: '#ff4444' }}>
                  Account Locked
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: '#ff4444', marginTop: 4 }}
                >
                  Too many failed attempts. Try again in{' '}
                  {Math.ceil((settings.lockedUntil - Date.now()) / 60000)}{' '}
                  minute(s)
                </ThemedText>
              </View>
            </View>
          )}

          {/* Info Text */}
          <ThemedText
            type="caption"
            style={{
              color: theme.textSecondary,
              textAlign: 'center',
              marginTop: Spacing.xl,
            }}
          >
            Your PIN is encrypted and stored securely on your device. We cannot
            recover it if you forget it.
          </ThemedText>
        </View>
      </ScreenScrollView>

      {/* Setup PIN Modal */}
      {showSetupPin && (
        <SetupPinModal
          visible={showSetupPin}
          userId={user.uid}
          onSuccess={handlePinSetupSuccess}
          onCancel={() => setShowSetupPin(false)}
          isChanging={settings.isPinEnabled}
        />
      )}

      {/* Verify PIN Modal */}
      {showVerifyPin && (
        <PinAuthModal
          visible={showVerifyPin}
          userId={user.uid}
          title="Verify PIN"
          description="Enter your current PIN"
          onSuccess={handlePinVerifySuccess}
          onCancel={() => {
            setShowVerifyPin(false);
            setPendingAction(null);
          }}
          allowBiometric={false}
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
  infoBanner: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  warningBanner: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
});