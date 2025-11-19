import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Order } from "@/utils/firebase";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

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
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { 
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <ThemedText type="h4">Order #{order.id.slice(-6)}</ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "26" }]}>
          <Feather name={getStatusIcon()} size={14} color={getStatusColor()} />
          <ThemedText type="label" style={{ color: getStatusColor(), marginLeft: Spacing.xs }}>
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.content}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {order.products.length} item(s) • ${order.totalAmount.toFixed(2)}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          {new Date(order.createdAt).toLocaleDateString()}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Tap to view details
        </ThemedText>
        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
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
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  content: {
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
