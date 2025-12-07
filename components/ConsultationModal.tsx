// ConsultationModal Component - Enhanced with Call Button & Dual Timer
import React, { useState, useEffect } from 'react';
import { View, Modal, Alert, ActivityIndicator, Pressable, StyleSheet, Image, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { PrimaryButton } from './PrimaryButton';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { Spacing, BorderRadius } from '../constants/theme';
import { professionalService, Booking, Professional } from '../services/professionalService';
import { firebaseService } from '../services/firebaseService';
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  CallControls,
  CallContent,
} from '@stream-io/video-react-native-sdk';
import { initStreamClient, createVideoCall, checkBackendHealth } from '../services/streamService';
import i18n from '../lib/i18n';
import { notificationService } from '../services/notificationService';



const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Doctor";

export const ConsultationModal = ({ professional, booking, onClose }: {
  professional: Professional;
  booking: Booking;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [emergencyTimer, setEmergencyTimer] = useState<number>(0);
  const [canStart, setCanStart] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [bookingStatus, setBookingStatus] = useState(booking.status);

  const imageUrl = professional.imageUrl || PLACEHOLDER_IMAGE;

  // Listen to booking changes
  useEffect(() => {
    const unsubscribe = professionalService.listenToBooking(booking.id, (updated) => {
      setBookingStatus(updated.status);
      setQueuePosition(updated.queuePosition || 0);
      setCanStart(updated.canStartCall || false);
    });
    return () => unsubscribe();
  }, [booking.id]);

  // Timer logic for scheduled consultations
  useEffect(() => {
    if (booking.isEmergency) {
      // Emergency timer uses emergencyDeadline
      if (booking.emergencyDeadline) {
        const updateTimer = () => {
          const remaining = booking.emergencyDeadline! - Date.now();
          setEmergencyTimer(Math.max(0, remaining));
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
      }
    } else {
      // Scheduled consultation timer
      if (!booking.scheduledTimestamp) {
        setCanStart(true);
        return;
      }

      const updateTimer = () => {
        const remaining = booking.scheduledTimestamp! - Date.now();
        setTimeRemaining(Math.max(0, remaining));
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [booking.scheduledTimestamp, booking.emergencyDeadline, booking.isEmergency]);

  const formatTimeRemaining = () => {
    const time = booking.isEmergency ? emergencyTimer : timeRemaining;
    const days = Math.floor(time / (24 * 60 * 60 * 1000));
    const hours = Math.floor((time % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((time % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((time % (60 * 1000)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const handleStartCall = async () => {
    if (!user || !canStart) return;
    
    try {
      setLoading(true);
      setError(null);

      const isHealthy = await checkBackendHealth();
      if (!isHealthy) throw new Error(i18n.t("video_service_unavailable"));

      const streamClient = await initStreamClient(user.uid, user.name || 'User', user.imageUrl);
      setClient(streamClient);

      const { callId } = await createVideoCall(
        booking.id,
        professional.uid,
        user.uid,
        professional.name,
        user.name || 'Patient'
      );

    console.log('✅ Call created with ID:', callId);

    // ✅ NEW: Send incoming call notification to the other user
    const otherUserId = user.uid === booking.professionalId 
      ? booking.patientId 
      : booking.professionalId;
    
    const otherUserName = user.uid === booking.professionalId 
      ? booking.patientName 
      : booking.professionalName;

    await notificationService.sendIncomingCallNotification({
      callId,
      bookingId: booking.id,
      callerName: user.name || 'User',
      callerImage: user.imageUrl,
      callerId: user.uid,
      receiverId: otherUserId,
      createdAt: Date.now(),
      isEmergency: booking.isEmergency,
    });

    console.log('✅ Incoming call notification sent to:', otherUserName);

    // Join the call
    const newCall = streamClient.call('default', callId);
    await newCall.join({ create: true });
    await newCall.get();
    setCall(newCall);
    setLoading(false);
    
    await professionalService.updateBookingStatus(booking.id, "in_progress");
  } catch (error: any) {
    console.error('Call error:', error);
    setError(error.message || i18n.t("failed_to_connect"));
    setLoading(false);
  }
};

  const isPending = bookingStatus === "pending_confirmation" || bookingStatus === "emergency_pending";
  const isConfirmedScheduled = bookingStatus === "confirmed" && !booking.isEmergency;
  const isConfirmedEmergency = bookingStatus === "emergency_confirmed";

  // Pending confirmation state (for scheduled or emergency)
  if (isPending) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Image source={{ uri: imageUrl }} style={styles.profileImageLarge} />
          
          {booking.isEmergency ? (
            <>
              <Feather name="zap" size={64} color={theme.error} style={{ marginTop: Spacing.lg }} />
              <ThemedText type="h2" style={{ marginTop: Spacing.md, textAlign: 'center', color: theme.error }}>
                🚨 {i18n.t("emergency_request_sent")}
              </ThemedText>
              <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary, textAlign: 'center' }}>
                {professional.name} {i18n.t("has_been_notified")}
              </ThemedText>
              
              <View style={[styles.timerContainer, { backgroundColor: theme.error + "20", borderColor: theme.error }]}>
                <Feather name="clock" size={32} color={theme.error} />
                <ThemedText type="h1" style={{ color: theme.error, marginTop: Spacing.md }}>
                  {formatTimeRemaining()}
                </ThemedText>
                <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
                  {i18n.t("waiting_for_professional_response")}
                </ThemedText>
              </View>
              
              <View style={[styles.infoBox, { backgroundColor: theme.info + "15", borderColor: theme.info }]}>
                <Feather name="info" size={20} color={theme.info} />
                <ThemedText style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
                  💡 Average response time: 10 minutes. You'll be notified immediately when {professional.name} accepts.
                </ThemedText>
              </View>
            </>
          ) : (
            // Regular pending confirmation
            <>
              <ThemedText type="h2" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
                {i18n.t("waiting_for_confirmation")}
              </ThemedText>
              <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary, textAlign: 'center' }}>
                {professional.name} {i18n.t("will_review_booking")}
              </ThemedText>
              <View style={[styles.infoBox, { backgroundColor: theme.warning + "15", borderColor: theme.warning, marginTop: Spacing.xl }]}>
                <Feather name="clock" size={24} color={theme.warning} />
                <ThemedText style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
                  {i18n.t("payment_on_hold")}
                </ThemedText>
              </View>
            </>
          )}
          
          <PrimaryButton
            title={i18n.t("close")}
            onPress={onClose}
            variant="outlined"
            style={{ marginTop: Spacing.xl, minWidth: 200 }}
          />
        </View>
      </Modal>
    );
  }

  // Waiting with timer (Confirmed Scheduled Booking)
  if (isConfirmedScheduled && !canStart) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Image source={{ uri: imageUrl }} style={styles.profileImageLarge} />
          <ThemedText type="h2" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
            {i18n.t("consultation_scheduled")}
          </ThemedText>
          <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary, textAlign: 'center' }}>
            {i18n.t("with")} {professional.name}
          </ThemedText>

          <View style={[styles.timerContainer, { backgroundColor: theme.primary + "20", borderColor: theme.primary }]}>
            <Feather name="clock" size={32} color={theme.primary} />
            <ThemedText type="h1" style={{ color: theme.primary, marginTop: Spacing.md }}>
              {formatTimeRemaining()}
            </ThemedText>
            <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
              {i18n.t("until_consultation")}
            </ThemedText>
          </View>

          {queuePosition > 0 && (
            <View style={[styles.queueCard, { backgroundColor: theme.info + "15", borderColor: theme.info }]}>
              <Feather name="users" size={24} color={theme.info} />
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <ThemedText weight="medium" style={{ color: theme.info }}>
                  {i18n.t("your_position")}
                </ThemedText>
                <ThemedText type="h2" style={{ color: theme.info }}>#{queuePosition}</ThemedText>
              </View>
            </View>
          )}

          <View style={[styles.infoBox, { backgroundColor: theme.info + "15", borderColor: theme.info }]}>
            <Feather name="info" size={20} color={theme.info} />
            <ThemedText style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
              💡 {i18n.t("you_will_be_notified")} The "Start Call" button will appear 15 minutes before your scheduled time.
            </ThemedText>
          </View>
          
          <PrimaryButton
            title={i18n.t("close")}
            onPress={onClose}
            variant="outlined"
            style={{ marginTop: Spacing.xl, minWidth: 200 }}
          />
        </View>
      </Modal>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="h2" lightColor="#fff" style={{ marginTop: Spacing.md }}>
            {i18n.t("connecting")}...
          </ThemedText>
        </View>
      </Modal>
    );
  }

  // Error state
  if (error) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.error, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Feather name="alert-circle" size={64} color="#fff" />
          <ThemedText type="h2" lightColor="#fff" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
            {i18n.t("connection_error")}
          </ThemedText>
          <ThemedText lightColor="#fff" style={{ marginTop: Spacing.md, textAlign: 'center', opacity: 0.9 }}>
            {error}
          </ThemedText>
          <View style={{ marginTop: Spacing.xl, flexDirection: 'row', gap: Spacing.md }}>
            <PrimaryButton
              title={i18n.t("try_again")}
              onPress={handleStartCall}
              style={{ minWidth: 150, backgroundColor: '#fff' }}
              textStyle={{ color: theme.error }}
            />
            <PrimaryButton
              title={i18n.t("close")}
              onPress={onClose}
              variant="outlined"
              style={{ minWidth: 150, borderColor: '#fff' }}
              lightColor="#fff"
            />
          </View>
        </View>
      </Modal>
    );
  }

  // Ready to start (Scheduled or Emergency Confirmed) - ENHANCED WITH BIG CALL BUTTON
  if ((bookingStatus === "ready" || isConfirmedEmergency) && canStart && !call) {
    const isEmergency = booking.isEmergency;
    const bgColor = isEmergency ? theme.error : theme.success;
    
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Feather name="video" size={64} color="#fff" />
          <ThemedText type="h2" lightColor="#fff" darkColor="#fff" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
            {isEmergency ? "🚨 " : ""}
            {queuePosition === 1 ? i18n.t("next_in_queue") : i18n.t("ready_to_start")}
          </ThemedText>
          <ThemedText lightColor="#fff" darkColor="#fff" style={{ marginTop: Spacing.md, textAlign: 'center', fontSize: 18 }}>
            {i18n.t("consultation_with")} **{professional.name}**
          </ThemedText>

          {queuePosition > 1 && (
            <View style={[styles.queueCard, { backgroundColor: '#fff', borderColor: '#fff', marginTop: Spacing.xl }]}>
              <ThemedText weight="medium" style={{ color: bgColor }}>
                {i18n.t("your_position")}: #{queuePosition}
              </ThemedText>
            </View>
          )}

          {/* BIG CALL BUTTON */}
          <Pressable
            style={[styles.bigCallButton, { backgroundColor: '#fff', marginTop: Spacing["3xl"] }]}
            onPress={handleStartCall}
          >
            <View style={[styles.callIconCircle, { backgroundColor: bgColor }]}>
              <Feather name="video" size={48} color="#fff" />
            </View>
            <ThemedText type="h2" style={{ color: bgColor, marginTop: Spacing.lg }}>
              {i18n.t("start_consultation")}
            </ThemedText>
            <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Tap to begin video call
            </ThemedText>
          </Pressable>

          <View style={{ marginTop: Spacing["3xl"], width: '100%' }}>
            <PrimaryButton
              title={i18n.t("cancel")}
              onPress={onClose}
              variant="outlined"
              style={{ borderColor: '#fff' }}
              lightColor="#fff"
            />
          </View>
        </View>
      </Modal>
    );
  }

  // Call in progress
  if (!client || !call) return null;
  
  return (
    <Modal visible animationType="fade">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <CallContent style={{ flex: 1 }} />
            <CallControls
              onHangupCallHandler={async () => {
                try {
                  await call.leave();
                  await client.disconnectUser();
                  await professionalService.completeBooking(booking.id, firebaseService);
                  onClose();
                } catch (err) {
                  console.error('Error ending call:', err);
                  onClose();
                }
              }}
            />
          </View>
        </StreamCall>
      </StreamVideo>
    </Modal>
  );
};

