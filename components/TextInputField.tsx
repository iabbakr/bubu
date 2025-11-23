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
  rightIcon?: React.ReactNode; // Added for password toggle or other icons
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
      <View style={[styles.inputWrapper, { borderColor: error ? theme.error : theme.border }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundSecondary,
              borderWidth: error ? 2 : 1,
              color: theme.text,
              minHeight: multiline ? 100 : Spacing.inputHeight,
              textAlignVertical: multiline ? "top" : "center",
            }
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
        {rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>}
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
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  iconContainer: {
    paddingHorizontal: Spacing.sm,
  },
});
