// screens/StateManagerDashboard.tsx
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { roleManagementService, StateAnalytics } from "../services/roleManagementService";
import { isStateManager } from "../types/user";

export default function StateManagerDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [analytics, setAnalytics] = useState<StateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && isStateManager(user.role) && user.assignedState) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user?.assignedState) return;
    
    try {
      const data = await roleManagementService.getStateAnalytics(user.assignedState);
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const renderStatCard = (
    icon: string,
    label: string,
    value: string | number,
    color: string,
    subtitle?: string
  ) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={24} color={color} />
      </View>
      <ThemedText type="h2" style={{ color, marginTop: Spacing.sm }}>
        {value}
      </ThemedText>
      <ThemedText
        type="caption"
        style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
      >
        {label}
      </ThemedText>
      {subtitle && (
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginTop: 2, fontSize: 10 }}
        >
          {subtitle}
        </ThemedText>
      )}
    </View>
  );

  const renderTopSeller = (seller: StateAnalytics["topSellers"][0], index: number) => (
    <View
      key={seller.sellerId}
      style={[
        styles.topSellerCard,
        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
      ]}
    >
      <View style={styles.rankBadge}>
        <ThemedText type="h4" style={{ color: theme.primary }}>
          #{index + 1}
        </ThemedText>
      </View>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <ThemedText weight="medium">{seller.sellerName}</ThemedText>
        <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xs }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Feather name="shopping-bag" size={12} color={theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{ marginLeft: 4, color: theme.textSecondary }}
            >
              {seller.totalOrders} orders
            </ThemedText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Feather name="dollar-sign" size={12} color={theme.success} />
            <ThemedText
              type="caption"
              style={{ marginLeft: 4, color: theme.success }}
            >
              ₦{seller.revenue.toLocaleString()}
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );

  if (!user || !isStateManager(user.role)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} />
          <ThemedText
            type="h3"
            style={{ marginTop: Spacing.lg, color: theme.textSecondary }}
          >
            Access Denied
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ marginTop: Spacing.sm, color: theme.textSecondary }}
          >
            This page is only available to State Managers
          </ThemedText>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.empty}>
          <ThemedText type="h4" style={{ color: theme.textSecondary }}>
            Loading dashboard...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="h2">{user.assignedState} Operations</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 4 }}
            >
              {user.managerLevel === 1 ? "Operation Manager I" : "Operation Manager II"}
            </ThemedText>
          </View>
          <View
            style={[
              styles.levelBadge,
              { backgroundColor: theme.primary + "20" },
            ]}
          >
            <ThemedText weight="bold" style={{ color: theme.primary }}>
              Level {user.managerLevel}
            </ThemedText>
          </View>
        </View>

        {/* Revenue Overview */}
        {analytics && (
          <>
            <View
              style={[
                styles.revenueCard,
                { backgroundColor: theme.primary },
              ]}
            >
              <ThemedText
                type="caption"
                lightColor="#fff"
                style={{ opacity: 0.9 }}
              >
                Total State Revenue
              </ThemedText>
              <ThemedText
                type="h1"
                lightColor="#fff"
                style={{ marginTop: Spacing.sm }}
              >
                ₦{analytics.totalRevenue.toLocaleString()}
              </ThemedText>
              <View style={styles.revenueStats}>
                <View>
                  <ThemedText
                    type="caption"
                    lightColor="#fff"
                    style={{ opacity: 0.8 }}
                  >
                    Commission Earned
                  </ThemedText>
                  <ThemedText type="h4" lightColor="#fff">
                    ₦{analytics.commissionEarned.toLocaleString()}
                  </ThemedText>
                </View>
                <View>
                  <ThemedText
                    type="caption"
                    lightColor="#fff"
                    style={{ opacity: 0.8 }}
                  >
                    Avg Order Value
                  </ThemedText>
                  <ThemedText type="h4" lightColor="#fff">
                    ₦{analytics.averageOrderValue.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Sellers Stats */}
            <View style={styles.section}>
              <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
                Sellers Overview
              </ThemedText>
              <View style={styles.statsGrid}>
                {renderStatCard(
                  "briefcase",
                  "Total Sellers",
                  analytics.totalSellers,
                  theme.primary
                )}
                {renderStatCard(
                  "check-circle",
                  "Active Sellers",
                  analytics.activeSellers,
                  theme.success,
                  `${((analytics.activeSellers / analytics.totalSellers) * 100).toFixed(0)}% active`
                )}
              </View>
            </View>

            {/* Orders Stats */}
            <View style={styles.section}>
              <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
                Orders Overview
              </ThemedText>
              <View style={styles.statsGrid}>
                {renderStatCard(
                  "shopping-bag",
                  "Total Orders",
                  analytics.totalOrders,
                  theme.primary
                )}
                {renderStatCard(
                  "clock",
                  "Running",
                  analytics.runningOrders,
                  theme.warning
                )}
              </View>
              <View style={styles.statsGrid}>
                {renderStatCard(
                  "check",
                  "Delivered",
                  analytics.deliveredOrders,
                  theme.success
                )}
                {renderStatCard(
                  "x-circle",
                  "Cancelled",
                  analytics.cancelledOrders,
                  theme.error
                )}
              </View>
            </View>

            {/* Top Sellers */}
            {analytics.topSellers.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
                  Top Performing Sellers
                </ThemedText>
                <View style={styles.topSellersList}>
                  {analytics.topSellers.slice(0, 5).map((seller, index) =>
                    renderTopSeller(seller, index)
                  )}
                </View>
              </View>
            )}

            {/* Quick Actions (Level 2 Only) */}
            {user.managerLevel === 2 && (
              <View style={styles.section}>
                <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
                  Quick Actions
                </ThemedText>
                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.actionContent}>
                    <Feather name="alert-circle" size={20} color={theme.warning} />
                    <ThemedText style={{ marginLeft: Spacing.md }}>
                      View State Disputes
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.actionContent}>
                    <Feather name="users" size={20} color={theme.primary} />
                    <ThemedText style={{ marginLeft: Spacing.md }}>
                      Manage State Sellers
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  revenueCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  revenueStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  topSellersList: {
    gap: Spacing.sm,
  },
  topSellerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
});