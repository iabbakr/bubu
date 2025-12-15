// screens/ProfileScreen.tsx - FIXED
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Wallet } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { useLanguage } from "../context/LanguageContext";
import i18n from "../lib/i18n";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../navigation/ProfileStackNavigator';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const { locale } = useLanguage();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  useEffect(() => {
    if (user) {
      loadWallet();
    }
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    
    try {
      const data = await firebaseService.getWallet(user.uid);
      setWallet(data);
    } catch (error) {
      console.error("Error loading wallet:", error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  const renderMenuItem = (
    icon: string, 
    title: string, 
    onPress: () => void, 
    showBadge?: boolean, 
    badgeText?: string
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIcon, { backgroundColor: theme.primary + "20" }]}>
          <Feather name={icon as any} size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ marginLeft: Spacing.md }}>{title}</ThemedText>
          {showBadge && badgeText && (
            <ThemedText 
              type="caption" 
              style={{ marginLeft: Spacing.md, color: theme.textSecondary, marginTop: 2 }}
            >
              {badgeText}
            </ThemedText>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  if (!user) {
    return (
      <ScreenScrollView>
        <View style={styles.container}>
          <View style={[styles.authPrompt, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="user" size={64} color={theme.textSecondary} />
            <ThemedText type="h2" style={{ marginTop: Spacing.lg, marginBottom: Spacing.md }}>
              Welcome to Bubu
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.xl }}>
              Sign in or create an account to start shopping
            </ThemedText>
            <PrimaryButton title="Get Started" onPress={() => {}} />
          </View>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Wallet Preview Card */}
        {wallet && (
          <Pressable
            style={[styles.walletPreviewCard, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("Wallet")}
          >
            <View style={styles.walletPreviewLeft}>
              <Feather name="credit-card" size={24} color="#fff" />
              <View style={{ marginLeft: Spacing.md }}>
                <ThemedText type="caption" lightColor="#fff" darkColor="#fff" style={{ opacity: 0.9 }}>
                  {i18n.t("wallet_balance")}
                </ThemedText>
                <ThemedText type="h2" lightColor="#fff" darkColor="#fff" style={{ marginTop: 4 }}>
                  ₦{wallet.balance.toFixed(2)}
                </ThemedText>
                {wallet.pendingBalance > 0 && (
                  <ThemedText type="caption" lightColor="#fff" darkColor="#fff" style={{ opacity: 0.8, marginTop: 2 }}>
                    Pending: ₦{wallet.pendingBalance.toFixed(2)}
                  </ThemedText>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={24} color="#fff" />
          </Pressable>
        )}

        {/* Account Section */}
        <View style={styles.menuSection}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }}>
            Account
          </ThemedText>
          {renderMenuItem(
            "user", 
            i18n.t("account_information"),
            () => navigation.navigate("AccountInfo")
          )}
          {renderMenuItem("shopping-cart", i18n.t("cart"), () => navigation.navigate("Cart"))}
          {renderMenuItem("shopping-bag", i18n.t("order"), () => {})}
          {renderMenuItem("heart", i18n.t("wishlist"), () => navigation.navigate("Wishlist"))}
        </View>

        {/* Business Section */}
        {(user.role === "seller" || user.role === "admin" || user.role === "professional") && (
          <View style={styles.menuSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }}>
              {i18n.t("business")}
            </ThemedText>
            {user.role === "seller" && renderMenuItem(
              "briefcase", 
              i18n.t("seller_dashboard"), 
              () => navigation.navigate("SellerDashboard")
            )}
            {user.role === "admin" && renderMenuItem(
              "shield", 
              i18n.t("admin_panel"), 
              () => navigation.navigate("AdminPanel")
            )}
            {user.role === "professional" && renderMenuItem(
              "activity", 
              "Professional Dashboard", 
              () => navigation.navigate("ProfessionalDashboard"),
              true,
              `${user.professionalType || "Healthcare"} • ${user.specialization || "Set profile"}`
            )}
          </View>
        )}

        {/* State Management Section */}
        {(user.role === "state_manager_1" || user.role === "state_manager_2") && (
          <View style={styles.menuSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }}>
              State Management
            </ThemedText>
            {renderMenuItem(
              "map", 
              "State Dashboard", 
              () => navigation.navigate("StateManagerDashboard")
            )}
          </View>
        )}

        {/* Administration Section */}
        {user.role === "admin" && (
          <View style={styles.menuSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }}>
              Administration
            </ThemedText>
            {renderMenuItem(
              "shield", 
              "Admin Panel", 
              () => navigation.navigate("AdminPanel")
            )}
            {renderMenuItem(
              "users", 
              "Role Management", 
              () => navigation.navigate("AdminRoleManagement")
            )}
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.menuSection}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }}>
            {i18n.t("settings")}
          </ThemedText>
          {renderMenuItem("bell", i18n.t("notifications"), () => navigation.navigate("NotificationSetting"))}

          {renderMenuItem("globe", i18n.t("language"), () => navigation.navigate("Language"))}
          {renderMenuItem("moon", i18n.t("theme"), () => navigation.navigate("Theme"))}
        </View>

        {/* Support Section */}
        <View style={styles.menuSection}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md, marginLeft: Spacing.xs }}>
            {i18n.t("support")}
          </ThemedText>
          {renderMenuItem("help-circle", i18n.t("help_center"), () => navigation.navigate("HelpCenter"))}
          {renderMenuItem("star", i18n.t("rate_us"), () => {})}
          {renderMenuItem("info", i18n.t("about"), () => {})}
        </View>

        {/* Sign Out Button */}
        <PrimaryButton 
          title={i18n.t("sign_out")} 
          onPress={handleSignOut}
          variant="outlined"
          style={{ marginTop: Spacing.lg }}
        />

        <ThemedText 
          type="caption" 
          style={{ 
            textAlign: "center", 
            color: theme.textSecondary, 
            marginTop: Spacing.xl,
            marginBottom: Spacing.xl 
          }}
        >
          Version 1.0.0
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.md,
  },
  walletPreviewCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  walletPreviewLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  authPrompt: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  menuSection: {
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});