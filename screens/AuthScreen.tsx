import React, { useState } from "react";
import { View, StyleSheet, Pressable, Text, Modal, Image } from "react-native";
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
import { useNavigation } from "@react-navigation/native";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type AuthScreenNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  "Auth"
>;


type TermsModalProps = {
  visible: boolean;
  onClose: () => void;
};

/* -----------------------------------------------------
   TERMS & PRIVACY MODAL
----------------------------------------------------- */

const TermsModal = ({ visible, onClose }: TermsModalProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, padding: 20 }}>
        <Pressable
          onPress={onClose}
          style={{ alignSelf: "flex-end", padding: 10 }}
        >
          <Feather name="x" size={28} />
        </Pressable>

        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>
          Terms & Conditions
        </Text>

        <Text style={{ fontSize: 16, lineHeight: 22 }}>
          Add your full Terms & Conditions and Privacy Policy text here...
          {"\n\n"}
          You can always move this to a separate file later.
        </Text>
      </View>
    </Modal>
  );
};

/* -----------------------------------------------------
   MAIN COMPONENT
----------------------------------------------------- */
export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp } = useAuth();
  const navigation = useNavigation<AuthScreenNavigationProp>();


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
  const [showConfirm, setShowConfirm] = useState(false);
  const [sellerCategory, setSellerCategory] = useState<"supermarket" | "pharmacy">("supermarket");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  

  const handleSubmit = async () => {
    setError("");

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
      if (!location || !location.state || !location.city || !location.area) {
        setError("Please select your complete location (State, City, and Area)");
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
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h1" style={{ marginTop: Spacing.lg }}>
            Bubu
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

          {/* --- SIGN UP ONLY FIELDS --- */}
          {isSignUp && (
            <>
              <TextInputField label="Full Name" value={name} onChangeText={setName} placeholder="Enter your name" />
              <TextInputField label="Phone Number (Optional)" value={phone} onChangeText={setPhone} placeholder="Enter phone number" keyboardType="phone-pad" />

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

              {selectedRole === "seller" && (
                <View style={{ marginBottom: Spacing.md }}>
                  <ThemedText type="label" style={{ marginBottom: 5 }}>SELLER CATEGORY</ThemedText>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => setSellerCategory("supermarket")}
                      style={[
                        styles.catBtn,
                        {
                          borderColor: theme.border,
                          backgroundColor: sellerCategory === "supermarket" ? theme.primary + "20" : "transparent",
                        },
                        sellerCategory === "supermarket" && { borderColor: theme.primary },
                      ]}
                    >
                      <ThemedText style={{ color: sellerCategory === "supermarket" ? theme.primary : theme.text }}>
                        Supermarket
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => setSellerCategory("pharmacy")}
                      style={[
                        styles.catBtn,
                        {
                          borderColor: theme.border,
                          backgroundColor: sellerCategory === "pharmacy" ? theme.primary + "20" : "transparent",
                        },
                        sellerCategory === "pharmacy" && { borderColor: theme.primary },
                      ]}
                    >
                      <ThemedText style={{ color: sellerCategory === "pharmacy" ? theme.primary : theme.text }}>
                        Pharmacy
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}

              <TextInputField label="Referral Code (Optional)" value={referralCode} onChangeText={setReferralCode} placeholder="Enter referral code" />

              <LocationSelector value={location} onChange={setLocation} label="Location (State, City & Area)" />

              {location && (
                <View style={[styles.locationPreview, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <Feather name="map-pin" size={16} color={theme.primary} />
                  <ThemedText type="caption" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                    Selected: {location.state}, {location.city}, {location.area}
                  </ThemedText>
                </View>
              )}
            </>
          )}

          {/* --- EMAIL --- */}
          <TextInputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* --- PASSWORD --- */}
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

          {/* FORGOT PASSWORD */}
          {!isSignUp && (
            <Pressable
  onPress={() => navigation.navigate("ForgotPassword")}
  style={{ alignSelf: "flex-end", marginBottom: Spacing.md, marginTop: -Spacing.xs }}
>
  <Text style={{ color: theme.primary, fontWeight: "600" }}>
    Forgot Password?
  </Text>
</Pressable>

          )}

          {/* CONFIRM PASSWORD */}
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

          {/* TERMS & PRIVACY */}
          {isSignUp && (
            <Pressable style={styles.termsContainer}>
              <Pressable
                onPress={() => setTermsAccepted(!termsAccepted)}
                style={[styles.checkbox, { borderColor: theme.border }]}
              >
                {termsAccepted && <Feather name="check" size={16} color={theme.primary} />}
              </Pressable>

              <Text style={{ color: theme.text, flex: 1 }}>
                I accept the{" "}
                <Text onPress={() => setShowTermsModal(true)} style={{ color: theme.primary, fontWeight: "600" }}>
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text onPress={() => setShowTermsModal(true)} style={{ color: theme.primary, fontWeight: "600" }}>
                  Privacy Policy
                </Text>
              </Text>
            </Pressable>
          )}

          {/* ERROR */}
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: "#fee" }]}>
              <Feather name="alert-circle" size={16} color="#c00" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* BUTTON */}
          <PrimaryButton title={isSignUp ? "Sign Up" : "Sign In"} onPress={handleSubmit} loading={loading} />

          {/* SWITCH LOGIN/SIGNUP */}
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

        {/* TERMS MODAL */}
        <TermsModal visible={showTermsModal} onClose={() => setShowTermsModal(false)} />
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

/* -----------------------------------------------------
   STYLES
----------------------------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    padding: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 100,        // Adjust size as needed
    height: 100,
    marginBottom: Spacing.md,
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
  locationPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
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
