import { View, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, User, Wallet, Order } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

export default function AdminPanelScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [adminWallet, setAdminWallet] = useState<Wallet | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === "admin") {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [walletData, usersData, ordersData] = await Promise.all([
        firebaseService.getWallet("admin"),
        firebaseService.getAllUsers(),
        firebaseService.getOrders("", "admin"),
      ]);

      setAdminWallet(walletData);
      setUsers(usersData);
      setOrders(ordersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (icon: string, label: string, value: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={24} color={color} />
      </View>
      <ThemedText type="h2" style={{ color, marginTop: Spacing.sm }}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
        {label}
      </ThemedText>
    </View>
  );

  if (!user || user.role !== "admin") {
    return (
      <ScreenScrollView>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
            Access Denied
          </ThemedText>
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
            This page is only available to administrators
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  const buyerCount = users.filter(u => u.role === "buyer").length;
  const sellerCount = users.filter(u => u.role === "seller").length;
  const totalRevenue = adminWallet?.balance || 0;

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>
          Admin Panel
        </ThemedText>

        <View style={[styles.revenueCard, { backgroundColor: theme.success }]}>
          <ThemedText type="caption" lightColor="#fff" darkColor="#fff" style={{ opacity: 0.9 }}>
            Total Platform Revenue
          </ThemedText>
          <ThemedText type="h1" lightColor="#fff" darkColor="#fff" style={{ marginTop: Spacing.sm }}>
            ${totalRevenue.toFixed(2)}
          </ThemedText>
          <ThemedText type="caption" lightColor="#fff" darkColor="#fff" style={{ opacity: 0.8, marginTop: Spacing.xs }}>
            From {orders.length} total orders
          </ThemedText>
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard("users", "Buyers", buyerCount.toString(), theme.primary)}
          {renderStatCard("briefcase", "Sellers", sellerCount.toString(), theme.warning)}
        </View>

        <View style={styles.statsGrid}>
          {renderStatCard("package", "Running", orders.filter(o => o.status === "running").length.toString(), theme.warning)}
          {renderStatCard("check-circle", "Delivered", orders.filter(o => o.status === "delivered").length.toString(), theme.success)}
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Recent Transactions
          </ThemedText>
          {adminWallet && adminWallet.transactions.length > 0 ? (
            <View style={[styles.transactionsList, { backgroundColor: theme.backgroundSecondary }]}>
              {adminWallet.transactions.slice(-5).reverse().map((transaction, index) => (
                <View key={index} style={styles.transactionItem}>
                  <View>
                    <ThemedText type="body">{transaction.description}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                      {new Date(transaction.timestamp).toLocaleString()}
                    </ThemedText>
                  </View>
                  <ThemedText type="h4" style={{ color: theme.success }}>
                    +${transaction.amount.toFixed(2)}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptySection, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                No transactions yet
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            User Overview
          </ThemedText>
          <View style={[styles.userList, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.userItem}>
              <ThemedText type="body">Total Users</ThemedText>
              <ThemedText type="h4" style={{ color: theme.primary }}>
                {users.length}
              </ThemedText>
            </View>
            <View style={styles.userItem}>
              <ThemedText type="body">Buyers</ThemedText>
              <ThemedText type="h4" style={{ color: theme.primary }}>
                {buyerCount}
              </ThemedText>
            </View>
            <View style={styles.userItem}>
              <ThemedText type="body">Sellers</ThemedText>
              <ThemedText type="h4" style={{ color: theme.primary }}>
                {sellerCount}
              </ThemedText>
            </View>
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
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  revenueCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
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
  section: {
    marginTop: Spacing.xl,
  },
  emptySection: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  transactionsList: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#00000010",
  },
  userList: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
});
