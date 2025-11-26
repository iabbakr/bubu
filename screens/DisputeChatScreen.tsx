// screens/DisputeChatScreen.tsx
import { useEffect, useState, useRef } from "react";
import {
  View,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { firebaseService, DisputeMessage, Order } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { ThemedText } from "../components/ThemedText";
import { Spacing, BorderRadius } from "../constants/theme";

type RouteParams = {
  orderId: string;
};

export default function DisputeChatScreen() {
  // safer route param read (guard against undefined params)
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const orderId = (route.params as RouteParams | undefined)?.orderId;

  const { user } = useAuth();
  const { theme } = useTheme();

  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);

  const flatListRef = useRef<FlatList<DisputeMessage> | null>(null);

  // helper: safely convert various timestamp shapes to JS Date
  const toDate = (ts: any) => {
    if (!ts) return null;
    // Firestore Timestamp has toDate()
    if (typeof ts?.toDate === "function") return ts.toDate();
    // If it's seconds/nanoseconds
    if (typeof ts === "object" && typeof ts.seconds === "number") {
      return new Date(ts.seconds * 1000);
    }
    // number (ms)
    if (typeof ts === "number") return new Date(ts);
    // ISO string
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  };

  // Listen for live chat messages
  useEffect(() => {
    if (!orderId) return;

    const unsub = firebaseService.listenToDisputeMessages(orderId, (msgs) => {
      // ensure msgs is an array and sort by timestamp (defensive)
      const safeMsgs = Array.isArray(msgs) ? msgs.slice() : [];
      safeMsgs.sort((a, b) => {
        const da = toDate(a.timestamp)?.getTime() ?? 0;
        const db = toDate(b.timestamp)?.getTime() ?? 0;
        return da - db;
      });

      setMessages(safeMsgs);

      // Auto-scroll to bottom after messages set (guard: only when there are messages)
      if (safeMsgs.length > 0) {
        // small delay to let FlatList render
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToEnd?.({ animated: true });
          } catch (e) {
            // fallback: scroll to last index
            flatListRef.current?.scrollToIndex?.({ index: safeMsgs.length - 1, animated: true });
          }
        }, 100);
      }
    });

    return () => {
      unsub?.();
    };
  }, [orderId]);

  // Load order details
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return;
      setLoadingOrder(true);
      try {
        const orderData = await firebaseService.getOrder(orderId);
        setOrder(orderData);
      } catch (err) {
        console.error("Error loading order:", err);
      } finally {
        setLoadingOrder(false);
      }
    };
    loadOrder();
  }, [orderId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !orderId) return;

    setSending(true);
    try {
      await firebaseService.sendDisputeMessage(
        orderId,
        user.uid,
        user.role as "buyer" | "seller" | "admin",
        newMessage.trim()
      );
      setNewMessage("");
      // optimistic UI: scroll after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd?.({ animated: true });
      }, 80);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const resolveDispute = (resolution: "refund_buyer" | "release_to_seller") => {
    if (!order || !user || user.role !== "admin") return;

    const resolutionText = resolution === "refund_buyer"
      ? "Refund payment to the buyer?"
      : "Release payment to the seller?";

    Alert.alert(
      "Resolve Dispute",
      resolutionText,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await firebaseService.resolveDispute(
                orderId!,
                user.uid,
                resolution,
                "Resolved via dispute chat"
              );
              Alert.alert("Success", "Dispute resolved successfully");

              // Refresh order status
              const updatedOrder = await firebaseService.getOrder(orderId!);
              setOrder(updatedOrder);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to resolve dispute");
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return theme.error;
      case "seller": return theme.warning;
      case "buyer": return theme.primary;
      default: return theme.textSecondary;
    }
  };

  const getRoleBadge = (role: string) => {
    const color = getRoleColor(role);
    return (
      <View style={[styles.roleBadge, { backgroundColor: `${color}20` }]}>
        <ThemedText type="caption" style={{ color, fontWeight: "600" }}>
          {role.toUpperCase()}
        </ThemedText>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: DisputeMessage }) => {
    const isCurrentUser = item.senderId === user?.uid;
    const isAdmin = item.senderRole === "admin";
    const date = toDate(item.timestamp);
    const timeLabel = date
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isCurrentUser
                ? theme.primary
                : isAdmin
                  ? `${theme.error}20`
                  : theme.backgroundSecondary,
            },
          ]}
        >
          {!isCurrentUser && getRoleBadge(item.senderRole)}

          <ThemedText
            style={{
              color: isCurrentUser ? "#fff" : theme.text,
              marginTop: !isCurrentUser ? Spacing.xs : 0,
            }}
          >
            {item.message}
          </ThemedText>

          <ThemedText
            type="caption"
            style={{
              color: isCurrentUser ? "#ffffff90" : theme.textSecondary,
              marginTop: Spacing.xs,
              alignSelf: "flex-end",
            }}
          >
            {timeLabel}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.headerInfo, { backgroundColor: theme.backgroundSecondary }]}>
      <Feather name="alert-circle" size={20} color={theme.warning} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <ThemedText weight="bold">Order #{order?.id?.slice(-6) ?? "—"}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
          Dispute Status: {order?.disputeStatus?.toUpperCase() ?? "N/A"}
        </ThemedText>
      </View>
    </View>
  );

  // Wait for user and order to be loaded before showing UI
  if (!user || loadingOrder || !order) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ThemedText>Loading dispute chat...</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Admin Resolution Buttons - Only visible to admin if dispute is open */}
      {user.role === "admin" && order.disputeStatus === "open" && (
        <View style={[styles.resolutionButtons, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <Pressable
            style={[styles.resolveBtn, { backgroundColor: theme.error }]}
            onPress={() => resolveDispute("refund_buyer")}
          >
            <Feather name="corner-down-left" size={16} color="#fff" />
            <ThemedText style={{ color: "#fff", marginLeft: Spacing.xs, fontWeight: "600" }}>
              Refund Buyer
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.resolveBtn, { backgroundColor: theme.success }]}
            onPress={() => resolveDispute("release_to_seller")}
          >
            <Feather name="check-circle" size={16} color="#fff" />
            <ThemedText style={{ color: "#fff", marginLeft: Spacing.xs, fontWeight: "600" }}>
              Release to Seller
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id ?? String(toDate(item.timestamp)?.getTime() ?? Math.random())}
        renderItem={renderMessage}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd?.({ animated: true });
          }
        }}
        keyboardShouldPersistTaps="handled"
      />

      {/* Dispute Resolved Notice */}
      {order.disputeStatus === "resolved" && (
        <View style={[styles.resolvedNotice, { backgroundColor: `${theme.success}20`, borderColor: theme.success }]}>
          <Feather name="check-circle" size={20} color={theme.success} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText weight="bold" style={{ color: theme.success }}>
              Dispute Resolved
            </ThemedText>
            {order.adminNotes && (
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {order.adminNotes}
              </ThemedText>
            )}
          </View>
        </View>
      )}

      {/* Input Container - Only show if dispute is still open */}
      {order.disputeStatus === "open" && (
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={theme.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor: newMessage.trim() ? theme.primary : theme.backgroundSecondary,
              },
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Text style={{ color: "#fff" }}>...</Text>
            ) : (
              <Feather name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  messageContainer: {
    marginVertical: Spacing.xs,
    maxWidth: "80%",
  },
  myMessage: {
    alignSelf: "flex-end",
  },
  theirMessage: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minWidth: 100,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    padding: Spacing.md,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  resolutionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  resolveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
  },
  resolvedNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
