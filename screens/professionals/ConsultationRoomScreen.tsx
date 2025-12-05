// screens/professionals/ConsultationRoomScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StreamVideo, StreamCall } from '@stream-io/video-react-native-sdk';
import { ThemedText } from "../../components/ThemedText";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { Spacing, BorderRadius } from "../../constants/theme";
import { professionalService, Booking, ConsultationMessage } from "../../services/professionalService";
import { initStreamClient, createVideoCall, checkBackendHealth } from '../../services/streamService';

export default function ConsultationRoomScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  
  const { bookingId } = route.params as { bookingId: string };

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [client, setClient] = useState<any>(null);
  const [call, setCall] = useState<any>(null);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  const messagesEndRef = useRef<FlatList>(null);
  const sessionTimerRef = useRef<any>(null);

  useEffect(() => {
    loadBookingData();
    return () => {
      cleanup();
    };
  }, [bookingId]);

  useEffect(() => {
    if (booking) {
      const unsubscribe = professionalService.listenToMessages(bookingId, (msgs) => {
        setMessages(msgs);
        scrollToBottom();
      });

      return () => unsubscribe();
    }
  }, [booking]);

  // Session timer
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  const loadBookingData = async () => {
    try {
      setLoading(true);
      const bookingData = await professionalService.getBooking(bookingId);
      
      if (!bookingData) {
        throw new Error("Booking not found");
      }

      setBooking(bookingData);
      
      // Update booking status to in_progress if it's confirmed
      if (bookingData.status === "confirmed") {
        await professionalService.updateBookingStatus(bookingId, "in_progress");
      }

      // Initialize video if consultation type is video
      if (bookingData.consultationType === "video") {
        await initializeVideoCall();
      }
    } catch (error) {
      console.error("Error loading booking:", error);
      Alert.alert("Error", "Failed to load consultation details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const initializeVideoCall = async () => {
    if (!user || !booking) return;

    try {
      // Check backend health
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        throw new Error('Video service unavailable');
      }

      // Initialize Stream client
      const streamClient = await initStreamClient(
        user.uid,
        user.name || 'User',
        user.imageUrl
      );
      setClient(streamClient);

      // Create/join call
      const { callId } = await createVideoCall(
        bookingId,
        booking.professionalId,
        booking.patientId,
        booking.professionalName,
        booking.patientName
      );

      const videoCall = streamClient.call('default', callId);
      await videoCall.join({ create: true });
      
      setCall(videoCall);
    } catch (error: any) {
      console.error('Video call initialization error:', error);
      Alert.alert(
        'Video Unavailable',
        'Unable to start video call. You can continue with chat.',
        [{ text: 'OK' }]
      );
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollToEnd({ animated: true });
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !booking) return;

    const role = user.uid === booking.professionalId ? "professional" : "patient";

    try {
      await professionalService.sendMessage(
        bookingId,
        user.uid,
        user.name,
        role,
        messageText.trim()
      );
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  const toggleVideo = () => {
    setIsVideoMode(!isVideoMode);
  };

  const toggleMute = async () => {
    if (call) {
      await call.microphone.toggle();
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = async () => {
    if (call) {
      await call.camera.toggle();
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndConsultation = () => {
    setShowEndConfirm(true);
  };

  const confirmEndConsultation = async () => {
    try {
      setLoading(true);

      // Update booking status
      await professionalService.updateBookingStatus(bookingId, "completed");

      // End video call if active
      if (call) {
        await call.leave();
      }

      Alert.alert(
        "Session Ended",
        "The consultation has been completed successfully.",
        [
          {
            text: "Rate Session",
            onPress: () => {
              navigation.navigate("SessionRating" as never, {
                bookingId,
                professionalId: booking?.professionalId,
              } as never);
            },
          },
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error ending consultation:", error);
      Alert.alert("Error", "Failed to end consultation");
    } finally {
      setLoading(false);
      setShowEndConfirm(false);
    }
  };

  const cleanup = async () => {
    if (call) {
      try {
        await call.leave();
      } catch (error) {
        console.error("Error leaving call:", error);
      }
    }
    if (client) {
      try {
        await client.disconnectUser();
      } catch (error) {
        console.error("Error disconnecting client:", error);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = ({ item }: { item: ConsultationMessage }) => {
    const isMyMessage = item.senderId === user?.uid;
    
    return (
      <View
        style={[
          styles.messageBubble,
          {
            alignSelf: isMyMessage ? "flex-end" : "flex-start",
            backgroundColor: isMyMessage ? theme.primary : theme.cardBackground,
            borderColor: theme.border,
          },
        ]}
      >
        {!isMyMessage && (
          <ThemedText 
            type="caption" 
            weight="medium"
            lightColor={theme.primary}
            style={{ marginBottom: 4 }}
          >
            {item.senderName}
          </ThemedText>
        )}
        <ThemedText lightColor={isMyMessage ? "#fff" : theme.text}>
          {item.text}
        </ThemedText>
        <ThemedText 
          type="caption" 
          lightColor={isMyMessage ? "#fff" : theme.textSecondary}
          style={{ opacity: 0.7, marginTop: 4 }}
        >
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
      </View>
    );
  };

  if (loading || !booking) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading consultation...</ThemedText>
        </View>
      </View>
    );
  }

  const isProfessional = user?.uid === booking.professionalId;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        
        <View style={{ flex: 1, alignItems: "center" }}>
          <ThemedText weight="medium">
            {isProfessional ? booking.patientName : booking.professionalName}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
              In Session • {formatDuration(sessionDuration)}
            </ThemedText>
          </View>
        </View>

        <Pressable onPress={handleEndConsultation} style={styles.endButton}>
          <Feather name="phone-off" size={20} color={theme.error} />
        </Pressable>
      </View>

      {/* Video/Chat Mode Toggle */}
      {booking.consultationType === "video" && call && (
        <View style={[styles.modeToggle, { backgroundColor: theme.backgroundSecondary }]}>
          <Pressable
            style={[
              styles.modeButton,
              isVideoMode && { backgroundColor: theme.primary }
            ]}
            onPress={() => setIsVideoMode(true)}
          >
            <Feather name="video" size={18} color={isVideoMode ? "#fff" : theme.text} />
            <ThemedText 
              lightColor={isVideoMode ? "#fff" : theme.text}
              style={{ marginLeft: 4, fontSize: 13 }}
            >
              Video
            </ThemedText>
          </Pressable>
          
          <Pressable
            style={[
              styles.modeButton,
              !isVideoMode && { backgroundColor: theme.primary }
            ]}
            onPress={() => setIsVideoMode(false)}
          >
            <Feather name="message-square" size={18} color={!isVideoMode ? "#fff" : theme.text} />
            <ThemedText 
              lightColor={!isVideoMode ? "#fff" : theme.text}
              style={{ marginLeft: 4, fontSize: 13 }}
            >
              Chat
            </ThemedText>
          </Pressable>
        </View>
      )}

      {/* Main Content Area */}
      {isVideoMode && call ? (
        <View style={styles.videoContainer}>
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <View style={styles.videoContent}>
                <ThemedText lightColor="#fff" style={styles.videoPlaceholder}>
                  Video Stream Active
                </ThemedText>
              </View>
            </StreamCall>
          </StreamVideo>

          {/* Video Controls */}
          <View style={styles.videoControls}>
            <Pressable 
              style={[styles.controlButton, { backgroundColor: isMuted ? theme.error : theme.cardBackground }]}
              onPress={toggleMute}
            >
              <Feather name={isMuted ? "mic-off" : "mic"} size={24} color={isMuted ? "#fff" : theme.text} />
            </Pressable>

            <Pressable 
              style={[styles.controlButton, { backgroundColor: isVideoOff ? theme.error : theme.cardBackground }]}
              onPress={toggleCamera}
            >
              <Feather name={isVideoOff ? "video-off" : "video"} size={24} color={isVideoOff ? "#fff" : theme.text} />
            </Pressable>

            <Pressable 
              style={[styles.controlButton, { backgroundColor: theme.cardBackground }]}
              onPress={() => setIsVideoMode(false)}
            >
              <Feather name="message-square" size={24} color={theme.text} />
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {/* Chat Messages */}
          <FlatList
            ref={messagesEndRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContainer}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Feather name="message-circle" size={48} color={theme.textSecondary} />
                <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                  Start the conversation
                </ThemedText>
              </View>
            }
          />

          {/* Message Input */}
          <View style={[styles.messageInputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.messageInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="Type your message..."
              placeholderTextColor={theme.textSecondary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={sendMessage}
              disabled={!messageText.trim()}
            >
              <Feather name="send" size={20} color="#fff" />
            </Pressable>
          </View>
        </>
      )}

      {/* End Consultation Confirmation Modal */}
      <Modal
        visible={showEndConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Feather name="phone-off" size={48} color={theme.error} />
            <ThemedText type="h3" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
              End Consultation?
            </ThemedText>
            <ThemedText 
              type="caption" 
              style={{ marginTop: Spacing.sm, textAlign: "center", color: theme.textSecondary }}
            >
              Session duration: {formatDuration(sessionDuration)}
            </ThemedText>
            
            <View style={styles.modalButtons}>
              <PrimaryButton
                title="Cancel"
                onPress={() => setShowEndConfirm(false)}
                variant="outlined"
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="End Session"
                onPress={confirmEndConsultation}
                loading={loading}
                style={{ flex: 1, marginLeft: Spacing.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  endButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modeToggle: {
    flexDirection: "row",
    padding: Spacing.xs,
    margin: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlaceholder: {
    fontSize: 18,
    fontWeight: "600",
  },
  videoControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  messagesContainer: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  messageInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  messageInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
});