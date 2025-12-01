// screens/SupportChatScreen.tsx

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
import { ThemedText } from "../components/ThemedText";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import {
  supportChatService,
  SupportMessage,
  SupportChat,
  ChatQueue,
} from "../services/supportChatService";

export default function SupportChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [chat, setChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [queueInfo, setQueueInfo] = useState<ChatQueue | null>(null);
  const [showStartChat, setShowStartChat] = useState(false);
  const [subject, setSubject] = useState("");
  const [initialMessage, setInitialMessage] = useState("");

  useEffect(() => {
    if (user) {
      loadChat();
    }
  }, [user]);

  useEffect(() => {
    if (chat) {
      const unsubscribeMessages = supportChatService.listenToMessages(
        chat.id,
        (newMessages) => {
          setMessages(newMessages);
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

      // Update queue info if waiting
      if (chat.status === "waiting") {
        const interval = setInterval(async () => {
          try {
            const info = await supportChatService.getQueueInfo(chat.id);
            setQueueInfo(info);
          } catch (error) {
            console.error("Error updating queue:", error);
          }
        }, 10000); // Update every 10 seconds

        return () => {
          clearInterval(interval);
          unsubscribeMessages();
          unsubscribeChat();
        };
      }

      return () => {
        unsubscribeMessages();
        unsubscribeChat();
      };
    }
  }, [chat?.id, chat?.status]);

  const loadChat = async () => {
    if (!user) return;

    try {
      const activeChat = await supportChatService.getUserActiveChat(user.uid);
      
      if (activeChat) {
        setChat(activeChat);
        if (activeChat.status === "waiting") {
          const info = await supportChatService.getQueueInfo(activeChat.id);
          setQueueInfo(info);
        }
      } else {
        setShowStartChat(true);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      Alert.alert("Error", "Failed to load support chat");
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!user || !subject.trim() || !initialMessage.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const chatId = await supportChatService.createSupportChat(
        user.uid,
        user.name,
        user.role as "buyer" | "seller",
        user.email,
        subject.trim(),
        initialMessage.trim()
      );

      const newChat = await supportChatService.getUserActiveChat(user.uid);
      if (newChat) {
        setChat(newChat);
        const info = await supportChatService.getQueueInfo(chatId);
        setQueueInfo(info);
      }
      
      setShowStartChat(false);
      setSubject("");
      setInitialMessage("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to start chat");
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
        user.role as "buyer" | "seller",
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

  const handleCloseChat = () => {
    if (!chat) return;

    Alert.alert(
      "Close Chat",
      "Are you sure you want to close this support chat?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close",
          style: "destructive",
          onPress: async () => {
            try {
              await supportChatService.closeChat(chat.id);
              setChat(null);
              setMessages([]);
              setShowStartChat(true);
              Alert.alert("Success", "Chat closed successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to close chat");
            }
          },
        },
      ]
    );
  };

  const handleRateChat = () => {
    if (!chat) return;

    Alert.alert(
      "Rate Your Experience",
      "How would you rate your support experience?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "⭐ (1)", onPress: () => submitRating(1) },
        { text: "⭐⭐ (2)", onPress: () => submitRating(2) },
        { text: "⭐⭐⭐ (3)", onPress: () => submitRating(3) },
        { text: "⭐⭐⭐⭐ (4)", onPress: () => submitRating(4) },
        { text: "⭐⭐⭐⭐⭐ (5)", onPress: () => submitRating(5) },
      ]
    );
  };

  const submitRating = async (rating: number) => {
    if (!chat) return;
    
    try {
      await supportChatService.closeChat(chat.id, rating);
      Alert.alert("Thank you!", "Your feedback has been submitted");
      setChat(null);
      setMessages([]);
      setShowStartChat(true);
    } catch (error) {
      Alert.alert("Error", "Failed to submit rating");
    }
  };

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isOwnMessage = item.senderId === user?.uid;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? theme.primary : theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          {!isOwnMessage && (
            <ThemedText
              type="caption"
              weight="medium"
              style={{
                color: isOwnMessage ? "#fff" : theme.primary,
                marginBottom: 4,
              }}
            >
              {item.senderName} ({item.senderRole})
            </ThemedText>
          )}
          <ThemedText
            style={{ color: isOwnMessage ? "#fff" : theme.text }}
          >
            {item.message}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{
              color: isOwnMessage ? "#fff" : theme.textSecondary,
              opacity: 0.7,
              marginTop: 4,
            }}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: Spacing.md }}>Loading...</ThemedText>
      </View>
    );
  }

  if (showStartChat) {
    return (
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.startChatContainer}>
          <Feather name="message-circle" size={64} color={theme.primary} />
          <ThemedText type="h2" style={{ marginTop: Spacing.lg }}>
            Start Support Chat
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}
          >
            Our support team is here to help you
          </ThemedText>

          <View style={styles.formContainer}>
            <ThemedText weight="medium" style={{ marginBottom: Spacing.xs }}>
              Subject
            </ThemedText>
            <TextInput
              style={[
                styles.subjectInput,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="What do you need help with?"
              placeholderTextColor={theme.textSecondary}
              value={subject}
              onChangeText={setSubject}
            />

            <ThemedText
              weight="medium"
              style={{ marginTop: Spacing.md, marginBottom: Spacing.xs }}
            >
              Message
            </ThemedText>
            <TextInput
              style={[
                styles.messageInput,
                {
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Describe your issue..."
              placeholderTextColor={theme.textSecondary}
              value={initialMessage}
              onChangeText={setInitialMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Pressable
              style={[
                styles.startButton,
                { backgroundColor: theme.primary },
                (!subject.trim() || !initialMessage.trim()) && styles.disabledButton,
              ]}
              onPress={handleStartChat}
              disabled={!subject.trim() || !initialMessage.trim()}
            >
              <ThemedText weight="medium" lightColor="#fff" darkColor="#fff">
                Start Chat
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.cardBackground, borderBottomColor: theme.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <ThemedText type="h4">{chat?.subject || "Support Chat"}</ThemedText>
          
          {chat?.status === "waiting" && queueInfo && (
            <View style={styles.queueInfo}>
              <Feather name="clock" size={14} color={theme.warning} />
              <ThemedText
                type="caption"
                style={{ color: theme.warning, marginLeft: 4 }}
              >
                Position {queueInfo.position} in queue • ~{queueInfo.estimatedWaitTime} min wait
              </ThemedText>
            </View>
          )}

          {chat?.status === "active" && chat.assignedAdminName && (
            <View style={styles.activeInfo}>
              <Feather name="check-circle" size={14} color={theme.success} />
              <ThemedText
                type="caption"
                style={{ color: theme.success, marginLeft: 4 }}
              >
                Connected with {chat.assignedAdminName}
              </ThemedText>
            </View>
          )}

          {chat?.status === "resolved" && (
            <View style={styles.resolvedInfo}>
              <Feather name="check" size={14} color={theme.textSecondary} />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, marginLeft: 4 }}
              >
                Chat resolved
              </ThemedText>
            </View>
          )}
        </View>

        <Pressable onPress={handleCloseChat} style={{ padding: 8 }}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Feather name="message-circle" size={48} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              {chat?.status === "waiting" 
                ? "Waiting for admin to connect..."
                : "No messages yet"}
            </ThemedText>
          </View>
        }
      />

      {/* Input */}
      {chat?.status !== "closed" && chat?.status !== "resolved" && (
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.cardBackground, borderTopColor: theme.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.background, color: theme.text },
            ]}
            placeholder={chat?.status === "waiting" ? "Waiting for admin..." : "Type your message..."}
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={chat?.status === "active"}
          />
          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: (inputText.trim() && chat?.status === "active") ? theme.primary : theme.border },
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending || chat?.status !== "active"}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      )}

      {chat?.status === "resolved" && !chat.rating && (
        <View
          style={[
            styles.ratingPrompt,
            { backgroundColor: theme.cardBackground, borderTopColor: theme.border },
          ]}
        >
          <ThemedText type="caption" style={{ marginBottom: Spacing.sm }}>
            How was your experience?
          </ThemedText>
          <Pressable
            style={[styles.rateButton, { backgroundColor: theme.primary }]}
            onPress={handleRateChat}
          >
            <ThemedText weight="medium" lightColor="#fff" darkColor="#fff">
              Rate Support
            </ThemedText>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 110,
    
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  startChatContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  formContainer: {
    width: "100%",
    marginTop: Spacing.xl,
  },
  subjectInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 100,
  },
  startButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  queueInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  activeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  resolvedInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  messageContainer: {
    marginBottom: Spacing.md,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
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
  ratingPrompt: {
    padding: Spacing.md,
    borderTopWidth: 1,
    alignItems: "center",
  },
  rateButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});