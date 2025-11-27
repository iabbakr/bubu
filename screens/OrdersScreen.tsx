import { View, StyleSheet, Pressable, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { OrderCard } from "../components/OrderCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Order } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type OrderStatus = "running" | "delivered" | "cancelled";

export default function OrdersScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("running");
  const [orders, setOrders] = useState<Order[]>([]);
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
      "Confirm Receipt",
      "Have you received all items in good condition?",
      [
        { text: "No, Open Dispute", onPress: () => openDisputeModal(order) },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            try {
              await firebaseService.confirmOrderDelivery(order.id, user!.uid);
              Alert.alert("Success", "Order marked as delivered. Payment released to seller.");
              loadOrders();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to confirm delivery");
            }
          }
        },
      ]
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
      Alert.alert("Error", "Please provide a reason for cancellation");
      return;
    }
    
    try {
      const isBuyer = user.uid === selectedOrder.buyerId;
      
      if (isBuyer) {
        await firebaseService.cancelOrderByBuyer(selectedOrder.id, user.uid, cancelReason);
        Alert.alert("Success", "Order cancelled. You have been refunded.");
      } else {
        await firebaseService.cancelOrderBySeller(selectedOrder.id, user.uid, cancelReason);
        Alert.alert("Success", "Order cancelled. Buyer has been refunded.");
      }
      
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to cancel order");
    }
  };

  const openDisputeModal = (order: Order) => {
    setSelectedOrder(order);
    setShowDisputeModal(true);
  };

  const submitDispute = async () => {
    if (!selectedOrder || !user) return;
    if (!disputeDetails.trim()) {
      Alert.alert("Error", "Please describe the issue");
      return;
    }
    try {
      setSubmitting(true);
      await firebaseService.openDispute(selectedOrder.id, user.uid, disputeDetails);
      Alert.alert("Dispute Opened", "Your dispute has been submitted. An admin will review it shortly.");
      setShowDisputeModal(false);
      setDisputeDetails("");
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to open dispute");
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
      Alert.alert("Error", "Please select an action");
      return;
    }

    const resolution = adminDecision === "refund" ? "refund_buyer" : "release_to_seller";
    
    try {
      await firebaseService.resolveDispute(selectedOrder.id, user.uid, resolution);
      Alert.alert("Success", "Dispute resolved successfully");
      setShowAdminDisputeModal(false);
      setAdminDecision("none");
      setSelectedOrder(null);
      loadOrders();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to resolve dispute");
    }
  };

  const handleOpenDisputeChat = (order: Order) => {
    navigation.navigate("DisputeChatScreen", { orderId: order.id });
  };

  const contactSupport = () => {
    Alert.alert(
      "Contact Support",
      "How would you like to contact support?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Email", onPress: () => Alert.alert("Email", "support@markethub.com") },
        { text: "Chat", onPress: () => Alert.alert("Chat", "Chat feature coming soon") }
      ]
    );
  };

  const getDeliveryTimeframe = (order: Order) => {
    if (!order.location) return "Delivery timeframe to be confirmed";
    
    // Assume current user location is same state/city for demo
    const sameCity = true; // You would check order.location.city against user location
    const sameState = true; // You would check order.location.state against user location
    
    if (sameCity) {
      return "3-6 hours (max 8 hours) - Within city";
    } else if (sameState) {
      return "24 hours (max 48 hours) - Within state";
    } else {
      return "24 hours to 5 days - Interstate delivery";
    }
  };

  const getCancelModalTitle = () => {
    if (!selectedOrder || !user) return "Cancel Order";
    const isBuyer = user.uid === selectedOrder.buyerId;
    return isBuyer ? "Cancel Order" : "Cancel Order";
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
          style={{ color: isSelected ? theme.buttonText : theme.textSecondary }}
        >
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  const renderOrderActions = (order: Order) => {
    const isBuyer = user?.uid === order.buyerId;
    const isSeller = user?.uid === order.sellerId;
    const isAdmin = user?.role === "admin";

    if (order.status === "running") {
      return (
        <View style={styles.actionsContainer}>
          {isBuyer && (
            <PrimaryButton
              title="Confirm Received ✓"
              onPress={() => handleConfirmReceipt(order)}
              style={styles.actionButton}
            />
          )}
          
          {isSeller && (
            <PrimaryButton
              title="Cancel Order"
              onPress={() => handleSellerCancel(order)}
              variant="outlined"
              style={styles.actionButton}
            />
          )}

          {/* Buyer Cancel Button - Only show before acknowledgment */}
          {isBuyer && !order.trackingStatus && (
            <PrimaryButton
              title="Cancel Order"
              onPress={() => handleBuyerCancel(order)}
              variant="outlined"
              style={styles.actionButton}
            />
          )}
          
          {/* Delivery Terms Notice */}
          <View style={[styles.deliveryNotice, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="clock" size={16} color={theme.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText type="caption" style={{ fontWeight: "600" }}>
                Expected Delivery: {getDeliveryTimeframe(order)}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                If not delivered within stated time, open a dispute for refund. T&C apply.
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
                {isBuyer ? "Report Issue / Open Dispute" : "Open Dispute If Delivered"}
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
              title="Resolve Dispute (Admin)"
              onPress={() => openAdminDisputeModal(order)}
            />
            <PrimaryButton
              title="Open Dispute Chat"
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
              title="View Dispute Chat"
              onPress={() => handleOpenDisputeChat(order)}
            />
            <View style={[styles.disputeNotice, { marginTop: Spacing.sm }]}>
              <Feather name="message-circle" size={16} color={theme.warning} />
              <ThemedText type="caption" style={{ marginLeft: Spacing.sm, color: theme.warning }}>
                Dispute is open. Chat with admin for resolution.
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
    <>
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
                Please provide a reason for cancellation:
              </ThemedText>

              <TextInput
                style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundSecondary }]}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="e.g., Out of stock, Unable to deliver..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
              />

              <PrimaryButton title="Confirm Cancellation" onPress={confirmCancel} style={{ marginTop: Spacing.md }} />
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
                <ThemedText type="h3">Open Dispute</ThemedText>
                <Pressable onPress={() => setShowDisputeModal(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ThemedText style={{ marginBottom: Spacing.md, color: theme.textSecondary }}>
                Describe the issue with this order:
              </ThemedText>

              <TextInput
                style={[styles.textArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.backgroundSecondary }]}
                value={disputeDetails}
                onChangeText={setDisputeDetails}
                placeholder="e.g., Items not received, damaged goods, wrong items..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={6}
              />

              <PrimaryButton title="Submit Dispute" onPress={submitDispute} disabled={submitting} style={{ marginTop: Spacing.md }} />
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
                <ThemedText type="h3">Resolve Dispute</ThemedText>
                <Pressable onPress={() => setShowAdminDisputeModal(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>

              <ThemedText style={{ marginBottom: Spacing.md, color: theme.textSecondary }}>
                Choose an action for this dispute:
              </ThemedText>

              <Pressable
                style={[
                  styles.adminActionButton,
                  { backgroundColor: adminDecision === "refund" ? theme.warning : theme.backgroundSecondary }
                ]}
                onPress={() => setAdminDecision("refund")}
              >
                <ThemedText style={{ color: adminDecision === "refund" ? "#fff" : theme.text }}>Refund Buyer</ThemedText>
              </Pressable>

              <Pressable
                style={[
                  styles.adminActionButton,
                  { backgroundColor: adminDecision === "release" ? theme.success : theme.backgroundSecondary, marginTop: Spacing.sm }
                ]}
                onPress={() => setAdminDecision("release")}
              >
                <ThemedText style={{ color: adminDecision === "release" ? "#fff" : theme.text }}>Release Payment to Seller</ThemedText>
              </Pressable>

              <PrimaryButton title="Confirm" onPress={resolveDispute} style={{ marginTop: Spacing.md }} />
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
  actionsContainer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: "#e5e5e5" },
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