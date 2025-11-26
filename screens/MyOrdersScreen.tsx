import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { firebaseService, Order } from "../services/firebaseService";
import { Spacing, BorderRadius } from "../constants/theme";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SellerStackParamList } from "../types/type";
import { useNavigation } from "@react-navigation/native";

type MyOrdersScreenNavigationProp = NativeStackNavigationProp<SellerStackParamList, "MyOrders">;

export default function MyOrdersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<MyOrdersScreenNavigationProp>();

  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    try {
      const allOrders = await firebaseService.getOrders(user.uid, user.role);
      setOrders(allOrders.filter(o => o.status === "running"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paginatedOrders = orders.slice(0, page * PAGE_SIZE);

  const renderOrderCard = (order: Order) => (
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
  );

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>My Orders</ThemedText>

        {paginatedOrders.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>No pending orders</ThemedText>
          </View>
        ) : (
          <FlatList
            data={paginatedOrders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderOrderCard(item)}
          />
        )}

        {paginatedOrders.length < orders.length && (
          <PrimaryButton
            title="Load More"
            onPress={() => setPage(prev => prev + 1)}
            style={{ marginTop: Spacing.lg }}
          />
        )}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.md },
  empty: { padding: Spacing.xl, borderRadius: BorderRadius.md, alignItems: "center" },
  orderCard: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
