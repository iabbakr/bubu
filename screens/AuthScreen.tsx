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
// --- ASSUMED I18N IMPORT ---
import i18n from '../lib/i18n'; 
// ---------------------------

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
      <View style={{ flex: 1, padding: Spacing.xl }}>
        <Pressable
          onPress={onClose}
          style={{ alignSelf: "flex-end", padding: Spacing.sm }}
        >
          <Feather name="x" size={28} />
        </Pressable>

        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: Spacing.md }}>
          {i18n.t("terms_conditions_title")}
        </Text>

        <Text style={{ fontSize: 16, lineHeight: 22 }}>
          {i18n.t("terms_privacy_body")}
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
      setError(i18n.t("email_password_required_error"));
      return;
    }

    if (isSignUp) {
      if (!name) {
        setError(i18n.t("full_name_required_error"));
        return;
      }
      if (password !== confirmPassword) {
        setError(i18n.t("passwords_no_match_error"));
        return;
      }
      if (!termsAccepted) {
        setError(i18n.t("accept_terms_error"));
        return;
      }
      if (!location || !location.state || !location.city || !location.area) {
        setError(i18n.t("location_required_error"));
        return;
      }
      if (selectedRole === "seller" && !sellerCategory) {
        setError(i18n.t("seller_category_required_error"));
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
        setError(isSignUp ? i18n.t("failed_create_account") : i18n.t("invalid_credentials"));
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err?.message || i18n.t("an_error_occurred"));
    } finally {
      setLoading(false);
    }
  };

  const renderRoleButton = (role: typeof selectedRole, labelKey: string, icon: string) => (
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
        {i18n.t(labelKey)}
      </ThemedText>
    </Pressable>
  );

  const renderGenderButton = (genderOption: typeof gender, labelKey: string) => (
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
        {i18n.t(labelKey)}
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
            {i18n.t("app_name")}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {i18n.t("marketplace_slogan")}
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <ThemedText type="h2" style={{ marginBottom: Spacing.xl }}>
            {isSignUp ? i18n.t("create_account_title") : i18n.t("welcome_back_title")}
          </ThemedText>

          {/* --- SIGN UP ONLY FIELDS --- */}
          {isSignUp && (
            <>
              <TextInputField label={i18n.t("full_name_label")} value={name} onChangeText={setName} placeholder={i18n.t("enter_name_placeholder")} />
              <TextInputField label={i18n.t("phone_optional_label")} value={phone} onChangeText={setPhone} placeholder={i18n.t("enter_phone_placeholder")} keyboardType="phone-pad" />

              <ThemedText type="label" style={{ marginBottom: Spacing.sm }}>{i18n.t("gender_label")}</ThemedText>

              <View style={styles.genderContainer}>
                {renderGenderButton("male", "male")}
                {renderGenderButton("female", "female")}
                {renderGenderButton("other", "other")}
              </View>

              <ThemedText type="label" style={{ marginBottom: Spacing.sm, marginTop: Spacing.md }}>
                {i18n.t("select_role_label")}
              </ThemedText>

              <View style={styles.roleContainer}>
                {renderRoleButton("buyer", "buyer", "shopping-cart")}
                {renderRoleButton("seller", "seller", "briefcase")}
                {renderRoleButton("admin", "admin", "shield")}
              </View>

              {selectedRole === "seller" && (
                <View style={{ marginBottom: Spacing.md }}>
                  <ThemedText type="label" style={{ marginBottom: 5 }}>{i18n.t("seller_category_label")}</ThemedText>
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
                        {i18n.t("supermarket")}
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
                        {i18n.t("pharmacy")}
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              )}

              <TextInputField label={i18n.t("referral_code_optional")} value={referralCode} onChangeText={setReferralCode} placeholder={i18n.t("enter_referral_placeholder")} />

              <LocationSelector value={location} onChange={setLocation} label={i18n.t("location_label")} />

              {location && (
                <View style={[styles.locationPreview, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <Feather name="map-pin" size={16} color={theme.primary} />
                  <ThemedText type="caption" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                    {i18n.t("location_selected_preview", { state: location.state, city: location.city, area: location.area })}
                  </ThemedText>
                </View>
              )}
            </>
          )}

          {/* --- EMAIL --- */}
          <TextInputField
            label={i18n.t("email_label")}
            value={email}
            onChangeText={setEmail}
            placeholder={i18n.t("email_placeholder")}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* --- PASSWORD --- */}
          <TextInputField
            label={i18n.t("password_label")}
            value={password}
            onChangeText={setPassword}
            placeholder={i18n.t("enter_password_placeholder")}
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
                {i18n.t("forgot_password")}
              </Text>
            </Pressable>

          )}

          {/* CONFIRM PASSWORD */}
          {isSignUp && (
            <TextInputField
              label={i18n.t("confirm_password_label")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={i18n.t("confirm_password_placeholder")}
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
                {i18n.t("i_accept_the")}{" "}
                <Text onPress={() => setShowTermsModal(true)} style={{ color: theme.primary, fontWeight: "600" }}>
                  {i18n.t("terms_conditions")}
                </Text>{" "}
                {i18n.t("and")}{" "}
                <Text onPress={() => setShowTermsModal(true)} style={{ color: theme.primary, fontWeight: "600" }}>
                  {i18n.t("privacy_policy")}
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
          <PrimaryButton 
            title={isSignUp ? i18n.t("sign_up") : i18n.t("sign_in")} 
            onPress={handleSubmit} 
            loading={loading} 
          />

          {/* SWITCH LOGIN/SIGNUP */}
          <Pressable
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
          >
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {isSignUp ? i18n.t("already_have_account") : i18n.t("dont_have_account")}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              {isSignUp ? i18n.t("sign_in_switch") : i18n.t("sign_up_switch")}
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
  container: { flex: 1, 
    marginTop: 50,
  },
  
  header: {
    alignItems: "center",
    padding: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 100,
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