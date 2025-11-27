import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { TextInputField } from "../components/TextInputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { auth, db } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // First, check if user exists in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // User not found in our database
        Alert.alert(
          "Email Not Found",
          "This email is not registered with Bubu. Please check your email or sign up for a new account.",
          [{ text: "OK" }]
        );
        setLoading(false);
        return;
      }

      // User exists, proceed with password reset
      await sendPasswordResetEmail(auth, email.trim());
      
      setEmailSent(true);
      
      Alert.alert(
        "Email Sent",
        "Password reset instructions have been sent to your email address. Please check your inbox and spam folder.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      let errorMessage = "Failed to send reset email. Please try again.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many attempts. Please try again later";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <ScreenScrollView>
        <View style={styles.container}>
          <View style={styles.successContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#10b981" + "20" },
              ]}
            >
              <Feather name="check-circle" size={64} color="#10b981" />
            </View>

            <ThemedText
              type="h2"
              style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}
            >
              Check Your Email
            </ThemedText>

            <ThemedText
              type="caption"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginBottom: Spacing.xl,
              }}
            >
              We've sent password reset instructions to{"\n"}
              <ThemedText style={{ fontWeight: "600" }}>{email}</ThemedText>
            </ThemedText>

            <View
              style={[
                styles.instructionsCard,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                },
              ]}
            >
              <ThemedText type="label" style={{ marginBottom: Spacing.md }}>
                Next Steps:
              </ThemedText>

              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepNumber,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    1
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={{ flex: 1 }}>
                  Check your email inbox and spam folder
                </ThemedText>
              </View>

              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepNumber,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    2
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={{ flex: 1 }}>
                  Click the reset password link in the email
                </ThemedText>
              </View>

              <View style={styles.stepRow}>
                <View
                  style={[
                    styles.stepNumber,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: theme.primary, fontWeight: "700" }}
                  >
                    3
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={{ flex: 1 }}>
                  Create a new password for your account
                </ThemedText>
              </View>
            </View>

            <PrimaryButton
              title="Back to Login"
              onPress={() => navigation.goBack()}
              style={{ marginTop: Spacing.xl }}
            />

            <PrimaryButton
              title="Resend Email"
              onPress={() => {
                setEmailSent(false);
                handleResetPassword();
              }}
              variant="outlined"
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.primary + "20" },
            ]}
          >
            <Feather name="lock" size={48} color={theme.primary} />
          </View>

          <ThemedText
            type="h2"
            style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}
          >
            Forgot Password?
          </ThemedText>

          <ThemedText
            type="caption"
            style={{
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: Spacing.xl,
            }}
          >
            No worries! Enter your email address and we'll send you instructions
            to reset your password.
          </ThemedText>
        </View>

        {/* Email Input */}
        <TextInputField
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Feather name="mail" size={20} color={theme.textSecondary} />}
        />

        {/* Reset Button */}
        <View style={styles.btncol}>
        <PrimaryButton
          title="Send Reset Link"
          onPress={handleResetPassword}
          loading={loading}
          style={{ marginTop: Spacing.lg,  }}
        />

        {/* Back to Login */}
        <PrimaryButton
          title="Back to Login"
          onPress={() => navigation.goBack()}
          variant="outlined"
          style={{ marginTop: Spacing.lg}}
        />

        </View>

        {/* Info Card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="info" size={20} color={theme.primary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText type="label" style={{ marginBottom: Spacing.xs }}>
              Having trouble?
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              If you don't receive the email within a few minutes, check your
              spam folder or contact our support team.
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
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  btncol:{
    flexDirection: "column",
    gap: 10,
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
  },
  successContainer: {
    alignItems: "center",
  },
  instructionsCard: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
});