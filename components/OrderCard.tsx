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
        return {
          bg: theme.warning + "20",
          text: theme.warning,
          icon: "clock" as const,
        };
      case "delivered":
        return {
          bg: theme.success + "20",
          text: theme.success,
          icon: "check-circle" as const,
        };
      case "cancelled":
        return {
          bg: theme.error + "20",
          text: theme.error,
          icon: "x-circle" as const,
        };
      default:
        return {
          bg: theme.backgroundSecondary,
          text: theme.textSecondary,
          icon: "package" as const,
        };
    }
  };

  const statusStyle = getStatusColor();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h4">Order #{order.id.slice(-6)}</ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: 2 }}
          >
            {new Date(order.createdAt).toLocaleDateString()} at{" "}
            {new Date(order.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Feather name={statusStyle.icon} size={14} color={statusStyle.text} />
          <ThemedText
            type="caption"
            style={{
              color: statusStyle.text,
              fontWeight: "600",
              marginLeft: Spacing.xs,
            }}
          >
            {order.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      {/* Products List */}
      <View style={styles.productsContainer}>
        {order.products.slice(0, 2).map((item, index) => (
          <View key={index} style={styles.productRow}>
            <Feather name="box" size={16} color={theme.textSecondary} />
            <ThemedText
              type="body"
              style={{ marginLeft: Spacing.sm, flex: 1 }}
              numberOfLines={1}
            >
              {item.productName}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              x{item.quantity}
            </ThemedText>
          </View>
        ))}
        {order.products.length > 2 && (
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            +{order.products.length - 2} more item(s)
          </ThemedText>
        )}
      </View>

      {/* Delivery Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}
            numberOfLines={1}
          >
            {order.deliveryAddress}
          </ThemedText>
        </View>
        {order.phoneNumber && (
          <View style={styles.infoRow}>
            <Feather name="phone" size={14} color={theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}
            >
              {order.phoneNumber}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Dispute Badge */}
      {order.disputeStatus === "open" && (
        <View style={[styles.disputeBadge, { backgroundColor: theme.warning + "20" }]}>
          <Feather name="alert-circle" size={14} color={theme.warning} />
          <ThemedText
            type="caption"
            style={{ color: theme.warning, marginLeft: Spacing.xs, fontWeight: "600" }}
          >
            DISPUTE OPEN
          </ThemedText>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Total Amount
          </ThemedText>
          <ThemedText type="h3" style={{ color: theme.primary, marginTop: 2 }}>
            ₦{order.totalAmount.toLocaleString()}
          </ThemedText>
        </View>
        <View style={styles.viewDetailsButton}>
          <ThemedText
            style={{ color: theme.primary, fontWeight: "600", marginRight: Spacing.xs }}
          >
            View Details
          </ThemedText>
          <Feather name="chevron-right" size={20} color={theme.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  productsContainer: {
    marginBottom: Spacing.md,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  infoSection: {
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  disputeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
});