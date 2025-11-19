import { View, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { TextInputField } from "../components/TextInputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenKeyboardAwareScrollView } from "../components/ScreenKeyboardAwareScrollView";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller" | "admin">("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    
    if (!email || !password || (isSignUp && !name)) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      let success = false;
      if (isSignUp) {
        success = await signUp(email, password, selectedRole, name);
      } else {
        success = await signIn(email, password);
      }

      if (!success) {
        setError(isSignUp ? "Failed to create account" : "Invalid credentials");
      }
    } catch (err) {
      setError("An error occurred");
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
          color: selectedRole === role ? theme.buttonText : theme.textSecondary 
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <ScreenKeyboardAwareScrollView>
      <View style={styles.container}>
        <View style={[styles.header, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="shopping-bag" size={64} color={theme.primary} />
          <ThemedText type="h1" style={{ marginTop: Spacing.lg }}>
            MarketHub
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            Your one-stop marketplace
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText type="h2" style={{ marginBottom: Spacing.xl }}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </ThemedText>

          {isSignUp ? (
            <>
              <TextInputField
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
              />

              <ThemedText type="label" style={{ marginBottom: Spacing.md }}>
                SELECT YOUR ROLE
              </ThemedText>
              <View style={styles.roleContainer}>
                {renderRoleButton("buyer", "Buyer", "shopping-cart")}
                {renderRoleButton("seller", "Seller", "briefcase")}
                {renderRoleButton("admin", "Admin", "shield")}
              </View>
            </>
          ) : null}

          <TextInputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
          />

          <TextInputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            error={error}
          />

          <PrimaryButton
            title={isSignUp ? "Sign Up" : "Sign In"}
            onPress={handleSubmit}
            loading={loading}
          />

          <Pressable 
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.primary }}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  form: {
    flex: 1,
  },
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
  switchButton: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
});
