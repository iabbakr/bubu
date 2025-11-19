import { View, StyleSheet, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { OrderCard } from "../components/OrderCard";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Order } from "../utils/firebase";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

type OrderStatus = "running" | "delivered" | "cancelled";

export default function OrdersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("running");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, selectedStatus]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      const data = await firebaseService.getOrders(user.uid, user.role);
      const filtered = data.filter(order => order.status === selectedStatus);
      setOrders(filtered);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTab = (status: OrderStatus, label: string) => {
    const isSelected = selectedStatus === status;
    
    return (
      <Pressable
        key={status}
        style={[
          styles.tab,
          {
            backgroundColor: isSelected ? theme.primary : "transparent",
            borderColor: isSelected ? theme.primary : theme.border,
          }
        ]}
        onPress={() => setSelectedStatus(status)}
      >
        <ThemedText 
          weight="medium"
          style={{ 
            color: isSelected ? theme.buttonText : theme.textSecondary 
          }}
        >
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="package" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        No {selectedStatus} orders
      </ThemedText>
      <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
        Your {selectedStatus} orders will appear here
      </ThemedText>
    </View>
  );

  if (!user) {
    return (
      <ScreenScrollView>
        <View style={styles.empty}>
          <Feather name="log-in" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
            Please sign in
          </ThemedText>
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
            Sign in to view your orders
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.tabContainer}>
        {renderTab("running", "Running")}
        {renderTab("delivered", "Delivered")}
        {renderTab("cancelled", "Cancelled")}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Loading orders...
          </ThemedText>
        </View>
      ) : orders.length === 0 ? (
        renderEmpty()
      ) : (
        <View style={styles.list}>
          {orders.map(order => (
            <OrderCard 
              key={order.id}
              order={order}
              onPress={() => {}}
            />
          ))}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
  },
  list: {
    marginTop: Spacing.md,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  loading: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
});
