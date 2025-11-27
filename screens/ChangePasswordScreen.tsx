import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { TextInputField } from "../components/TextInputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { auth } from "../lib/firebase";
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from "firebase/auth";
import { Pressable } from "react-native";

export default function ChangePasswordScreen() {
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error("No user logged in");
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert(
        "Success",
        "Your password has been changed successfully",
        [
          {
            text: "OK",
            onPress: () => {
              // Clear fields
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Change password error:", error);
      
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.code === "auth/wrong-password") {
        errorMessage = "Current password is incorrect";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "New password is too weak";
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please log out and log in again before changing your password";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.primary + "10",
              borderColor: theme.primary + "30",
            },
          ]}
        >
          <Feather name="info" size={24} color={theme.primary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText type="label" style={{ color: theme.primary }}>
              Password Requirements
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.text, marginTop: Spacing.xs }}
            >
              Your new password must be at least 6 characters long and different
              from your current password.
            </ThemedText>
          </View>
        </View>

        {/* Current Password */}
        <TextInputField
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter your current password"
          secureTextEntry={!showCurrent}
          rightIcon={
            <Pressable onPress={() => setShowCurrent(!showCurrent)}>
              <Feather
                name={showCurrent ? "eye-off" : "eye"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          }
        />

        {/* New Password */}
        <TextInputField
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter your new password"
          secureTextEntry={!showNew}
          rightIcon={
            <Pressable onPress={() => setShowNew(!showNew)}>
              <Feather
                name={showNew ? "eye-off" : "eye"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          }
        />

        {/* Confirm New Password */}
        <TextInputField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your new password"
          secureTextEntry={!showConfirm}
          rightIcon={
            <Pressable onPress={() => setShowConfirm(!showConfirm)}>
              <Feather
                name={showConfirm ? "eye-off" : "eye"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          }
        />

        {/* Password Strength Indicator */}
        {newPassword.length > 0 && (
          <View style={styles.strengthContainer}>
            <View
              style={[
                styles.strengthBar,
                {
                  width:
                    newPassword.length < 6
                      ? "33%"
                      : newPassword.length < 10
                      ? "66%"
                      : "100%",
                  backgroundColor:
                    newPassword.length < 6
                      ? "#ef4444"
                      : newPassword.length < 10
                      ? "#f59e0b"
                      : "#10b981",
                },
              ]}
            />
            <ThemedText
              type="caption"
              style={{
                color: theme.textSecondary,
                marginTop: Spacing.xs,
              }}
            >
              Password strength:{" "}
              {newPassword.length < 6
                ? "Weak"
                : newPassword.length < 10
                ? "Medium"
                : "Strong"}
            </ThemedText>
          </View>
        )}

        {/* Change Password Button */}
        <PrimaryButton
          title="Change Password"
          onPress={handleChangePassword}
          loading={loading}
          style={{ marginTop: Spacing.lg }}
        />

        {/* Security Tips */}
        <View
          style={[
            styles.tipsCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Security Tips
          </ThemedText>

          <View style={styles.tipRow}>
            <Feather name="check-circle" size={16} color="#10b981" />
            <ThemedText
              type="caption"
              style={{ marginLeft: Spacing.sm, flex: 1 }}
            >
              Use a unique password that you don't use elsewhere
            </ThemedText>
          </View>

          <View style={styles.tipRow}>
            <Feather name="check-circle" size={16} color="#10b981" />
            <ThemedText
              type="caption"
              style={{ marginLeft: Spacing.sm, flex: 1 }}
            >
              Mix uppercase, lowercase, numbers, and symbols
            </ThemedText>
          </View>

          <View style={styles.tipRow}>
            <Feather name="check-circle" size={16} color="#10b981" />
            <ThemedText
              type="caption"
              style={{ marginLeft: Spacing.sm, flex: 1 }}
            >
              Avoid using personal information
            </ThemedText>
          </View>

          <View style={styles.tipRow}>
            <Feather name="check-circle" size={16} color="#10b981" />
            <ThemedText
              type="caption"
              style={{ marginLeft: Spacing.sm, flex: 1 }}
            >
              Change your password regularly
            </ThemedText>
          </View>
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  strengthContainer: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  tipsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
});