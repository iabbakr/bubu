import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { TextInputField } from "../components/TextInputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenKeyboardAwareScrollView } from "../components/ScreenKeyboardAwareScrollView";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { LocationSelector } from "../components/LocationSelector";
import { Location } from "../types/location";

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller" | "admin">("buyer");
  const [referralCode, setReferralCode] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sellerCategory, setSellerCategory] = useState<"supermarket" | "pharmacy">("supermarket");
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    // Validation
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (isSignUp) {
      if (!name) {
        setError("Full name is required");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (!termsAccepted) {
        setError("Please accept the terms and privacy policy");
        return;
      }
      if (!location) {
        setError("Please select your location");
        return;
      }
      if (selectedRole === "seller" && !sellerCategory) {
        setError("Please select your seller category");
        return;
      }
    }

    setLoading(true);
    try {
      let success = false;
      if (isSignUp) {
        success = await signUp(
          email.trim(),
          password,
          selectedRole,
          name.trim(),
          phone.trim() || undefined,
          gender,
          referralCode.trim() || undefined,
          location || undefined,
          selectedRole === "seller" ? sellerCategory : undefined
        );
      } else {
        success = await signIn(email.trim(), password);
      }

      if (!success) {
        setError(isSignUp ? "Failed to create account" : "Invalid credentials");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err?.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderRoleButton = (role: typeof selectedRole, label: string, icon: string) => (
    <Pressable
      style={[
        styles.roleButton,
        {
          backgroundColor: selectedRole === role ? theme.primary : theme.backgroundSecondary,
          borderColor: selectedRole === role ? theme.primary : theme.border,
        }
      ]}
      onPress={() => setSelectedRole(role)}
    >
      <Feather
        name={icon as any}
        size={24}
        color={selectedRole === role ? theme.buttonText : theme.textSecondary}
      />
      <ThemedText
        style={{
          marginTop: Spacing.xs,
          color: selectedRole === role ? theme.buttonText : theme.textSecondary,
          fontSize: 12,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  const renderGenderButton = (genderOption: typeof gender, label: string) => (
    <Pressable
      key={genderOption}
      onPress={() => setGender(genderOption)}
      style={[
        styles.genderButton,
        {
          borderColor: gender === genderOption ? theme.primary : theme.border,
          backgroundColor: gender === genderOption ? theme.primary + "20" : "transparent",
        }
      ]}
    >
      <Text style={{
        color: gender === genderOption ? theme.primary : theme.textSecondary,
        textTransform: "capitalize",
      }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="shopping-bag" size={64} color={theme.primary} />
          <ThemedText type="h1" style={{ marginTop: Spacing.lg }}>
            MarketHub
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            Your one-stop marketplace
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <ThemedText type="h2" style={{ marginBottom: Spacing.xl }}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </ThemedText>

          {isSignUp && (
            <>
              <TextInputField
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
              />
              <TextInputField
                label="Phone Number (Optional)"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
              <ThemedText type="label" style={{ marginBottom: Spacing.sm }}>GENDER</ThemedText>
              <View style={styles.genderContainer}>
                {renderGenderButton("male", "Male")}
                {renderGenderButton("female", "Female")}
                {renderGenderButton("other", "Other")}
              </View>

              <ThemedText type="label" style={{ marginBottom: Spacing.sm, marginTop: Spacing.md }}>
                SELECT YOUR ROLE
              </ThemedText>
              <View style={styles.roleContainer}>
                {renderRoleButton("buyer", "Buyer", "shopping-cart")}
                {renderRoleButton("seller", "Seller", "briefcase")}
                {renderRoleButton("admin", "Admin", "shield")}
              </View>

              {/* Seller Category */}
              {selectedRole === "seller" && (
                <View style={{ marginBottom: Spacing.md }}>
                  <ThemedText type="label" style={{ marginBottom: 5 }}>Seller Category</ThemedText>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => setSellerCategory("supermarket")}
                      style={[
                        styles.catBtn,
                        sellerCategory === "supermarket" && { backgroundColor: theme.primary + "20", borderColor: theme.primary },
                      ]}
                    >
                      <ThemedText>Supermarket</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setSellerCategory("pharmacy")}
                      style={[
                        styles.catBtn,
                        sellerCategory === "pharmacy" && { backgroundColor: theme.primary + "20", borderColor: theme.primary },
                      ]}
                    >
                      <ThemedText>Pharmacy</ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}

              <TextInputField
                label="Referral Code (Optional)"
                value={referralCode}
                onChangeText={setReferralCode}
                placeholder="Enter referral code"
              />

              <LocationSelector
                value={location}
                onChange={setLocation}
                label="Location (State & City)"
              />
            </>
          )}

          <TextInputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry={!showPassword}
            rightIcon={
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            }
          />
          {isSignUp && (
            <TextInputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              secureTextEntry={!showConfirm}
              rightIcon={
                <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                  <Feather name={showConfirm ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
                </Pressable>
              }
            />
          )}

          {isSignUp && (
            <Pressable
              onPress={() => setTermsAccepted(!termsAccepted)}
              style={styles.termsContainer}
            >
              <View style={[styles.checkbox, { borderColor: theme.border }]}>
                {termsAccepted && <Feather name="check" size={16} color={theme.primary} />}
              </View>
              <Text style={{ color: theme.text, flex: 1 }}>
                I accept the <Text style={{ color: theme.primary, fontWeight: "600" }}>Terms & Conditions</Text> and{" "}
                <Text style={{ color: theme.primary, fontWeight: "600" }}>Privacy Policy</Text>
              </Text>
            </Pressable>
          )}

          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: "#fee" }]}>
              <Feather name="alert-circle" size={16} color="#c00" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            title={isSignUp ? "Sign Up" : "Sign In"}
            onPress={handleSubmit}
            loading={loading}
          />

          <Pressable
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
          >
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  form: { flex: 1 },
  roleContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  roleButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  genderContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  genderButton: {
    flex: 1,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  catBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: { color: "#c00", flex: 1, fontSize: 14 },
  switchButton: { flexDirection: "row", justifyContent: "center", marginTop: Spacing.xl },
});
