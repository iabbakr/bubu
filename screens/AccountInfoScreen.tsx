import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { TextInputField } from "../components/TextInputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { firebaseService } from "../services/firebaseService";

export default function AccountInfoScreen() {
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updatedUser = {
        ...user,
        name,
        phone,
      };

      await firebaseService.updateUserInfo(user.uid, { name, phone });

      if (updateUser) {
        updateUser(updatedUser);
      }

      Alert.alert("Success", "Account information updated successfully");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update account information");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setIsEditing(false);
  };

  const renderInfoRow = (icon: string, label: string, value: string, canEdit: boolean = false) => (
    <View style={[styles.infoRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
          <Feather name={icon as any} size={20} color={theme.primary} />
        </View>
        <View style={styles.infoContent}>
          <ThemedText type="label" style={{ color: theme.textSecondary, fontSize: 12 }}>
            {label}
          </ThemedText>
          {isEditing && canEdit ? null : (
            <ThemedText style={{ marginTop: Spacing.xs }}>
              {value || "Not provided"}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );

  if (!user) {
    return (
      <ScreenScrollView>
        <View style={styles.container}>
          <ThemedText>Please sign in to view account information</ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText type="h1" lightColor="#fff" darkColor="#fff">
              {user.name[0].toUpperCase()}
            </ThemedText>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: theme.secondary + "33" }]}>
            <Feather name={
              user.role === "admin" ? "shield" : 
              user.role === "seller" ? "briefcase" : 
              "shopping-cart"
            } size={14} color={theme.primary} />
            <ThemedText type="label" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
              {user.role.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        {/* Account Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">Account Information</ThemedText>
            {!isEditing && (
              <Pressable onPress={() => setIsEditing(true)}>
                <Feather name="edit-2" size={20} color={theme.primary} />
              </Pressable>
            )}
          </View>

          {isEditing ? (
            <>
              <TextInputField
                label="Full Name"
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
              />
              <TextInputField
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
              {renderInfoRow("mail", "Email", email)}
              {renderInfoRow("gift", "Referral Code", user.referralCode || "Not provided")}
              {user.role === "seller" && renderInfoRow("briefcase", "Seller Category", user.sellerCategory || "Not specified")}

              <View style={styles.buttonRow}>
                <PrimaryButton
                  title="Cancel"
                  onPress={handleCancel}
                  variant="outlined"
                  style={{ flex: 1, marginRight: Spacing.sm }}
                />
                <PrimaryButton
                  title="Save Changes"
                  onPress={handleSave}
                  loading={loading}
                  style={{ flex: 1, marginLeft: Spacing.sm }}
                />
              </View>
            </>
          ) : (
            <>
              {renderInfoRow("user", "Full Name", name, true)}
              {renderInfoRow("phone", "Phone Number", phone, true)}
              {renderInfoRow("mail", "Email", email)}
              {renderInfoRow("calendar", "Member Since", new Date(user.createdAt).toLocaleDateString())}
              {renderInfoRow("gift", "Referral Code", user.myReferralCode || "Not provided")}
              {user.role === "seller" && renderInfoRow("briefcase", "Seller Category", user.sellerCategory || "Not specified")}
            </>
          )}
        </View>

        {/* Account Statistics */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
            Account Statistics
          </ThemedText>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="shopping-bag" size={24} color={theme.primary} />
              <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                {user.role === "buyer" ? "0" : "0"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {user.role === "buyer" ? "Orders Placed" : "Products Listed"}
              </ThemedText>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="check-circle" size={24} color="#10b981" />
              <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>
                0
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Completed
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
            Security
          </ThemedText>
          
          <Pressable
            style={[styles.securityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => Alert.alert("Change Password", "Password change feature coming soon")}
          >
            <View style={styles.infoLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="lock" size={20} color={theme.primary} />
              </View>
              <ThemedText style={{ marginLeft: Spacing.md }}>Change Password</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[styles.securityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => Alert.alert("Two-Factor Auth", "2FA feature coming soon")}
          >
            <View style={styles.infoLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="shield" size={20} color={theme.primary} />
              </View>
              <ThemedText style={{ marginLeft: Spacing.md }}>Two-Factor Authentication</ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Danger Zone 
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg, color: "#ef4444" }}>
            Danger Zone
          </ThemedText>
          
          <Pressable
            style={[styles.dangerButton, { borderColor: "#ef4444" }]}
            onPress={() => {
              Alert.alert(
                "Delete Account",
                "Are you sure you want to delete your account? This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      Alert.alert("Feature Coming Soon", "Account deletion will be available soon");
                    },
                  },
                ]
              );
            }}
          >
            <Feather name="trash-2" size={20} color="#ef4444" />
            <ThemedText style={{ marginLeft: Spacing.md, color: "#ef4444" }}>
              Delete Account
            </ThemedText>
          </Pressable>
          
        </View>
        */}
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
    marginBottom: Spacing.md,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  securityButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
  },
});
