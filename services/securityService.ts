// services/securityService.ts
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import CryptoJS from 'crypto-js';

const SECURITY_KEY = 'user_security_settings';
const PIN_KEY = 'encrypted_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const MAX_PIN_ATTEMPTS = 3;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

export interface SecuritySettings {
  isPinEnabled: boolean;
  isBiometricEnabled: boolean;
  requireAuthForTransactions: boolean;
  requireAuthForWithdrawal: boolean;
  requireAuthForBookings: boolean;
  pinAttempts: number;
  lockedUntil?: number;
}

export type TransactionType = 
  | 'withdrawal' 
  | 'booking' 
  | 'purchase' 
  | 'transfer'
  | 'wallet_action';

class SecurityService {
  private static instance: SecurityService;
  private currentUserId: string | null = null;

  private constructor() {}

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Initialize security for a user
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    // Check if user has security settings
    const settings = await this.getSecuritySettings(userId);
    if (!settings) {
      // Create default settings
      await this.saveSecuritySettings(userId, {
        isPinEnabled: false,
        isBiometricEnabled: false,
        requireAuthForTransactions: true,
        requireAuthForWithdrawal: true,
        requireAuthForBookings: true,
        pinAttempts: 0,
      });
    }
  }

  /**
   * Check if device supports biometric authentication
   */
  async isBiometricAvailable(): Promise<{
    available: boolean;
    type: 'fingerprint' | 'face' | 'iris' | 'none';
  }> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!compatible || !enrolled) {
        return { available: false, type: 'none' };
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      let type: 'fingerprint' | 'face' | 'iris' | 'none' = 'none';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        type = 'face';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        type = 'fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        type = 'iris';
      }

      return { available: true, type };
    } catch (error) {
      console.error('Biometric check error:', error);
      return { available: false, type: 'none' };
    }
  }

  /**
   * Set up PIN
   */
  async setupPin(userId: string, pin: string): Promise<boolean> {
    try {
      if (!this.validatePin(pin)) {
        throw new Error('PIN must be 4-6 digits');
      }

      // Encrypt PIN before storing
      const encryptedPin = this.encryptPin(pin, userId);
      await SecureStore.setItemAsync(
        `${PIN_KEY}_${userId}`, 
        encryptedPin
      );

      // Update settings
      const settings = await this.getSecuritySettings(userId);
      await this.saveSecuritySettings(userId, {
        ...settings!,
        isPinEnabled: true,
        pinAttempts: 0,
      });

      return true;
    } catch (error) {
      console.error('Setup PIN error:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(userId: string): Promise<boolean> {
    try {
      const { available } = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      // Test authentication first
      const result = await this.authenticateWithBiometric();
      if (!result.success) {
        return false;
      }

      // Update settings
      const settings = await this.getSecuritySettings(userId);
      await this.saveSecuritySettings(userId, {
        ...settings!,
        isBiometricEnabled: true,
      });

      await SecureStore.setItemAsync(
        `${BIOMETRIC_ENABLED_KEY}_${userId}`,
        'true'
      );

      return true;
    } catch (error) {
      console.error('Enable biometric error:', error);
      return false;
    }
  }

  /**
   * Verify PIN
   */
  async verifyPin(userId: string, pin: string): Promise<boolean> {
    try {
      // Check if account is locked
      const locked = await this.isAccountLocked(userId);
      if (locked) {
        const settings = await this.getSecuritySettings(userId);
        const remainingTime = Math.ceil(
          ((settings?.lockedUntil || 0) - Date.now()) / 60000
        );
        throw new Error(
          `Account locked. Try again in ${remainingTime} minute(s)`
        );
      }

      const storedPin = await SecureStore.getItemAsync(`${PIN_KEY}_${userId}`);
      if (!storedPin) {
        return false;
      }

      const decryptedPin = this.decryptPin(storedPin, userId);
      const isValid = decryptedPin === pin;

      const settings = await this.getSecuritySettings(userId);
      
      if (isValid) {
        // Reset attempts on success
        await this.saveSecuritySettings(userId, {
          ...settings!,
          pinAttempts: 0,
          lockedUntil: undefined,
        });
        return true;
      } else {
        // Increment failed attempts
        const newAttempts = (settings?.pinAttempts || 0) + 1;
        
        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          // Lock account
          await this.saveSecuritySettings(userId, {
            ...settings!,
            pinAttempts: newAttempts,
            lockedUntil: Date.now() + LOCKOUT_DURATION,
          });
          
          throw new Error(
            `Too many failed attempts. Account locked for 5 minutes.`
          );
        } else {
          await this.saveSecuritySettings(userId, {
            ...settings!,
            pinAttempts: newAttempts,
          });
          
          throw new Error(
            `Incorrect PIN. ${MAX_PIN_ATTEMPTS - newAttempts} attempt(s) remaining`
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error || 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      return { 
        success: false, 
        error: 'Biometric authentication failed' 
      };
    }
  }

  /**
   * Request authentication for transaction
   */
  async requestAuthentication(
    userId: string,
    transactionType: TransactionType,
    onSuccess: () => void,
    onCancel?: () => void
  ): Promise<void> {
    const settings = await this.getSecuritySettings(userId);
    
    if (!settings) {
      onSuccess();
      return;
    }

    // Check if auth is required for this transaction type
    const requiresAuth = this.requiresAuthForTransaction(
      settings, 
      transactionType
    );

    if (!requiresAuth) {
      onSuccess();
      return;
    }

    // Check if account is locked
    const locked = await this.isAccountLocked(userId);
    if (locked) {
      const remainingTime = Math.ceil(
        ((settings.lockedUntil || 0) - Date.now()) / 60000
      );
      Alert.alert(
        'Account Locked',
        `Too many failed attempts. Try again in ${remainingTime} minute(s)`,
        [{ text: 'OK', onPress: onCancel }]
      );
      return;
    }

    // Try biometric first if enabled
    if (settings.isBiometricEnabled) {
      const { available } = await this.isBiometricAvailable();
      if (available) {
        const result = await this.authenticateWithBiometric();
        if (result.success) {
          onSuccess();
          return;
        }
        // Fall through to PIN if biometric fails
      }
    }

    // Show PIN input if enabled
    if (settings.isPinEnabled) {
      // This will be handled by PinAuthModal component
      return;
    }

    // No security enabled, allow transaction
    onSuccess();
  }

  /**
   * Change PIN
   */
  async changePin(
    userId: string, 
    oldPin: string, 
    newPin: string
  ): Promise<boolean> {
    try {
      // Verify old PIN first
      const isValid = await this.verifyPin(userId, oldPin);
      if (!isValid) {
        throw new Error('Current PIN is incorrect');
      }

      // Set new PIN
      return await this.setupPin(userId, newPin);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Disable PIN
   */
  async disablePin(userId: string, pin: string): Promise<boolean> {
    try {
      const isValid = await this.verifyPin(userId, pin);
      if (!isValid) {
        return false;
      }

      await SecureStore.deleteItemAsync(`${PIN_KEY}_${userId}`);
      
      const settings = await this.getSecuritySettings(userId);
      await this.saveSecuritySettings(userId, {
        ...settings!,
        isPinEnabled: false,
        pinAttempts: 0,
        lockedUntil: undefined,
      });

      return true;
    } catch (error) {
      console.error('Disable PIN error:', error);
      return false;
    }
  }

  /**
   * Disable biometric
   */
  async disableBiometric(userId: string): Promise<void> {
    await SecureStore.deleteItemAsync(`${BIOMETRIC_ENABLED_KEY}_${userId}`);
    
    const settings = await this.getSecuritySettings(userId);
    await this.saveSecuritySettings(userId, {
      ...settings!,
      isBiometricEnabled: false,
    });
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(
    userId: string
  ): Promise<SecuritySettings | null> {
    try {
      const data = await SecureStore.getItemAsync(
        `${SECURITY_KEY}_${userId}`
      );
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Get security settings error:', error);
      return null;
    }
  }

  /**
   * Save security settings
   */
  private async saveSecuritySettings(
    userId: string,
    settings: SecuritySettings
  ): Promise<void> {
    await SecureStore.setItemAsync(
      `${SECURITY_KEY}_${userId}`,
      JSON.stringify(settings)
    );
  }

  /**
   * Check if account is locked
   */
  private async isAccountLocked(userId: string): Promise<boolean> {
    const settings = await this.getSecuritySettings(userId);
    if (!settings?.lockedUntil) return false;
    
    if (Date.now() < settings.lockedUntil) {
      return true;
    }
    
    // Unlock if time has passed
    await this.saveSecuritySettings(userId, {
      ...settings,
      pinAttempts: 0,
      lockedUntil: undefined,
    });
    
    return false;
  }

  /**
   * Check if auth is required for transaction type
   */
  private requiresAuthForTransaction(
    settings: SecuritySettings,
    type: TransactionType
  ): boolean {
    if (!settings.isPinEnabled && !settings.isBiometricEnabled) {
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

  /**
   * Validate PIN format
   */
  private validatePin(pin: string): boolean {
    return /^\d{4,6}$/.test(pin);
  }

  /**
   * Encrypt PIN
   */
  private encryptPin(pin: string, userId: string): string {
    return CryptoJS.AES.encrypt(pin, userId).toString();
  }

  /**
   * Decrypt PIN
   */
  private decryptPin(encryptedPin: string, userId: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedPin, userId);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Reset security (for testing/emergency)
   */
  async resetSecurity(userId: string): Promise<void> {
    await SecureStore.deleteItemAsync(`${PIN_KEY}_${userId}`);
    await SecureStore.deleteItemAsync(`${BIOMETRIC_ENABLED_KEY}_${userId}`);
    await SecureStore.deleteItemAsync(`${SECURITY_KEY}_${userId}`);
  }
}

export const securityService = SecurityService.getInstance();