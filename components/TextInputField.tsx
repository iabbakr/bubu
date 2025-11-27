// components/TextInputField.tsx

import { TextInput, View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import React from "react";

interface TextInputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  rightIcon?: React.ReactNode;
}

export function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  keyboardType = "default",
  multiline = false,
  autoCapitalize = "none",
  rightIcon,
}: TextInputFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText type="label" style={[styles.label, { color: theme.text }]}>
          {label}
        </ThemedText>
      )}

      <View style={[
        styles.inputWrapper,
        {
          borderColor: error ? theme.error : theme.border,
          borderWidth: error ? 2 : 1,
          backgroundColor: theme.backgroundSecondary,
        }
      ]}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              paddingRight: rightIcon ? 50 : Spacing.md, // Make space for icon
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
        />

        {/* Right Icon (Eye) - Positioned Absolutely Inside */}
        {rightIcon && (
          <View style={styles.rightIconContainer}>
            {rightIcon}
          </View>
        )}
      </View>

      {error && (
        <ThemedText type="caption" style={{ color: theme.error, marginTop: Spacing.xs }}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
  },
  inputWrapper: {
    position: "relative",
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    minHeight: Spacing.inputHeight,
  },
  rightIconContainer: {
    position: "absolute",
    right: Spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    zIndex: 10,
  },
});