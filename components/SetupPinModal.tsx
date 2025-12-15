// components/SetupPinModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { securityService } from '@/services/securityService';
import { Spacing, BorderRadius } from '@/constants/theme';

interface SetupPinModalProps {
  visible: boolean;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
  isChanging?: boolean;
}

export function SetupPinModal({
  visible,
  userId,
  onSuccess,
  onCancel,
  isChanging = false,
}: SetupPinModalProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnimation = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      reset();
    }
  }, [visible]);

  useEffect(() => {
    if (step === 'enter' && pin.length === 6) {
      setStep('confirm');
    }
  }, [pin]);

  useEffect(() => {
    if (step === 'confirm' && confirmPin.length === 6) {
      handleSetup();
    }
  }, [confirmPin]);

  const reset = () => {
    setStep('enter');
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const handleSetup = async () => {
    if (pin !== confirmPin) {
      handleError('PINs do not match');
      setConfirmPin('');
      return;
    }

    try {
      const success = await securityService.setupPin(userId, pin);
      if (success) {
        onSuccess();
        reset();
      } else {
        handleError('Failed to set up PIN');
      }
    } catch (error: any) {
      handleError(error.message || 'Setup failed');
    }
  };

  const handleError = (message: string) => {
    setError(message);
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
    const currentPin = step === 'enter' ? pin : confirmPin;
    
    if (currentPin.length < 6) {
      if (step === 'enter') {
        setPin(currentPin + digit);
      } else {
        setConfirmPin(currentPin + digit);
      }
      setError('');
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    setError('');
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('enter');
      setConfirmPin('');
      setError('');
    }
  };

  const currentPin = step === 'enter' ? pin : confirmPin;

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
                i < currentPin.length ? theme.primary : 'transparent',
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

      {/* Empty space */}
      <View style={styles.key} />

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
            {step === 'confirm' && (
              <Pressable
                style={styles.backButton}
                onPress={handleBack}
              >
                <Feather name="arrow-left" size={24} color={theme.text} />
              </Pressable>
            )}
            
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText type="h2">
                {step === 'enter'
                  ? isChanging
                    ? 'Enter New PIN'
                    : 'Create PIN'
                  : 'Confirm PIN'}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
              >
                {step === 'enter'
                  ? 'Enter a 4-6 digit PIN'
                  : 'Re-enter your PIN to confirm'}
              </ThemedText>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.sm,
    position: 'absolute',
    left: 0,
    zIndex: 1,
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