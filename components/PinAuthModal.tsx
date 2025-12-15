// components/PinAuthModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { securityService } from '@/services/securityService';
import { Spacing, BorderRadius } from '@/constants/theme';

interface PinAuthModalProps {
  visible: boolean;
  userId: string;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel: () => void;
  allowBiometric?: boolean;
}

export function PinAuthModal({
  visible,
  userId,
  title = 'Enter PIN',
  description = 'Enter your PIN to continue',
  onSuccess,
  onCancel,
  allowBiometric = true,
}: PinAuthModalProps) {
  const { theme } = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
      // Try biometric first if enabled
      if (allowBiometric) {
        tryBiometric();
      }
    }
  }, [visible]);

  useEffect(() => {
    if (pin.length === 6) {
      handleVerify();
    }
  }, [pin]);

  const tryBiometric = async () => {
    try {
      const settings = await securityService.getSecuritySettings(userId);
      if (!settings?.isBiometricEnabled) return;

      const result = await securityService.authenticateWithBiometric();
      if (result.success) {
        onSuccess();
      }
    } catch (error) {
      console.error('Biometric auth failed:', error);
    }
  };

  const handleVerify = async () => {
    if (pin.length < 4) return;

    setLoading(true);
    setError('');

    try {
      const isValid = await securityService.verifyPin(userId, pin);
      
      if (isValid) {
        onSuccess();
      } else {
        handleError('Incorrect PIN');
      }
    } catch (error: any) {
      handleError(error.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (message: string) => {
    setError(message);
    setPin('');
    shake();
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const renderPinDots = () => (
    <Animated.View
      style={[
        styles.pinDotsContainer,
        { transform: [{ translateX: shakeAnimation }] },
      ]}
    >
      {[...Array(6)].map((_, i) => (
        <View
          key={i}
          style={[
            styles.pinDot,
            {
              backgroundColor:
                i < pin.length ? theme.primary : 'transparent',
              borderColor: error ? '#ff4444' : theme.border,
            },
          ]}
        />
      ))}
    </Animated.View>
  );

  const renderKeypad = () => (
    <View style={styles.keypad}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <Pressable
          key={num}
          style={({ pressed }) => [
            styles.key,
            {
              backgroundColor: pressed
                ? theme.primary + '20'
                : theme.backgroundSecondary,
            },
          ]}
          onPress={() => handleKeyPress(num.toString())}
        >
          <ThemedText type="h2">{num}</ThemedText>
        </Pressable>
      ))}

      {/* Biometric button */}
      <Pressable
        style={({ pressed }) => [
          styles.key,
          {
            backgroundColor: pressed
              ? theme.primary + '20'
              : theme.backgroundSecondary,
          },
        ]}
        onPress={tryBiometric}
      >
        <Feather name="smartphone" size={24} color={theme.primary} />
      </Pressable>

      {/* Zero */}
      <Pressable
        style={({ pressed }) => [
          styles.key,
          {
            backgroundColor: pressed
              ? theme.primary + '20'
              : theme.backgroundSecondary,
          },
        ]}
        onPress={() => handleKeyPress('0')}
      >
        <ThemedText type="h2">0</ThemedText>
      </Pressable>

      {/* Backspace */}
      <Pressable
        style={({ pressed }) => [
          styles.key,
          {
            backgroundColor: pressed
              ? theme.primary + '20'
              : theme.backgroundSecondary,
          },
        ]}
        onPress={handleBackspace}
      >
        <Feather name="delete" size={24} color={theme.text} />
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        
        <View
          style={[
            styles.container,
            { backgroundColor: theme.background },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="h2">{title}</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
            >
              {description}
            </ThemedText>
          </View>

          {/* PIN Dots */}
          {renderPinDots()}

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#ff4444" />
              <ThemedText
                style={{ color: '#ff4444', marginLeft: Spacing.xs }}
              >
                {error}
              </ThemedText>
            </View>
          ) : null}

          {/* Keypad */}
          {renderKeypad()}

          {/* Cancel Button */}
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <ThemedText style={{ color: theme.primary }}>
              Cancel
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xl + 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  key: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});