// Rating Modal (keeping your existing implementation)
export const RatingModal = ({ professional, booking, onClose }: {
  professional: Professional;
  booking: Booking;
  onClose: () => void;
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const imageUrl = professional.imageUrl || PLACEHOLDER_IMAGE;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(i18n.t("rating_required"), i18n.t("please_select_rating"));
      return;
    }

    setSubmitting(true);
    try {
      await professionalService.createReview({
        professionalId: professional.uid,
        patientId: user!.uid,
        patientName: user!.name || "Anonymous",
        bookingId: booking.id,
        rating,
        comment: comment.trim(),
      });
      Alert.alert(i18n.t("thank_you"), i18n.t("review_submitted"));
      onClose();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("failed_to_submit"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
            <ThemedText type="h3" lightColor="#fff">{i18n.t("rate_consultation")}</ThemedText>
            <Pressable onPress={onClose} disabled={submitting}>
              <Feather name="x" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={{ padding: Spacing.lg }}>
            <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
              <Image source={{ uri: imageUrl }} style={styles.modalImage} />
              <ThemedText type="h3" style={{ marginTop: Spacing.md }}>{professional.name}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {professional.specialization}
              </ThemedText>
            </View>

            <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
              <ThemedText weight="medium" style={{ marginBottom: Spacing.md }}>
                {i18n.t("how_was_consultation")}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setRating(star)} disabled={submitting}>
                    <Feather
                      name="star"
                      size={40}
                      color={star <= rating ? "#fbbf24" : theme.border}
                      style={{ marginHorizontal: 4 }}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                {i18n.t("additional_comments")}
              </ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={i18n.t("share_experience")}
                placeholderTextColor={theme.textSecondary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                editable={!submitting}
              />
            </View>
          </View>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <PrimaryButton
              title={i18n.t("skip")}
              onPress={onClose}
              variant="outlined"
              style={{ flex: 1 }}
              disabled={submitting}
            />
            <PrimaryButton
              title={submitting ? i18n.t("submitting") : i18n.t("submit_review")}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
              style={{ flex: 1, marginLeft: Spacing.sm }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  profileImageLarge: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  timerContainer: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: Spacing["3xl"],
    width: '90%'
  },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
    alignItems: 'center',
    maxWidth: '90%',
  },
  queueCard: {
    flexDirection: 'row',
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: Spacing.xl,
    width: '90%'
  },
  bigCallButton: {
    alignItems: 'center',
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.xl,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  callIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end"
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg
  },
  modalImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 30 
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    minHeight: 100,
    textAlignVertical: "top"
  },
  modalFooter: { 
    flexDirection: "row", 
    padding: Spacing.lg, 
    borderTopWidth: 1 
  },
});