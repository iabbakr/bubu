import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { Order } from "../services/firebaseService";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

interface OrderCardProps {
  order: Order;
  onPress: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const { theme } = useTheme();

  const getStatusColor = () => {
    switch (order.status) {
      case "running":
        return theme.warning;
      case "delivered":
        return theme.success;
      case "cancelled":
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusIcon = () => {
    switch (order.status) {
      case "running":
        return "clock";
      case "delivered":
        return "check-circle";
      case "cancelled":
        return "x-circle";
      default:
        return "package";
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View>
          <ThemedText type="h4">Order #{order.id.slice(-6)}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {new Date(order.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
          <Feather name={getStatusIcon() as any} size={14} color={getStatusColor()} />
          <ThemedText type="label" style={{ color: getStatusColor(), marginLeft: Spacing.xs }}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.content}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {order.products.length} item(s)
        </ThemedText>
        <ThemedText type="h3" style={{ color: theme.primary, marginTop: Spacing.xs }}>
          ₦{order.totalAmount.toFixed(2)}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <Feather name="map-pin" size={14} color={theme.textSecondary} />
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs, flex: 1 }} numberOfLines={1}>
          {order.deliveryAddress}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  content: {
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
});