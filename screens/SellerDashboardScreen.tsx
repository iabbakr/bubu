// screens/SellerDashboardScreen.tsx

import { View, StyleSheet, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Wallet, Order } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { SellerStackParamList } from "../types/type";

type SellerDashboardNavigationProp = NativeStackNavigationProp<
  SellerStackParamList,
  "SellerDashboard"
>;

export default function SellerDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<SellerDashboardNavigationProp>();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [walletData, allProducts, userOrders] = await Promise.all([
        firebaseService.getWallet(user.uid),
        firebaseService.getProducts(),
        firebaseService.getOrders(user.uid, "seller"),
      ]);

      const myProducts = allProducts.filter(p => p.sellerId === user.uid);
      const runningOrders = userOrders.filter(o => o.status === "running");

      setWallet(walletData);
      setTotalProducts(myProducts.length);
      setPendingOrders(runningOrders.length);
    } catch (error) {
      console.error("Error loading seller dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (
    icon: string,
    label: string,
    value: string | number,
    color: string,
    onPress?: () => void
  ) => (
    <Pressable
      style={[
        styles.statCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
      onPress={onPress}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={28} color={color} />
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
    </Pressable>
  );

  if (!user || user.role !== "seller") {
    return (
      <ScreenScrollView>
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
            This page is only available to sellers
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  if (loading) {
    return (
      <ScreenScrollView contentContainerStyle={styles.center}>
        <ThemedText type="h4" style={{ color: theme.textSecondary }}>
          Loading dashboard...
        </ThemedText>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Header */}
       

        {/* Wallet Card */}
        {wallet && (
          <View style={[styles.walletCard, { backgroundColor: theme.primary }]}>
            <View style={styles.walletRow}>
              <View style={styles.walletItem}>
                <ThemedText type="caption" lightColor="#fff" style={{ opacity: 0.9 }}>
                  Available Balance
                </ThemedText>
                <ThemedText type="h1" lightColor="#fff" style={{ marginTop: Spacing.xs }}>
                  ₦{wallet.balance.toFixed(0)}
                </ThemedText>
              </View>
              <View style={styles.walletItem}>
                <ThemedText type="caption" lightColor="#fff" style={{ opacity: 0.9 }}>
                  Pending Earnings
                </ThemedText>
                <ThemedText type="h2" lightColor="#fff" style={{ marginTop: Spacing.xs }}>
                  ₦{wallet.pendingBalance.toFixed(0)}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

         <View style={styles.header}>
          
          <PrimaryButton
            title="Add Product"
            onPress={() => navigation.navigate("AddProduct")}
            style={styles.addProductBtn}
          />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            "package",
            "Total Products",
            totalProducts,
            theme.primary,
            () => navigation.navigate("MyProducts")
          )}
          {renderStatCard(
            "shopping-bag",
            "Pending Orders",
            pendingOrders,
            theme.warning,
            () => navigation.navigate("MyOrders")
          )}
          
        </View>

       
        
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  addProductBtn: {
    paddingHorizontal: Spacing.lg,
  },
  walletCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  walletRow: { flexDirection: "row", justifyContent: "space-between" },
  walletItem: { flex: 1 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  quickActions: {
    marginTop: Spacing.xl,
  },
  actionButtons: {
    gap: Spacing.md,
  },
  actionBtn: {
    justifyContent: "flex-start",
  },
});