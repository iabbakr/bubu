import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, Image } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { firebaseService, Order } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

type RouteParams = { orderId: string };

type OrderTrackingStatus = "acknowledged" | "enroute" | "ready_for_pickup" ;

export default function OrderDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, "params">>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");

  useEffect(() => {
    loadOrder();
  }, [route.params?.orderId]);

  const loadOrder = async () => {
    try {
      const orderData = await firebaseService.getOrder(route.params?.orderId);
      setOrder(orderData);
    } catch (error) {
      console.error("Error loading order:", error);
      Alert.alert("Error", "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderTracking = async (status: OrderTrackingStatus) => {
    if (!order || !user) return;

    try {
      await firebaseService.updateOrderTracking(order.id, status);
      Alert.alert("Success", `Order status updated to ${status?.replace("_", " ")}`);
      loadOrder();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update order status");
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order || !user) return;

    Alert.alert(
      "Confirm Delivery",
      "Have you received all items in good condition?",
      [
        { text: "No, Open Dispute", onPress: () => setShowDisputeModal(true) },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            try {
              await firebaseService.confirmOrderDelivery(order.id, user.uid);
              Alert.alert("Success", "Order confirmed! Payment released to seller.");
              loadOrder();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleCancelOrder = async () => {
    if (!order || !user) return;
    if (!cancelReason.trim()) {
      Alert.alert("Error", "Please provide a cancellation reason");
      return;
    }

    try {
      if (user.role === "seller") {
        await firebaseService.cancelOrderBySeller(order.id, user.uid, cancelReason);
      } else {
        await firebaseService.cancelOrderByBuyer(order.id, user.uid, cancelReason);
      }
      Alert.alert("Success", "Order cancelled successfully");
      setShowCancelModal(false);
      setCancelReason("");
      loadOrder();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleOpenDispute = async () => {
    if (!order || !user) return;
    if (!disputeDetails.trim()) {
      Alert.alert("Error", "Please describe the issue");
      return;
    }

    try {
      await firebaseService.openDispute(order.id, user.uid, disputeDetails);
      Alert.alert("Success", "Dispute opened. An admin will review it shortly.");
      setShowDisputeModal(false);
      setDisputeDetails("");
      loadOrder();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const getTrackingSteps = () => {
    const steps = [
      { key: "acknowledged", label: "Order Acknowledged", icon: "check-circle" },
      { key: "enroute", label: "En Route", icon: "truck" },
      { key: "ready_for_pickup", label: "Ready for Pickup", icon: "package" },
      { key: "delivered", label: "Delivered", icon: "home" },
    ];

    const currentStatus = order?.trackingStatus || null;
    const currentIndex = steps.findIndex(s => s.key === currentStatus);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex || order?.status === "delivered",
      active: step.key === currentStatus,
    }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ThemedText>Loading order details...</ThemedText>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
          Order not found
        </ThemedText>
      </View>
    );
  }

  const isBuyer = user?.uid === order.buyerId;
  const isSeller = user?.uid === order.sellerId;
  const isAdmin = user?.role === "admin";

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Order Header */}
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <ThemedText type="h2">Order #{order.id.slice(-6)}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
              {new Date(order.createdAt).toLocaleTimeString()}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              {order.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        {/* Order Tracking */}
        {order.status === "running" && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
              Order Tracking
            </ThemedText>
            {getTrackingSteps().map((step, index) => (
              <View key={step.key} style={styles.trackingStep}>
                <View style={styles.trackingIconContainer}>
                  <View
                    style={[
                      styles.trackingIcon,
                      {
                        backgroundColor: step.completed ? theme.success : theme.backgroundSecondary,
                      },
                    ]}
                  >
                    <Feather
                      name={step.icon as any}
                      size={20}
                      color={step.completed ? "#fff" : theme.textSecondary}
                    />
                  </View>
                  {index < getTrackingSteps().length - 1 && (
                    <View
                      style={[
                        styles.trackingLine,
                        { backgroundColor: step.completed ? theme.success : theme.border },
                      ]}
                    />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <ThemedText
                    weight={step.active ? "bold" : "medium"}
                    style={{ color: step.completed ? theme.text : theme.textSecondary }}
                  >
                    {step.label}
                  </ThemedText>
                  {step.active && (
                    <ThemedText type="caption" style={{ color: theme.primary, marginTop: 2 }}>
                      Current Status
                    </ThemedText>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Seller Tracking Actions */}
        {isSeller && order.status === "running" && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
              Update Order Status
            </ThemedText>
            <View style={styles.trackingButtons}>
              {!order.trackingStatus && (
                <PrimaryButton
                  title="Acknowledge Order"
                  onPress={() => updateOrderTracking("acknowledged")}
                  style={styles.trackingBtn}
                />
              )}
              {order.trackingStatus === "acknowledged" && (
                <PrimaryButton
                  title="Mark as En Route"
                  onPress={() => updateOrderTracking("enroute")}
                  style={styles.trackingBtn}
                />
              )}
              {order.trackingStatus === "enroute" && (
                <PrimaryButton
                  title="Ready for Pickup"
                  onPress={() => updateOrderTracking("ready_for_pickup")}
                  style={styles.trackingBtn}
                />
              )}
            </View>
          </View>
        )}

        {/* Products */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Order Items
          </ThemedText>
          {order.products.map((item, index) => (
            <View key={index} style={styles.productItem}>
              <View style={[styles.productIcon, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="box" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText weight="medium">{item.productName}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  Quantity: {item.quantity} × ₦{item.price.toFixed(2)}
                </ThemedText>
              </View>
              <ThemedText weight="bold" style={{ color: theme.primary }}>
                ₦{(item.quantity * item.price).toFixed(2)}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Delivery Information */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Delivery Information
          </ThemedText>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={18} color={theme.textSecondary} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Delivery Address
              </ThemedText>
              <ThemedText weight="medium" style={{ marginTop: 2 }}>
                {order.deliveryAddress}
              </ThemedText>
            </View>
          </View>
          {order.phoneNumber && (
            <View style={[styles.infoRow, { marginTop: Spacing.md }]}>
              <Feather name="phone" size={18} color={theme.textSecondary} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Phone Number
                </ThemedText>
                <ThemedText weight="medium" style={{ marginTop: 2 }}>
                  {order.phoneNumber}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Payment Summary */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Payment Summary
          </ThemedText>
          <View style={styles.summaryRow}>
            <ThemedText>Subtotal</ThemedText>
            <ThemedText>₦{order.totalAmount.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <ThemedText>Platform Fee (10%)</ThemedText>
            <ThemedText>₦{order.commission.toFixed(2)}</ThemedText>
          </View>
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
            <ThemedText type="h3">Total</ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              ₦{order.totalAmount.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        {/* Dispute Status */}
        {order.disputeStatus === "open" && (
          <View style={[styles.disputeAlert, { backgroundColor: theme.warning + "20", borderColor: theme.warning }]}>
            <Feather name="alert-circle" size={24} color={theme.warning} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText weight="bold" style={{ color: theme.warning }}>
                Dispute is Open
              </ThemedText>
              <ThemedText type="caption" style={{ marginTop: 2 }}>
                {order.disputeDetails}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {isBuyer && order.status === "running" && order.trackingStatus === "ready_for_pickup" && (
            <PrimaryButton
              title="Confirm Delivery ✓"
              onPress={handleConfirmDelivery}
            />
          )}

          {(isBuyer || isSeller) && order.status === "running" && (
            <>
              {order.disputeStatus !== "open" && (
                <PrimaryButton
                  title="Open Dispute"
                  onPress={() => setShowDisputeModal(true)}
                  variant="outlined"
                  style={{ marginTop: Spacing.sm }}
                />
              )}
              {order.disputeStatus === "open" && (
                <PrimaryButton
                  title="View Dispute Chat"
                  onPress={() => navigation.navigate("DisputeChatScreen", { orderId: order.id })}
                  style={{ marginTop: Spacing.sm }}
                />
              )}
            </>
          )}

          {isSeller && order.status === "running" && (
            <PrimaryButton
              title="Cancel Order"
              onPress={() => setShowCancelModal(true)}
              variant="outlined"
              style={{ marginTop: Spacing.sm }}
            />
          )}
        </View>
      </View>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Cancel Order</ThemedText>
              <Pressable onPress={() => setShowCancelModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundSecondary }]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason for cancellation..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
            />
            <PrimaryButton title="Confirm Cancellation" onPress={handleCancelOrder} style={{ marginTop: Spacing.md }} />
          </View>
        </View>
      </Modal>

      {/* Dispute Modal */}
      <Modal visible={showDisputeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Open Dispute</ThemedText>
              <Pressable onPress={() => setShowDisputeModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundSecondary }]}
              value={disputeDetails}
              onChangeText={setDisputeDetails}
              placeholder="Describe the issue..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={6}
            />
            <PrimaryButton title="Submit Dispute" onPress={handleOpenDispute} style={{ marginTop: Spacing.md }} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.lg, flexDirection: "row", alignItems: "flex-start" },
  statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  section: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.lg },
  trackingStep: { flexDirection: "row", marginBottom: Spacing.lg },
  trackingIconContainer: { alignItems: "center" },
  trackingIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  trackingLine: { width: 2, flex: 1, marginVertical: 4 },
  trackingButtons: { gap: Spacing.sm },
  trackingBtn: { marginBottom: 0 },
  productItem: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
  productIcon: { width: 44, height: 44, borderRadius: BorderRadius.sm, justifyContent: "center", alignItems: "center" },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
  totalRow: { borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.sm },
  disputeAlert: { flexDirection: "row", padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.lg },
  actions: { marginTop: Spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.xl, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  textArea: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, minHeight: 100, textAlignVertical: "top" },
});