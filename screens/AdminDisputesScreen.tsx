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
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { firebaseService, DisputeMessage, Order } from "../services/firebaseService";
import { ThemedText } from "../components/ThemedText";
import { auth } from "../lib/firebase";

export default function AdminDisputeScreen() {
  const route = useRoute();
  const { orderId } = route.params as { orderId: string };

  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  const flatListRef = useRef<FlatList<DisputeMessage>>(null);

  // Listen for live chat messages
  useEffect(() => {
    const unsub = firebaseService.listenToDisputeMessages(orderId, (msgs) => {
      setMessages(msgs);

      // Auto-scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return unsub;
  }, [orderId]);

  // Load order details
  useEffect(() => {
    const loadOrder = async () => {
      const o = await firebaseService.getOrder(orderId);
      setOrder(o);
    };
    loadOrder();
  }, [orderId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const adminId = auth.currentUser?.uid;
    if (!adminId) return;

    await firebaseService.sendDisputeMessage(orderId, adminId, "admin", newMessage);
    setNewMessage("");
  };

  const resolveDispute = (resolution: "refund_buyer" | "release_to_seller") => {
    if (!order) return;

    Alert.alert(
      "Resolve Dispute",
      resolution === "refund_buyer"
        ? "Refund payment to the buyer?"
        : "Release payment to the seller?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              const adminId = auth.currentUser?.uid;
              if (!adminId) return;

              await firebaseService.resolveDispute(orderId, adminId, resolution, "Resolved via chat screen");
              Alert.alert("Success", "Dispute resolved successfully");
              const updatedOrder = await firebaseService.getOrder(orderId);
              setOrder(updatedOrder);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to resolve dispute");
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: DisputeMessage }) => {
    const isAdmin = item.senderRole === "admin";

    return (
      <View
        style={[
          styles.messageContainer,
          isAdmin ? styles.adminContainer : styles.userContainer,
        ]}
      >
        <View style={[styles.bubble, isAdmin ? styles.adminBubble : styles.userBubble]}>
          <ThemedText style={isAdmin ? styles.adminText : styles.userText}>
            {item.message}
          </ThemedText>
          <ThemedText style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 15, paddingBottom: 80 }}
      />

      {order?.disputeStatus === "open" && (
        <View style={styles.resolutionButtons}>
          <Pressable
            style={[styles.resolveBtn, { backgroundColor: "#dc3545" }]}
            onPress={() => resolveDispute("refund_buyer")}
          >
            <ThemedText style={{ color: "white" }}>Refund Buyer</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.resolveBtn, { backgroundColor: "#28a745" }]}
            onPress={() => resolveDispute("release_to_seller")}
          >
            <ThemedText style={{ color: "white" }}>Release to Seller</ThemedText>
          </Pressable>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <Pressable style={styles.sendBtn} onPress={sendMessage}>
          <ThemedText style={{ color: "white" }}>Send</ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 5,
    flexDirection: "row",
    maxWidth: "80%",
  },
  adminContainer: {
    alignSelf: "flex-end",
  },
  userContainer: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: 15,
    padding: 10,
  },
  adminBubble: {
    backgroundColor: "#007bff",
  },
  userBubble: {
    backgroundColor: "#f1f1f1",
  },
  adminText: {
    color: "white",
  },
  userText: {
    color: "black",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 3,
    opacity: 0.6,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: "#007bff",
    borderRadius: 25,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  resolutionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 10,
    marginBottom: 60,
  },
  resolveBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 25,
    marginHorizontal: 5,
    alignItems: "center",
  },
});
