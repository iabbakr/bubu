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
import { getDeliveryIcon, calculateDeliveryTimeframe } from "../utils/locationUtils";
import { PrescriptionViewer } from "../components/PrescriptionViewer";
// --- ASSUMED I18N IMPORT ---
import i18n from '../lib/i18n'; 
// ---------------------------

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
    return <ThemedText type="caption" style={{ color: theme.textSecondary }}>{i18n.t("loading_seller_info")}</ThemedText>;
  }

  if (!seller) {
    return <ThemedText type="caption" style={{ color: theme.textSecondary }}>{i18n.t("seller_info_unavailable")}</ThemedText>;
  }

  return (
    <>
      {seller.businessName && (
        <View style={styles.infoRow}>
          <Feather name="briefcase" size={18} color={theme.textSecondary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {i18n.t("business_name")}
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
              {i18n.t("business_address")}
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
              {i18n.t("business_phone")}
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
      Alert.alert(i18n.t("error"), i18n.t("fail_load_order_details"));
    } finally {
      setLoading(false);
    }
  };

  const updateOrderTracking = async (status: OrderTrackingStatus) => {
    if (!order || !user) return;

    try {
      await firebaseService.updateOrderTracking(order.id, status);
      Alert.alert(i18n.t("success"), i18n.t("status_updated"));
      loadOrder();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("failed_to_update"));
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order || !user) return;

    Alert.alert(
      i18n.t("confirm_receipt_title"),
      i18n.t("confirm_receipt_body"),
      [
        { text: i18n.t("no_open_dispute_button"), onPress: () => setShowDisputeModal(true) },
        {
          text: i18n.t("yes_confirm_button"),
          onPress: async () => {
            try {
              await firebaseService.confirmOrderDelivery(order.id, user.uid);
              Alert.alert(i18n.t("success"), i18n.t("order_confirmed_payment_released"));
              loadOrder();
            } catch (error: any) {
              Alert.alert(i18n.t("error"), error.message);
            }
          },
        },
      ]
    );
  };

  const handleCancelOrder = async () => {
    if (!order || !user) return;
    if (!cancelReason.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("cancel_reason_details_error"));
      return;
    }

    try {
      const isBuyer = user.uid === order.buyerId;
      
      if (isBuyer) {
        await firebaseService.cancelOrderByBuyer(order.id, user.uid, cancelReason);
        Alert.alert(i18n.t("success"), i18n.t("order_cancelled_buyer_refunded"));
      } else {
        await firebaseService.cancelOrderBySeller(order.id, user.uid, cancelReason);
        Alert.alert(i18n.t("success"), i18n.t("order_cancelled_seller_refunded"));
      }
      
      setShowCancelModal(false);
      setCancelReason("");
      loadOrder();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message);
    }
  };

  const handleOpenDispute = async () => {
    if (!order || !user) return;
    if (!disputeDetails.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("describe_issue_placeholder"));
      return;
    }

    try {
      await firebaseService.openDispute(order.id, user.uid, disputeDetails);
      Alert.alert(i18n.t("success"), i18n.t("dispute_open_admin_review"));
      setShowDisputeModal(false);
      setDisputeDetails("");
      loadOrder();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message);
    }
  };

  const getTrackingSteps = () => {
    const steps = [
      { key: "acknowledged", label: i18n.t("acknowledged"), icon: "check-circle" },
      { key: "enroute", label: i18n.t("enroute"), icon: "truck" },
      { key: "ready_for_pickup", label: i18n.t("ready_for_pickup"), icon: "package" },
      { key: "delivered_status", label: i18n.t("delivered_status"), icon: "home" },
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
    if (!order || !user) return i18n.t("cancel_order");
    return i18n.t("cancel_order");
  };

  // Get delivery timeframe based on locations
  const getDeliveryTimeframeInfo = () => {
    if (!order || !user || !seller) {
      return i18n.t("delivery_timeframe_unconfirmed");
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
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ThemedText>{i18n.t("loading_order_details")}</ThemedText>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Feather name="alert-circle" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
          {i18n.t("order_not_found")}
        </ThemedText>
      </View>
    );
  }

  const isBuyer = user?.uid === order.buyerId;
  const isSeller = user?.uid === order.sellerId;
  const isAdmin = user?.role === "admin";
  const deliveryInfo = getDeliveryTimeframeInfo();
  const orderStatusKey = order.status; // 'running', 'delivered', or 'cancelled'

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
            <ThemedText type="h2">{i18n.t("order")} #{order.id.slice(-6)}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              {i18n.t("order_placed_on", {
                  date: new Date(order.createdAt).toLocaleDateString(),
                  time: new Date(order.createdAt).toLocaleTimeString(),
              })}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
              {i18n.t(orderStatusKey).toUpperCase()}
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
                {i18n.t("estimated_delivery")}: {deliveryInfo.text}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {deliveryInfo.description}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.warning, marginTop: 8, fontStyle: "italic" }}>
                {i18n.t("dispute_refund_warning")}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Order Tracking */}
        {order.status === "running" && (
          <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
              {i18n.t("order_tracking_title")}
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
                      {i18n.t("current_status")}
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
              {i18n.t("status_updated")}
            </ThemedText>

            <View style={styles.trackingButtons}>
              {!order.trackingStatus && (
                <PrimaryButton
                  title={i18n.t("acknowledge_order_button")}
                  onPress={() => updateOrderTracking("acknowledged")}
                  style={styles.trackingBtn}
                />
              )}

              {order.trackingStatus === "acknowledged" && (
                <PrimaryButton
                  title={i18n.t("mark_as_en_route_button")}
                  onPress={() => updateOrderTracking("enroute")}
                  style={styles.trackingBtn}
                />
              )}

              {order.trackingStatus === "enroute" && (
                <PrimaryButton
                  title={i18n.t("ready_for_pickup_button")}
                  onPress={() => updateOrderTracking("ready_for_pickup")}
                  style={styles.trackingBtn}
                />
              )}
            </View>
          </View>
        )}

        {/* Products and Prescriptions */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            {i18n.t("order_items_title")}
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
                    {i18n.t("quantity_label")}: {item.quantity} × ₦{item.price.toFixed(2)}
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
            {i18n.t("seller_info_title")}
          </ThemedText>
          <SellerInfo sellerId={order.sellerId} />
        </View>

        {/* Delivery Info */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
            {i18n.t("delivery_info_title")}
          </ThemedText>

          <View style={styles.infoRow}>
            <Feather name="map-pin" size={18} color={theme.textSecondary} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {i18n.t("delivery_address")}
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
                  {i18n.t("phone_number")}
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
            {i18n.t("payment_summary_title")}
          </ThemedText>

          <View style={styles.summaryRow}>
            <ThemedText>{i18n.t("subtotal")}</ThemedText>
            <ThemedText>₦{order.totalAmount.toFixed(2)}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText>{i18n.t("platform_fee")}</ThemedText>
            <ThemedText>₦{order.commission.toFixed(2)}</ThemedText>
          </View>

          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: theme.border }]}>
            <ThemedText type="h3">{i18n.t("total")}</ThemedText>
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
                {i18n.t("dispute_is_open")}
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
              <PrimaryButton title={i18n.t("confirm_delivery_button")} onPress={handleConfirmDelivery} />
            )}

          {/* Buyer Cancel Order - Only before acknowledgment */}
          {isBuyer &&
            order.status === "running" &&
            !order.trackingStatus && (
              <PrimaryButton
                title={i18n.t("cancel_order")}
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
                title={i18n.t("open_dispute_title")}
                onPress={() => setShowDisputeModal(true)}
                variant="outlined"
                style={{ marginTop: Spacing.sm, gap: 5, }}
              />
            )}

          {/* Admin, Buyer, Seller View Dispute */}
          {(isBuyer || isSeller || isAdmin) &&
            order.disputeStatus === "open" && (
              <PrimaryButton
                title={i18n.t("view_dispute_chat")}
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
                title={i18n.t("cancel_order")}
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
              placeholder={i18n.t("dispute_reason_placeholder")}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
            />

            <PrimaryButton
              title={i18n.t("confirm_cancellation_button")}
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
              <ThemedText type="h3">{i18n.t("open_dispute_title")}</ThemedText>
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
              placeholder={i18n.t("describe_issue_placeholder")}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={6}
            />

            <PrimaryButton
              title={i18n.t("submit_dispute_button")}
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
    flex: 1 ,
    paddingTop: 100,
  },
  scrollContent: {
    paddingTop: Spacing.md,
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
    gap:10,
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