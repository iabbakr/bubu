// screens/AdminSupportChatScreen.tsx

import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { Feather } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import {
  supportChatService,
  SupportMessage,
  SupportChat,
} from "../services/supportChatService";
import { ProfileStackParamList } from "../navigation/ProfileStackNavigator";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AdminSupportChatRouteProp = RouteProp<ProfileStackParamList, "AdminSupportChat">;

export default function AdminSupportChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const route = useRoute<AdminSupportChatRouteProp>();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets(); // ✅ Get safe area insets

  const { chatId } = route.params;

  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadChat();
  }, [chatId]);

  useEffect(() => {
    if (chat) {
      const unsubscribeMessages = supportChatService.listenToMessages(
        chat.id,
        (newMessages) => {
          setMessages(newMessages);
          // Mark admin messages as read
          supportChatService.markMessagesAsRead(chat.id, user?.uid || "");
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );

      const unsubscribeChat = supportChatService.listenToChat(
        chat.id,
        (updatedChat) => {
          setChat(updatedChat);
        }
      );

      return () => {
        unsubscribeMessages();
        unsubscribeChat();
      };
    }
  }, [chat?.id]);

  const loadChat = async () => {
    try {
      const allChats = await supportChatService.getAllChats();
      const foundChat = allChats.find((c) => c.id === chatId);
      
      if (foundChat) {
        setChat(foundChat);
      } else {
        Alert.alert("Error", "Chat not found");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      Alert.alert("Error", "Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chat || !user || !inputText.trim()) return;

    try {
      setSending(true);
      await supportChatService.sendMessage(
        chat.id,
        user.uid,
        "admin",
        user.name,
        inputText.trim()
      );
      setInputText("");
    } catch (error) {
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleResolveChat = () => {
    if (!chat) return;

    Alert.prompt(
      "Resolve Chat",
      "Add any notes (optional)",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resolve",
          onPress: (notes?: string) => {
          (async () => {
            try {
              await supportChatService.resolveChat(chat.id, notes || "");
              Alert.alert("Success", "Chat resolved successfully", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert("Error", "Failed to resolve chat");
            }
          })();
          },
        }

      ],
      "plain-text"
    );
  };

  const handleTransferChat = () => {
    Alert.alert("Transfer Chat", "This feature requires admin user selection. Coming soon!");
  };

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isAdminMessage = item.senderRole === "admin";

    return (
      <View
        style={[
          styles.messageContainer,
          isAdminMessage ? styles.adminMessage : styles.userMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isAdminMessage ? theme.primary : theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
            <ThemedText
              type="caption"
              weight="medium"
              style={{
                color: isAdminMessage ? "#fff" : theme.primary,
              }}
            >
              {item.senderName}
            </ThemedText>
            {!isAdminMessage && (
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isAdminMessage ? "#fff" : theme.primary + "20",
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: isAdminMessage ? theme.primary : theme.primary,
                    fontSize: 10,
                  }}
                >
                  {item.senderRole}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText
            style={{ color: isAdminMessage ? "#fff" : theme.text }}
          >
            {item.message}
          </ThemedText>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <ThemedText
              type="caption"
              style={{
                color: isAdminMessage ? "#fff" : theme.textSecondary,
                opacity: 0.7,
              }}
            >
              {new Date(item.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </ThemedText>
            {item.isRead && isAdminMessage && (
              <Feather name="check-circle" size={12} color="#fff" style={{ opacity: 0.7 }} />
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: Spacing.md }}>Loading chat...</ThemedText>
      </View>
    );
  }

  if (!chat) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText style={{ marginTop: Spacing.md }}>Chat not found</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { 
            backgroundColor: theme.cardBackground, 
            borderBottomColor: theme.border,
            paddingTop: insets.top > 0 ? insets.top : Spacing.md, // ✅ Add top safe area padding
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ThemedText type="h4">{chat.userName}</ThemedText>
            <View
              style={[
                styles.userRoleBadge,
                { backgroundColor: theme.primary + "20", marginLeft: Spacing.sm },
              ]}
            >
              <ThemedText
                type="caption"
                weight="medium"
                style={{ color: theme.primary }}
              >
                {chat.userRole.toUpperCase()}
              </ThemedText>
            </View>
          </View>
          
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: 2 }}
          >
            {chat.subject}
          </ThemedText>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Feather name="mail" size={12} color={theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginLeft: 4 }}
            >
              {chat.userEmail}
            </ThemedText>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: Spacing.sm }}>
          {chat.status === "active" && (
            <>
              <Pressable
                onPress={handleTransferChat}
                style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
              >
                <Feather name="users" size={18} color={theme.primary} />
              </Pressable>
              <Pressable
                onPress={handleResolveChat}
                style={[styles.actionButton, { backgroundColor: theme.success + "20" }]}
              >
                <Feather name="check" size={18} color={theme.success} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Status Banner */}
      {chat.status === "resolved" && (
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: theme.success + "20", borderColor: theme.success },
          ]}
        >
          <Feather name="check-circle" size={16} color={theme.success} />
          <ThemedText
            type="caption"
            style={{ color: theme.success, marginLeft: Spacing.xs }}
          >
            This chat has been resolved
            {chat.rating && ` • Rated ${chat.rating}/5`}
          </ThemedText>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          { 
            paddingBottom: chat.status === "active" ? 20 : 80 // ✅ Extra padding when input is visible
          }
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Input & Quick Responses Container */}
      {chat.status === "active" && (
        <View style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg}}> 
          {/* Quick Responses */}
          <View
            style={[
              styles.quickResponsesContainer,
              { backgroundColor: theme.cardBackground, borderTopColor: theme.border },
            ]}
          >
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
              Quick Responses:
            </ThemedText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs }}>
              {[
  "Thank you for contacting us!",
  "Please provide more details.",
  "I'll look into this right away.",
  "This issue has been escalated.",
  "Is there anything else I can help with?",
].map((response) => (
  <Pressable
    key={response}   // ← Use the string itself as key (100% unique and stable)
    style={[
      styles.quickResponseButton,
      { backgroundColor: theme.background, borderColor: theme.border },
    ]}
    onPress={() => setInputText(response)}
  >
    <ThemedText type="caption">{response}</ThemedText>
  </Pressable>
))}
            </View>
          </View>

          {/* Input */}
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: theme.cardBackground, borderTopColor: theme.border, paddingBottom: 50 },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                { backgroundColor: theme.background, color: theme.text },
              ]}
              placeholder="Type your message..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[
                styles.sendButton,
                { backgroundColor: inputText.trim() ? theme.primary : theme.border },
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
   
    
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    
  },
  userRoleBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderBottomWidth: 1,
  },
  messagesList: {
    padding: Spacing.md,
  },
  messageContainer: {
    marginBottom: Spacing.md,
    maxWidth: "80%",
  },
  adminMessage: {
    alignSelf: "flex-end",
  },
  userMessage: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  quickResponsesContainer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  quickResponseButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});