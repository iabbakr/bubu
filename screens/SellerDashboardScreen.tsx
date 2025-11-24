// screens/SellerDashboardScreen.tsx

import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Product, Wallet, Order } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { SellerStackParamList } from "../types/type";

type SellerDashboardNavigationProp = NativeStackNavigationProp<SellerStackParamList, "SellerDashboard">;

export default function SellerDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<SellerDashboardNavigationProp>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [walletData, productsData, ordersData] = await Promise.all([
        firebaseService.getWallet(user.uid),
        firebaseService.getProducts(),
        firebaseService.getOrders(user.uid, user.role),
      ]);
      setWallet(walletData);
      setProducts(productsData.filter(p => p.sellerId === user.uid));
      setOrders(ordersData.filter(o => o.status === "running"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (icon: string, label: string, value: string, color: string, onPress?: () => void) => (
    <Pressable
      style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={24} color={color} />
      </View>
      <ThemedText type="h2" style={{ color, marginTop: Spacing.sm }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>{label}</ThemedText>
    </Pressable>
  );

  if (!user || user.role !== "seller") {
    return (
      <ScreenScrollView>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>Access Denied</ThemedText>
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
            This page is only available to sellers
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>Seller Dashboard</ThemedText>

        {wallet && (
          <View style={[styles.walletCard, { backgroundColor: theme.primary }]}>
            <View style={styles.walletRow}>
              <View style={styles.walletItem}>
                <ThemedText type="caption" lightColor="#fff" darkColor="#fff" style={{ opacity: 0.8 }}>Available Balance</ThemedText>
                <ThemedText type="h1" lightColor="#fff" darkColor="#fff" style={{ marginTop: Spacing.xs }}>${wallet.balance.toFixed(2)}</ThemedText>
              </View>
              <View style={styles.walletItem}>
                <ThemedText type="caption" lightColor="#fff" darkColor="#fff" style={{ opacity: 0.8 }}>Pending</ThemedText>
                <ThemedText type="h2" lightColor="#fff" darkColor="#fff" style={{ marginTop: Spacing.xs }}>${wallet.pendingBalance.toFixed(2)}</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          {renderStatCard("package", "Products", products.length.toString(), theme.primary, () => navigation.navigate("MyProducts"))}
          {renderStatCard("shopping-bag", "Orders", orders.length.toString(), theme.warning, () => navigation.navigate("MyOrders"))}
        </View>

        {/* Pending Orders */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>Pending Orders</ThemedText>
          {orders.length === 0 ? (
            <View style={[styles.emptySection, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>No pending orders</ThemedText>
            </View>
          ) : (
            orders.slice(0, 5).map(order => (
              <Pressable
                key={order.id}
                onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
                style={[styles.orderCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              >
                <View style={styles.orderHeader}>
                  <ThemedText type="h4">Order #{order.id.slice(-6)}</ThemedText>
                  <ThemedText type="h4" style={{ color: theme.primary }}>${order.totalAmount.toFixed(2)}</ThemedText>
                </View>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  {order.products.length} item(s) • {new Date(order.createdAt).toLocaleDateString()} • Waiting for buyer confirmation
                </ThemedText>
              </Pressable>
            ))
          )}
          {orders.length > 5 && (
            <PrimaryButton title="View All Orders" onPress={() => navigation.navigate("MyOrders")} />
          )}
        </View>

        {/* Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h3">My Products</ThemedText>
            <PrimaryButton title="Add Product" onPress={() => navigation.navigate("AddProduct")} />
          </View>
          {products.length === 0 ? (
            <View style={[styles.emptySection, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>No products yet. Add your first product!</ThemedText>
            </View>
          ) : (
            products.slice(0, 5).map(product => (
              <Pressable
                key={product.id}
                onPress={() => navigation.navigate("EditProduct", { product })}
                style={[styles.productCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              >
                <ThemedText type="h4">{product.name}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  ${product.price.toFixed(2)} • Stock: {product.stock}
                </ThemedText>
              </Pressable>
            ))
          )}
          {products.length > 5 && (
            <PrimaryButton title="View All Products" onPress={() => navigation.navigate("MyProducts")} />
          )}
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing["5xl"] },
  walletCard: { padding: Spacing.xl, borderRadius: BorderRadius.md, marginBottom: Spacing.xl },
  walletRow: { flexDirection: "row", justifyContent: "space-between" },
  walletItem: { flex: 1 },
  statsGrid: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl },
  statCard: { flex: 1, padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: "center" },
  statIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  emptySection: { padding: Spacing.xl, borderRadius: BorderRadius.md, alignItems: "center" },
  orderCard: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productCard: { padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
});
