// Update the getDeliveryTimeframe function in OrdersScreen.tsx

import { View, StyleSheet, Pressable, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { OrderCard } from "../components/OrderCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Order, User } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { getDeliveryIcon, calculateDeliveryTimeframe } from "../utils/locationUtils";
// --- ASSUMED I18N IMPORT ---
import i18n from '@/lib/i18n'; 
// ---------------------------

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OrderStatus = "running" | "delivered" | "cancelled";

export default function OrdersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("running");
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellers, setSellers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Dispute modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeDetails, setDisputeDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin dispute modal
  const [showAdminDisputeModal, setShowAdminDisputeModal] = useState(false);
  const [adminDecision, setAdminDecision] = useState<"refund" | "release" | "none">("none");

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadOrders();
    } else {
      setLoading(false);
    }
  }, [user, selectedStatus]);

  const loadOrders = async () => {
    if (!user) return;
    try {
      const data = await firebaseService.getOrders(user.uid, user.role);
      const filtered = data.filter(order => order.status === selectedStatus);
      setOrders(filtered);

      // Load all sellers for location comparison
      const users = await firebaseService.getAllUsers();
      const sellersMap = new Map<string, User>();
      users.forEach(u => {
        if (u.role === "seller") {
          sellersMap.set(u.uid, u);
        }
      });
      setSellers(sellersMap);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetails = (order: Order) => {
    navigation.navigate("OrderDetailScreen", { orderId: order.id });
  };

  const handleConfirmReceipt = (order: Order) => {
  Alert.alert(
    i18n.t("confirm_receipt_title"),
    i18n.t("confirm_receipt_body"),
    [
      {
        text: i18n.t("cancel"),
        style: "cancel", 
        onPress: () => console.log("Confirmation cancelled"),
      },
      {
        text: i18n.t("no_report_issue"),
        style: "default",
        onPress: () => openDisputeModal(order),
      },
      {
        text: i18n.t("yes_all_good"),
        style: "destructive", 
        onPress: async () => {
          try {
            await firebaseService.confirmOrderDelivery(order.id, user!.uid);
            Alert.alert(i18n.t("success"), i18n.t("payment_released"));
            loadOrders();
          } catch (error: any) {
            Alert.alert(i18n.t("error"), error.message || i18n.t("fail_confirm_delivery"));
          }
        },
      },
    ],
    { 
      cancelable: true, 
      onDismiss: () => console.log("Alert dismissed"),
    }
  );
};

  const handleSellerCancel = (order: Order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const handleBuyerCancel = (order: Order) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!selectedOrder || !user) return;
    if (!cancelReason.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("provide_reason_error"));
      return;
    }
    
    try {
      const isBuyer = user.uid === selectedOrder.buyerId;
      
      if (isBuyer) {
        await firebaseService.cancelOrderByBuyer(selectedOrder.id, user.uid, cancelReason);
        Alert.alert(i18n.t("success"), i18n.t("order_cancelled_buyer_refunded"));
      } else {
        await firebaseService.cancelOrderBySeller(selectedOrder.id, user.uid, cancelReason);
        Alert.alert(i18n.t("success"), i18n.t("order_cancelled_seller_refunded"));
      }
      
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("fail_cancel_order"));
    }
  };

  const openDisputeModal = (order: Order) => {
    setSelectedOrder(order);
    setShowDisputeModal(true);
  };

  const submitDispute = async () => {
    if (!selectedOrder || !user) return;
    if (!disputeDetails.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("describe_issue_prompt"));
      return;
    }
    try {
      setSubmitting(true);
      await firebaseService.openDispute(selectedOrder.id, user.uid, disputeDetails);
      Alert.alert(i18n.t("dispute_open_title"), i18n.t("dispute_submitted_success"));
      setShowDisputeModal(false);
      setDisputeDetails("");
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("fail_open_dispute"));
    } finally {
      setSubmitting(false);
    }
  };

  const openAdminDisputeModal = (order: Order) => {
    setSelectedOrder(order);
    setShowAdminDisputeModal(true);
  };

  const resolveDispute = async () => {
    if (!selectedOrder || !user) return;
    if (adminDecision === "none") {
      Alert.alert(i18n.t("error"), i18n.t("fail_select_action"));
      return;
    }

    const resolution = adminDecision === "refund" ? "refund_buyer" : "release_to_seller";
    
    try {
      await firebaseService.resolveDispute(selectedOrder.id, user.uid, resolution);
      Alert.alert(i18n.t("success"), i18n.t("dispute_resolved_success"));
      setShowAdminDisputeModal(false);
      setAdminDecision("none");
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("fail_resolve_dispute"));
    }
  };

  const handleOpenDisputeChat = (order: Order) => {
    navigation.navigate("DisputeChatScreen", { orderId: order.id });
  };

  const contactSupport = () => {
    Alert.alert(
      i18n.t("contact_support_title"),
      i18n.t("contact_support_body"),
      [
        { text: i18n.t("cancel"), style: "cancel" },
        { text: i18n.t("email_button"), onPress: () => Alert.alert(i18n.t("email_button"), "support@markethub.com") },
        { text: i18n.t("chat_button"), onPress: () => Alert.alert(i18n.t("chat_button"), i18n.t("chat_coming_soon")) }
      ]
    );
  };

  // Updated function using location utilities
  const getDeliveryTimeframeInfo = (order: Order) => {
    if (!user) return { text: i18n.t("delivery_timeframe_unconfirmed"), icon: "package" };
    
    const seller = sellers.get(order.sellerId);
    if (!seller) return { text: i18n.t("delivery_timeframe_unconfirmed"), icon: "package" };

    const timeframe = calculateDeliveryTimeframe(user.location, seller.location);
    const icon = getDeliveryIcon(user.location, seller.location);
    
    return {
      text: `${timeframe.min} - ${timeframe.max}`,
      description: timeframe.description,
      icon,
      zone: timeframe.zone,
    };
  };

  const getCancelModalTitle = () => {
    if (!selectedOrder || !user) return i18n.t("cancel_order");
    return i18n.t("cancel_order");
  };

  const renderTab = (status: OrderStatus, labelKey: string) => {
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
          style={{ color: isSelected ? theme.buttonText : theme.textSecondary }}
        >
          {i18n.t(labelKey)}
        </ThemedText>
      </Pressable>
    );
  };

  const renderOrderActions = (order: Order) => {
    const isBuyer = user?.uid === order.buyerId;
    const isSeller = user?.uid === order.sellerId;
    const isAdmin = user?.role === "admin";

    if (order.status === "running") {
      const deliveryInfo = getDeliveryTimeframeInfo(order);
      
      return (
        <View style={styles.actionsContainer}>
          {isBuyer && (
            <PrimaryButton
              title={i18n.t("confirm_received_button")}
              onPress={() => handleConfirmReceipt(order)}
              style={styles.actionButton}
            />
          )}
          
          {(isSeller || (isBuyer && !order.trackingStatus)) && (
            <PrimaryButton
              title={i18n.t("cancel_order")}
              onPress={() => (isSeller ? handleSellerCancel(order) : handleBuyerCancel(order))}
              variant="outlined"
              style={styles.actionButton}
            />
          )}
          
          {/* Updated Delivery Notice with dynamic location-based timeframe */}
          <View style={[
            styles.deliveryNotice, 
            { 
              backgroundColor: deliveryInfo.zone === "same_area" || deliveryInfo.zone === "same_city"
                ? theme.success + "10"
                : theme.backgroundSecondary 
            }
          ]}>
            <Feather 
              name={deliveryInfo.icon as any} 
              size={16} 
              color={deliveryInfo.zone === "same_area" || deliveryInfo.zone === "same_city" ? theme.success : theme.primary} 
            />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText type="caption" style={{ fontWeight: "600" }}>
                {i18n.t("expected_delivery")}: {deliveryInfo.text}
              </ThemedText>
              {deliveryInfo.description && (
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {deliveryInfo.description}
                </ThemedText>
              )}
              <ThemedText type="caption" style={{ color: theme.warning, marginTop: 4, fontStyle: "italic" }}>
                {i18n.t("dispute_time_warning")}
              </ThemedText>
            </View>
          </View>

          {(isBuyer || isSeller) && (
            <Pressable
              style={[styles.disputeButton, { borderColor: theme.warning }]}
              onPress={() => openDisputeModal(order)}
            >
              <Feather name="alert-circle" size={16} color={theme.warning} />
              <ThemedText style={{ marginLeft: 6, color: theme.warning }}>
                {isBuyer ? i18n.t("report_issue_dispute_buyer") : i18n.t("open_dispute_seller")}
              </ThemedText>
            </Pressable>
          )}
        </View>
      );
    }

    if (order.disputeStatus === "open") {
      if (isAdmin) {
        return (
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              title={i18n.t("resolve_dispute_button")}
              onPress={() => openAdminDisputeModal(order)}
            />
            <PrimaryButton
              title={i18n.t("open_dispute_chat")}
              onPress={() => handleOpenDisputeChat(order)}
              variant="outlined"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        );
      } else {
        return (
          <View style={{ marginTop: 10 }}>
            <PrimaryButton
              title={i18n.t("view_dispute_chat")}
              onPress={() => handleOpenDisputeChat(order)}
            />
            <View style={[styles.disputeNotice, { marginTop: Spacing.sm }]}>
              <Feather name="message-circle" size={16} color={theme.warning} />
              <ThemedText type="caption" style={{ marginLeft: Spacing.sm, color: theme.warning }}>
                {i18n.t("dispute_open_notice")}
              </ThemedText>
            </View>
          </View>
        );
      }
    }

    return null;
  };

  const renderOrderCard = (order: Order) => (
    <View
      key={order.id}
      style={[styles.orderCardContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
    >
      <Pressable onPress={() => handleViewOrderDetails(order)}>
        <OrderCard order={order} onPress={() => handleViewOrderDetails(order)} />
      </Pressable>
      {renderOrderActions(order)}
      
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="package" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        {i18n.t("no_status_orders", { status: i18n.t(selectedStatus) })}
      </ThemedText>
      <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
        {i18n.t("status_orders_appear_here", { status: i18n.t(selectedStatus) })}
      </ThemedText>
    </View>
  );

  if (!user) {
    return (
      <ScreenScrollView>
        <View style={styles.empty}>
          <Feather name="log-in" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
            {i18n.t("please_sign_in_title")}
          </ThemedText>
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
            {i18n.t("sign_in_view_orders")}
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <>
      <ScreenScrollView>
        <View style={styles.tabContainer}>
          {renderTab("running", "running")}
          {renderTab("delivered", "delivered")}
          {renderTab("cancelled", "cancelled")}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {i18n.t("loading_orders")}
            </ThemedText>
          </View>
        ) : orders.length === 0 ? (
          renderEmpty()
        ) : (
          <View style={styles.list}>
            {orders.map(renderOrderCard)}
          </View>
        )}
      </ScreenScrollView>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="slide" onRequestClose={() => setShowCancelModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">{getCancelModalTitle()}</ThemedText>
                <Pressable onPress={() => setShowCancelModal(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ThemedText style={{ marginBottom: Spacing.md, color: theme.textSecondary }}>
                {i18n.t("cancel_reason_prompt")}
              </ThemedText>

              <TextInput
                style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundSecondary }]}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder={i18n.t("cancel_reason_placeholder")}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
              />

              <PrimaryButton title={i18n.t("confirm_cancellation_button")} onPress={confirmCancel} style={{ marginTop: Spacing.md }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dispute Modal */}
      <Modal visible={showDisputeModal} transparent animationType="slide" onRequestClose={() => setShowDisputeModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 80}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">{i18n.t("open_dispute_title")}</ThemedText>
                <Pressable onPress={() => setShowDisputeModal(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ThemedText style={{ marginBottom: Spacing.md, color: theme.textSecondary }}>
                {i18n.t("describe_issue_prompt")}
              </ThemedText>

              <TextInput
                style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundSecondary }]}
                value={disputeDetails}
                onChangeText={setDisputeDetails}
                placeholder={i18n.t("dispute_placeholder")}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
              />

              <PrimaryButton title={i18n.t("submit_dispute_button")} onPress={submitDispute} disabled={submitting} style={{ marginTop: Spacing.md }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Admin Dispute Modal */}
      <Modal visible={showAdminDisputeModal} transparent animationType="slide" onRequestClose={() => setShowAdminDisputeModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 80}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">{i18n.t("resolve_dispute_admin_title")}</ThemedText>
                <Pressable onPress={() => setShowAdminDisputeModal(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ThemedText style={{ marginBottom: Spacing.md, color: theme.textSecondary }}>
                {i18n.t("select_action_prompt")}
              </ThemedText>

              <Pressable
                style={[
                  styles.adminActionButton,
                  { backgroundColor: adminDecision === "refund" ? theme.warning : theme.backgroundSecondary }
                ]}
                onPress={() => setAdminDecision("refund")}
              >
                <ThemedText style={{ color: adminDecision === "refund" ? "#fff" : theme.text }}>{i18n.t("refund_buyer")}</ThemedText>
              </Pressable>

              <Pressable
                style={[
                  styles.adminActionButton,
                  { backgroundColor: adminDecision === "release" ? theme.success : theme.backgroundSecondary, marginTop: Spacing.sm }
                ]}
                onPress={() => setAdminDecision("release")}
              >
                <ThemedText style={{ color: adminDecision === "release" ? "#fff" : theme.text }}>{i18n.t("release_to_seller")}</ThemedText>
              </Pressable>

              <PrimaryButton title={i18n.t("confirm")} onPress={resolveDispute} style={{ marginTop: Spacing.md }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Floating Support Button */}
      <Pressable style={[styles.supportButton, { backgroundColor: theme.primary }]} onPress={contactSupport}>
        <Feather name="headphones" size={24} color="#fff" />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  tabContainer: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  tab: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, alignItems: "center" },
  list: { marginTop: Spacing.md, paddingBottom: 80 },
  orderCardContainer: { borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.lg, overflow: "hidden" },
  actionsContainer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: "#e5e5e5", gap:10 },
  actionButton: { marginBottom: 0, padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  disputeButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.sm },
  deliveryNotice: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm },
  disputeNotice: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderTopWidth: 1, borderTopColor: "#e5e5e5" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing["5xl"] },
  loading: { alignItems: "center", paddingVertical: Spacing["5xl"] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.xl, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  textArea: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, minHeight: 100, textAlignVertical: "top" },
  adminActionButton: { padding: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  supportButton: { position: "absolute", right: Spacing.lg, bottom: 100, width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
});