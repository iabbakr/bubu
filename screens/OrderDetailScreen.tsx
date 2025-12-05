import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { firebaseService, Order, User } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { soundManager } from '../lib/soundManager';
import { getDeliveryDescription, getDeliveryIcon, calculateDeliveryTimeframe } from "../utils/locationUtils";
import { PrescriptionViewer } from "../components/PrescriptionViewer";

type RouteParams = { orderId: string };
type OrderTrackingStatus = "acknowledged" | "enroute" | "ready_for_pickup";

// Seller Info Component
function SellerInfo({ sellerId }: { sellerId: string }) {
  const { theme } = useTheme();
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeller();
  }, [sellerId]);

  const loadSeller = async () => {
    try {
      const users = await firebaseService.getAllUsers();
      const sellerData = users.find((u) => u.uid === sellerId);
      setSeller(sellerData || null);
    } catch (error) {
      console.error("Error loading seller:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ThemedText type="caption" style={{ color: theme.textSecondary }}>Loading seller info...</ThemedText>;
  }

  if (!seller) {
    return <ThemedText type="caption" style={{ color: theme.textSecondary }}>Seller information unavailable</ThemedText>;
  }

  return (
    <>
      {seller.businessName && (
        <View style={styles.infoRow}>
          <Feather name="briefcase" size={18} color={theme.textSecondary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Business Name
            </ThemedText>
            <ThemedText weight="medium" style={{ marginTop: 2 }}>
              {seller.businessName}
            </ThemedText>
          </View>
        </View>
      )}

      {seller.businessAddress && (
        <View style={[styles.infoRow, { marginTop: Spacing.md }]}>
          <Feather name="map-pin" size={18} color={theme.textSecondary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Business Address
            </ThemedText>
            <ThemedText weight="medium" style={{ marginTop: 2 }}>
              {seller.businessAddress}
            </ThemedText>
          </View>
        </View>
      )}

      {seller.businessPhone && (
        <View style={[styles.infoRow, { marginTop: Spacing.md }]}>
          <Feather name="phone" size={18} color={theme.textSecondary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Business Phone
            </ThemedText>
            <ThemedText weight="medium" style={{ marginTop: 2 }}>
              {seller.businessPhone}
            </ThemedText>
          </View>
        </View>
      )}
    </>
  );
}

export default function OrderDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, "params">>();

  const [order, setOrder] = useState<Order | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
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
      
      // Load seller info for location comparison
      if (orderData) {
        const users = await firebaseService.getAllUsers();
        const sellerData = users.find((u) => u.uid === orderData.sellerId);
        setSeller(sellerData || null);
      }
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
      const isBuyer = user.uid === order.buyerId;
      
      if (isBuyer) {
        await firebaseService.cancelOrderByBuyer(order.id, user.uid, cancelReason);
        Alert.alert("Success", "Order cancelled successfully. You have been refunded.");
      } else {
        await firebaseService.cancelOrderBySeller(order.id, user.uid, cancelReason);
        Alert.alert("Success", "Order cancelled successfully. Buyer has been refunded.");
      }
      
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

  const getCancelModalTitle = () => {
    if (!order || !user) return "Cancel Order";
    const isBuyer = user.uid === order.buyerId;
    return isBuyer ? "Cancel Order" : "Cancel Order";
  };

  // Get delivery timeframe based on locations
  const getDeliveryTimeframeInfo = () => {
    if (!order || !user || !seller) {
      return "Delivery timeframe to be confirmed";
    }

    const timeframe = calculateDeliveryTimeframe(user.location, seller.location);
    const icon = getDeliveryIcon(user.location, seller.location);
    
    return {
      text: `${timeframe.min} - ${timeframe.max}`,
      description: timeframe.description,
      icon,
      zone: timeframe.zone,
    };
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
  const deliveryInfo = getDeliveryTimeframeInfo();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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

        {/* Delivery Timeframe Notice - Show for running orders */}
        {order.status === "running" && typeof deliveryInfo !== "string" && (
          <View style={[
            styles.deliveryTimeframeCard, 
            { 
              backgroundColor: deliveryInfo.zone === "same_area" || deliveryInfo.zone === "same_city" 
                ? theme.success + "15" 
                : theme.backgroundSecondary,
              borderColor: deliveryInfo.zone === "same_area" || deliveryInfo.zone === "same_city"
                ? theme.success
                : theme.border
            }
          ]}>
            <View style={[
              styles.deliveryIconCircle,
              { 
                backgroundColor: deliveryInfo.zone === "same_area" || deliveryInfo.zone === "same_city"
                  ? theme.success
                  : theme.primary
              }
            ]}>
              <Feather name={deliveryInfo.icon} size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="h4" style={{ fontWeight: "600" }}>
                Estimated Delivery: {deliveryInfo.text}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {deliveryInfo.description}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.warning, marginTop: 8, fontStyle: "italic" }}>
                If not delivered within stated time, you can open a dispute for refund. T&C apply.
              </ThemedText>
            </View>
          </View>
        )}

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
                      { backgroundColor: step.completed ? theme.success : theme.backgroundSecondary }
                    ]}
                  >
                    <Feather name={step.icon as any} size={20} color={step.completed ? "#fff" : theme.textSecondary} />
                  </View>

                  {index < getTrackingSteps().length - 1 && (
                    <View
                      style={[
                        styles.trackingLine,
                        { backgroundColor: step.completed ? theme.success : theme.border }
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

        {/* Products with Prescriptions */}
<View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
  <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
    Order Items
  </ThemedText>

  {order.products.map((item, index) => (
    <View key={index}>
      <View style={styles.productItem}>
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

      {/* Show prescription if available */}
      {item.prescriptionUrl && item.prescriptionFileName && (
        <View style={{ marginLeft: Spacing["3xl"], marginRight: Spacing.md }}>
          <PrescriptionViewer
            prescriptionUrl={item.prescriptionUrl}
            prescriptionFileName={item.prescriptionFileName}
            productName={item.productName}
          />
        </View>
      )}
    </View>
  ))}
</View>

        {/* Seller Business Info */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            Seller Information
          </ThemedText>
          <SellerInfo sellerId={order.sellerId} />
        </View>

        {/* Delivery Info */}
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

        {/* Dispute Banner */}
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

        {/* Action Buttons */}
        <View style={styles.actions}>

          {/* Buyer Confirm Delivery */}
          {isBuyer &&
            order.status === "running" &&
            order.trackingStatus === "ready_for_pickup" && (
              <PrimaryButton title="Confirm Delivery ✓" onPress={handleConfirmDelivery} />
            )}

          {/* Buyer Cancel Order - Only before acknowledgment */}
          {isBuyer &&
            order.status === "running" &&
            !order.trackingStatus && (
              <PrimaryButton
                title="Cancel Order"
                onPress={() => setShowCancelModal(true)}
                variant="outlined"
                style={{ marginTop: Spacing.sm }}
              />
            )}

          {/* Buyer/Seller Open Dispute */}
          {(isBuyer || isSeller) &&
            order.status === "running" &&
            order.disputeStatus !== "open" && (
              <PrimaryButton
                title="Open Dispute"
                onPress={() => setShowDisputeModal(true)}
                variant="outlined"
                style={{ marginTop: Spacing.sm, gap: 5, }}
              />
            )}

          {/* Admin, Buyer, Seller View Dispute */}
          {(isBuyer || isSeller || isAdmin) &&
            order.disputeStatus === "open" && (
              <PrimaryButton
                title="View Dispute Chat"
                onPress={() =>
                  navigation.navigate("DisputeChatScreen", { orderId: order.id })
                }
                style={{ marginTop: Spacing.sm }}
              />
            )}

          {/* Seller Cancel */}
          {isSeller &&
            order.status === "running" && (
              <PrimaryButton
                title="Cancel Order"
                onPress={() => setShowCancelModal(true)}
                variant="outlined"
                style={{ marginTop: Spacing.sm }}
              />
            )}
        </View>
      </View>

      {/* CANCEL MODAL */}
      <Modal visible={showCancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">{getCancelModalTitle()}</ThemedText>
              <Pressable onPress={() => setShowCancelModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.textArea,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason for cancellation..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
            />

            <PrimaryButton
              title="Confirm Cancellation"
              onPress={handleCancelOrder}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* DISPUTE MODAL */}
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
              style={[
                styles.textArea,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
              value={disputeDetails}
              onChangeText={setDisputeDetails}
              placeholder="Describe the issue..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={6}
            />

            <PrimaryButton
              title="Submit Dispute"
              onPress={handleOpenDispute}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
  },
  content: { 
    padding: Spacing.lg,
  },
  header: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  deliveryTimeframeCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.lg,
    alignItems: "flex-start",
  },
  deliveryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  trackingStep: { flexDirection: "row", marginBottom: Spacing.lg },
  trackingIconContainer: { alignItems: "center" },
  trackingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  trackingLine: { width: 2, flex: 1, marginVertical: 4 },
  trackingButtons: { gap: Spacing.sm },
  trackingBtn: { marginBottom: 0 },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  totalRow: { borderTopWidth: 1, paddingTop: Spacing.md, marginTop: Spacing.sm },
  disputeAlert: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  actions: { 
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    textAlignVertical: "top",
  },
});