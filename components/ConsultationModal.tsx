// components/ConsultationModal.tsx - FULLY UPDATED: Professional starts calls, patients join

import React, { useState, useEffect } from 'react';
import { View, Modal, Alert, ActivityIndicator, Pressable, StyleSheet, Image, TextInput, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { PrimaryButton } from './PrimaryButton';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { Spacing, BorderRadius } from '../constants/theme';
import { professionalService, Booking, Professional } from '../services/professionalService';
import { checkBackendHealth } from '../services/streamService';
import { soundManager } from '../lib/soundManager';
import i18n from '../lib/i18n';

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Doctor";

export const ConsultationModal = ({
  professional,
  booking,
  onClose,
}: {
  professional: Professional;
  booking: Booking;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [emergencyTimer, setEmergencyTimer] = useState<number>(0);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [canStart, setCanStart] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(booking.status);
  const [showRating, setShowRating] = useState(false);
  const [consultationExpiresAt, setConsultationExpiresAt] = useState(booking.sessionExpiresAt || null);
  
  const imageUrl = professional.imageUrl || PLACEHOLDER_IMAGE;
  const isProfessional = user?.uid === booking.professionalId;

  // Listen to real-time booking updates
  useEffect(() => {
    const unsubscribe = professionalService.listenToBooking(booking.id, (updated) => {
      setBookingStatus(updated.status);
      setCanStart(updated.canStartCall || false);
      setConsultationExpiresAt(updated.sessionExpiresAt || null);
      
      if (updated.status === 'completed' && !updated.rated) {
        setShowRating(true);
      }
    });
    return () => unsubscribe();
  }, [booking.id]);

  // Session expiry countdown (30 minutes)
  useEffect(() => {
    if (consultationExpiresAt && bookingStatus === 'in_progress') {
      const interval = setInterval(() => {
        const remaining = Math.max(0, consultationExpiresAt - Date.now());
        setSessionTimeRemaining(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
          Alert.alert(
            "Session Expired",
            "Your 30-minute consultation window has ended. Please complete the booking.",
            [{ text: "OK", onPress: onClose }]
          );
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [consultationExpiresAt, bookingStatus]);

  // Emergency countdown
  useEffect(() => {
    if (booking.isEmergency && booking.emergencyDeadline && bookingStatus === 'emergency_pending') {
      const interval = setInterval(() => {
        const remaining = Math.max(0, booking.emergencyDeadline! - Date.now());
        setEmergencyTimer(remaining);
        if (remaining === 0) {
          clearInterval(interval);
          Alert.alert("Request Expired", "The professional did not respond in time.");
          onClose();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [booking.emergencyDeadline, bookingStatus]);

  // Scheduled consultation countdown
  useEffect(() => {
    if (!booking.isEmergency && booking.scheduledTimestamp && bookingStatus === 'confirmed') {
      const interval = setInterval(() => {
        const remaining = Math.max(0, booking.scheduledTimestamp! - Date.now());
        setTimeRemaining(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [booking.scheduledTimestamp, bookingStatus]);

  const formatTimeRemaining = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // ✅ PROFESSIONAL ONLY: Start call and send notification to patient
  const handleStartCall = async () => {
    if (!user || !isProfessional) {
      Alert.alert("Error", "Only the professional can start the consultation");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) throw new Error(i18n.t("video_service_unavailable"));

      // ✅ Initiate call - this function is now responsible for CREATING the Stream call first, 
      // then updating Firestore and sending the notification.
      const callId = await professionalService.initiateCall(booking.id, user.uid);

      // Professional immediately joins the call
      navigation.navigate('VideoCall', {
        streamUserId: user.uid,
        streamUserName: user.name,
        streamUserImage: user.imageUrl,
        callId: callId,
        bookingId: booking.id,
      });
      
      onClose();

    } catch (err: any) {
      console.error('❌ Call failed:', err);
      setError(err.message || i18n.t("failed_to_connect"));
      setLoading(false);
    }
  };

  // ✅ PATIENT: Join ongoing call
  const handleJoinCall = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) throw new Error(i18n.t("video_service_unavailable"));

      // Patient joins the call created by the professional
      const callId = await professionalService.joinCall(booking.id, user.uid);

      navigation.navigate('VideoCall', {
        streamUserId: user.uid,
        streamUserName: user.name,
        streamUserImage: user.imageUrl,
        callId: callId,
        bookingId: booking.id,
      });
      
      onClose();

    } catch (err: any) {
      console.error('❌ Join failed:', err);
      setError(err.message || i18n.t("failed_to_connect"));
      setLoading(false);
    }
  };

  const isPending = ['pending_confirmation', 'emergency_pending'].includes(bookingStatus);
  const isConfirmed = ['confirmed', 'emergency_confirmed'].includes(bookingStatus);
  const isInProgress = bookingStatus === 'in_progress';

  // RATING MODAL
  if (showRating) {
    return (
      <RatingModal
        professional={professional}
        booking={booking}
        onClose={() => {
          setShowRating(false);
          onClose();
        }}
      />
    );
  }

  // PENDING STATE (Emergency countdown)
  if (isPending && booking.isEmergency) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Image source={{ uri: imageUrl }} style={styles.profileImageLarge} />
          <Feather name="zap" size={64} color={theme.error} style={{ marginTop: Spacing.xl }} />
          <ThemedText type="h2" style={{ color: theme.error, textAlign: 'center', marginTop: Spacing.lg }}>
            🚨 Emergency Request Sent
          </ThemedText>
          <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary, textAlign: 'center' }}>
            Waiting for {professional.name} to respond...
          </ThemedText>
          <ThemedText type="h1" style={{ marginTop: Spacing.xl, color: theme.error }}>
            {formatTimeRemaining(emergencyTimer)}
          </ThemedText>
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
            Professional must respond within this time
          </ThemedText>
          <PrimaryButton title="Cancel Request" onPress={onClose} variant="outlined" style={{ marginTop: Spacing.xl }} />
        </View>
      </Modal>
    );
  }

  // PENDING STATE (Regular)
  if (isPending) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Image source={{ uri: imageUrl }} style={styles.profileImageLarge} />
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: Spacing.xl }} />
          <ThemedText type="h2" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
            Awaiting Confirmation
          </ThemedText>
          <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary, textAlign: 'center' }}>
            {professional.name} will review your request soon
          </ThemedText>
          <PrimaryButton title="Close" onPress={onClose} variant="outlined" style={{ marginTop: Spacing.xl }} />
        </View>
      </Modal>
    );
  }

  // ✅ CONFIRMED STATE - Professional can start, Patient waits
  if (isConfirmed) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.success, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="video" size={80} color="#fff" />
          <ThemedText type="h1" lightColor="#fff" style={{ marginTop: Spacing.xl }}>
            {isProfessional ? 'Ready to Start' : 'Confirmed'}
          </ThemedText>
          <ThemedText lightColor="#fff" style={{ marginTop: Spacing.lg, fontSize: 20, textAlign: 'center', paddingHorizontal: 40 }}>
            {isProfessional 
              ? `Your consultation with ${booking.patientName} is confirmed. Start when ready.`
              : `${professional.name} has confirmed. Waiting for them to start the call.`
            }
          </ThemedText>

          {/* Show countdown if scheduled in future */}
          {!booking.isEmergency && timeRemaining > 0 && (
            <View style={[styles.timerContainer, { backgroundColor: '#fff', marginTop: 40 }]}>
              <Feather name="clock" size={40} color={theme.success} />
              <ThemedText type="h1" style={{ color: theme.success, marginTop: Spacing.md }}>
                {formatTimeRemaining(timeRemaining)}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary }}>until scheduled time</ThemedText>
            </View>
          )}

          {isProfessional && (
            <Pressable
              style={[styles.bigCallButton, { backgroundColor: '#fff', marginTop: 60 }]}
              onPress={handleStartCall}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="large" color={theme.success} />
              ) : (
                <>
                  <Feather name="video" size={60} color={theme.success} />
                  <ThemedText type="h2" style={{ color: theme.success, marginTop: 16 }}>
                    Start Consultation
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}

          {!isProfessional && (
            <ThemedText type="caption" lightColor="#fff" style={{ marginTop: Spacing.xl, opacity: 0.8, textAlign: 'center', paddingHorizontal: 40 }}>
              You'll receive a notification when {professional.name} starts the call
            </ThemedText>
          )}

          {error && (
            <ThemedText lightColor="#fff" style={{ marginTop: Spacing.lg, textAlign: 'center', paddingHorizontal: 40 }}>
              ⚠️ {error}
            </ThemedText>
          )}

          <PrimaryButton
            title="Close"
            onPress={onClose}
            variant="outlined"
            lightColor="#fff"
            style={{ marginTop: 50, borderColor: '#fff' }}
            disabled={loading}
          />
        </View>
      </Modal>
    );
  }

  // ✅ IN PROGRESS - Both can join
  if (isInProgress) {
    const sessionMinutes = Math.floor(sessionTimeRemaining / 60000);
    const sessionSeconds = Math.floor((sessionTimeRemaining % 60000) / 1000);
    
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="video" size={80} color="#fff" />
          
          {/* Session Timer */}
          {consultationExpiresAt && (
            <View style={[styles.sessionTimer, { backgroundColor: sessionMinutes < 5 ? theme.error : '#fff' }]}>
              <Feather name="clock" size={20} color={sessionMinutes < 5 ? '#fff' : theme.primary} />
              <ThemedText 
                type="h3" 
                lightColor={sessionMinutes < 5 ? '#fff' : theme.primary}
                style={{ marginLeft: 8 }}
              >
                {sessionMinutes}:{sessionSeconds.toString().padStart(2, '0')}
              </ThemedText>
            </View>
          )}

          <ThemedText type="h1" lightColor="#fff" style={{ marginTop: Spacing.xl }}>
            {isProfessional ? 'Consultation Active' : 'Consultation Ready'}
          </ThemedText>
          
          <ThemedText lightColor="#fff" style={{ marginTop: Spacing.lg, fontSize: 18, textAlign: 'center', paddingHorizontal: 40 }}>
            {isProfessional 
              ? `Patient: ${booking.patientName}`
              : `Professional: ${professional.name}`
            }
          </ThemedText>

          {isProfessional ? (
            <>
              <ThemedText type="caption" lightColor="#fff" style={{ marginTop: Spacing.md, opacity: 0.8, textAlign: 'center', paddingHorizontal: 40 }}>
                You can start a new call within the 30-minute window if there's a connection issue
              </ThemedText>
              
              <Pressable
                style={[styles.bigCallButton, { backgroundColor: '#fff', marginTop: 60 }]}
                onPress={handleStartCall}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <>
                    <Feather name="phone" size={60} color={theme.primary} />
                    <ThemedText type="h2" style={{ color: theme.primary, marginTop: 16 }}>
                      Start Call
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="caption" lightColor="#fff" style={{ marginTop: Spacing.md, opacity: 0.8, textAlign: 'center', paddingHorizontal: 40 }}>
                Tap below to join the consultation call
              </ThemedText>
              
              <Pressable
                style={[styles.bigCallButton, { backgroundColor: '#fff', marginTop: 60 }]}
                onPress={handleJoinCall}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <>
                    <Feather name="phone" size={60} color={theme.primary} />
                    <ThemedText type="h2" style={{ color: theme.primary, marginTop: 16 }}>
                      Join Call
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </>
          )}

          {error && (
            <ThemedText lightColor="#fff" style={{ marginTop: Spacing.lg, textAlign: 'center', paddingHorizontal: 40 }}>
              ⚠️ {error}
            </ThemedText>
          )}

          <PrimaryButton
            title="Close"
            onPress={onClose}
            variant="outlined"
            lightColor="#fff"
            style={{ marginTop: 50, borderColor: '#fff' }}
            disabled={loading}
          />
        </View>
      </Modal>
    );
  }

  return null;
};

// RATING MODAL COMPONENT
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
      Alert.alert("Rating Required", "Please select a rating before submitting");
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
      Alert.alert("Thank You!", "Your review has been submitted successfully");
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (booking.rated) return null;

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
            <ThemedText type="h3" lightColor="#fff">Rate Your Consultation</ThemedText>
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
                How was your consultation?
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
                Additional Comments (Optional)
              </ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="Share your experience..."
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
              title="Skip"
              onPress={onClose}
              variant="outlined"
              style={{ flex: 1 }}
              disabled={submitting}
            />
            <PrimaryButton
              title={submitting ? "Submitting..." : "Submit Review"}
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
    width: 150, 
    height: 150, 
    borderRadius: 75,
    borderWidth: 5,
    borderColor: '#fff',
  },
  sessionTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 20,
  },
  timerContainer: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
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