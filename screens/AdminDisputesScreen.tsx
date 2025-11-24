import { View, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Order } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

export default function AdminDisputesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [disputes, setDisputes] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      loadDisputes();
    }
  }, [user]);

  const loadDisputes = async () => {
    try {
      const orders = await firebaseService.getOrders("", "admin");
      const openDisputes = orders.filter(o => o.disputeStatus === "open");
      setDisputes(openDisputes);
    } catch (error) {
      console.error("Error loading disputes:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDisputes();
  };

  const renderDisputeCard = ({ item }: { item: Order }) => (
    <Pressable
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => navigation.navigate("DisputeChatScreen", { orderId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h4">Order #{item.id.slice(-6)}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            Opened {new Date(item.updatedAt).toLocaleDateString()}
          </ThemedText>
        </View>
        <View style={[styles.urgentBadge, { backgroundColor: theme.error + "20" }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText type="caption" style={{ color: theme.error, marginLeft: 4, fontWeight: "600" }}>
            URGENT
          </ThemedText>
        </View>
      </View>

      <View style={styles.disputeInfo}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          Dispute Details:
        </ThemedText>
        <ThemedText numberOfLines={2} style={{ marginTop: 4 }}>
          {item.disputeDetails || "No details provided"}
        </ThemedText>
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.infoRow}>
          <Feather name="package" size={14} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ marginLeft: 6, color: theme.textSecondary }}>
            {item.products.length} item(s)
          </ThemedText>
        </View>
        <View style={styles.infoRow}>
          <Feather name="dollar-sign" size={14} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ marginLeft: 6, color: theme.textSecondary }}>
            ₦{item.totalAmount.toLocaleString()}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actionRow}>
        <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>
          Review & Resolve
        </ThemedText>
        <Feather name="chevron-right" size={20} color={theme.primary} />
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="check-circle" size={64} color={theme.success} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        No Open Disputes
      </ThemedText>
      <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
        All disputes have been resolved
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="h2">Open Disputes</ThemedText>
        <View style={[styles.badge, { backgroundColor: theme.error + "20" }]}>
          <ThemedText type="h4" style={{ color: theme.error }}>
            {disputes.length}
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Loading disputes...
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={disputes}
          renderItem={renderDisputeCard}
          keyExtractor={item => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  badge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  list: { padding: Spacing.lg, paddingTop: 0 },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  disputeInfo: {
    padding: Spacing.md,
    backgroundColor: "#f9f9f9",
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  orderInfo: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});