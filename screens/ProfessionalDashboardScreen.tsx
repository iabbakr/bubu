// screens/ProfessionalDashboardScreen.tsx - FINAL WITH CALL BUTTON LOGIC
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Image,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spacing, BorderRadius } from "../constants/theme";
import { professionalService, Booking, Professional, TimeSlot, Review } from "../services/professionalService";
import { firebaseService } from "../services/firebaseService";
import i18n from "../lib/i18n";
import { useNavigation } from '@react-navigation/native';

export default function ProfessionalDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Professional | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedConsultations: 0,
    cancelledConsultations: 0,
    totalEarnings: 0,
    averageRating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [acceptsEmergency, setAcceptsEmergency] = useState(false); // ✅ Added

  // Availability states
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [showConsultation, setShowConsultation] = useState(false); 
const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);

 const navigation = useNavigation<any>(); // Add this line
 

  useEffect(() => {
    loadDashboardData();
    
    // Check for ready bookings every minute
    const interval = setInterval(() => {
      professionalService.checkAndEnableReadyBookings();
      professionalService.checkAndSendReminders();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const profileData = await professionalService.getProfessional(user.uid);
      if (profileData) {
        setProfile(profileData);
        setIsOnline(profileData.isOnline || false);
        setAvailability(profileData.availability || []);
        setAcceptsEmergency(profileData.acceptsEmergency || false); // ✅ Loaded
      }

      const bookingsData = await professionalService.getProfessionalBookings(user.uid);
      setBookings(bookingsData);

      const reviewsData = await professionalService.getProfessionalReviews(user.uid);
      setReviews(reviewsData);

      const statsData = await professionalService.getProfessionalStats(user.uid);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      Alert.alert(i18n.t("error"), i18n.t("failed_to_load"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleToggleOnline = async (value: boolean) => {
    try {
      setIsOnline(value);
      await professionalService.updateProfessionalStatus(user!.uid, value);
      Alert.alert(
        i18n.t("status_updated"),
        value ? i18n.t("now_online") : i18n.t("now_offline")
      );
    } catch (error) {
      setIsOnline(!value);
      Alert.alert(i18n.t("error"), i18n.t("failed_to_update"));
    }
  };

  const handleToggleEmergency = async (value: boolean) => { // ✅ Added Handler
    try {
      setAcceptsEmergency(value);
      await professionalService.updateProfessionalProfile(user!.uid, { acceptsEmergency: value });
      Alert.alert(
        i18n.t("status_updated"),
        value ? i18n.t("now_accepting_emergency") : i18n.t("not_accepting_emergency")
      );
    } catch (error) {
      setAcceptsEmergency(!value);
      Alert.alert(i18n.t("error"), i18n.t("failed_to_update"));
    }
  };

  const handleViewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await professionalService.confirmBooking(bookingId, user!.uid, firebaseService);
      Alert.alert(i18n.t("success"), i18n.t("booking_confirmed"));
      setShowBookingDetails(false);
      loadDashboardData();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("failed_to_confirm"));
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!rejectionReason.trim()) {
      Alert.alert(i18n.t("error"), i18n.t("please_provide_reason"));
      return;
    }

    try {
      await professionalService.rejectBooking(bookingId, user!.uid, rejectionReason);
      Alert.alert(i18n.t("success"), i18n.t("booking_rejected"));
      setShowBookingDetails(false);
      setRejectionReason("");
      loadDashboardData();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("failed_to_reject"));
    }
  };

  const handleStartConsultation = async (bookingId: string) => {
    // 1. Find the booking object
    const bookingToStart = bookings.find(b => b.id === bookingId);
    if (!bookingToStart || !profile) {
        Alert.alert(i18n.t("error"), "Booking or Profile data missing.");
        return;
    }

    // 2. Set current booking and open the consultation modal
    setCurrentBooking(bookingToStart);
    setShowConsultation(true);

    try {
      // ⚠️ Important: This function only updates the status to 'in_progress'. 
      // The actual video call initiation logic is handled client-side (e.g., in a ConsultationModal).
      // Here, we just set the status to allow the professional to enter the video flow.
      await professionalService.updateBookingStatus(bookingId, "in_progress");
      //Alert.alert(i18n.t("success"), i18n.t("consultation_status_updated"));
      //loadDashboardData();
    } catch (error) {
      Alert.alert(i18n.t("error"), i18n.t("failed_to_start"));
    }
  };

  const handleCompleteConsultation = async (bookingId: string) => {
    try {
      await professionalService.completeBooking(bookingId, firebaseService);
      Alert.alert(i18n.t("success"), i18n.t("consultation_completed_payment_received"));
      loadDashboardData();
    } catch (error) {
      Alert.alert(i18n.t("error"), i18n.t("failed_to_complete"));
    }
  };

  const handleSaveAvailability = async () => {
    try {
      await professionalService.setAvailability(user!.uid, availability);
      Alert.alert(i18n.t("success"), i18n.t("availability_updated"));
      setShowAvailability(false);
      loadDashboardData();
    } catch (error) {
      Alert.alert(i18n.t("error"), i18n.t("failed_to_update"));
    }
  };

  const handleAddAvailabilitySlot = () => {
    setAvailability([
      ...availability,
      {
        id: Date.now().toString(),
        day: "Monday",
        startTime: "09:00 AM",
        endTime: "05:00 PM",
        slotDuration: 30,
      },
    ]);
  };

  const handleRemoveAvailabilitySlot = (id: string) => {
    setAvailability(availability.filter(slot => slot.id !== id));
  };

  const handleUpdateAvailabilitySlot = (id: string, field: keyof TimeSlot, value: any) => {
    setAvailability(availability.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const renderStatCard = (icon: string, label: string, value: string | number, color: string) => (
    <View style={[styles.statCard, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <Feather name={icon as any} size={24} color={color} />
      <ThemedText type="h2" style={{ color, marginTop: Spacing.sm }}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
        {label}
      </ThemedText>
    </View>
  );

  const getStatusColor = (status: Booking["status"]) => {
    switch (status) {
      case "emergency_pending": return theme.error;
      case "emergency_confirmed": return theme.error;
      case "pending_confirmation": return theme.warning;
      case "confirmed": return theme.info;
      case "ready": return theme.success;
      case "in_progress": return theme.primary;
      case "completed": return theme.success;
      case "cancelled": case "rejected": return theme.error;
      default: return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: Booking["status"]) => {
    switch (status) {
      case "emergency_pending": return "EMERGENCY PENDING";
      case "emergency_confirmed": return "EMERGENCY ACCEPTED";
      case "pending_confirmation": return i18n.t("pending_confirmation");
      case "confirmed": return i18n.t("confirmed");
      case "ready": return i18n.t("ready_to_start");
      case "in_progress": return i18n.t("in_progress");
      case "completed": return i18n.t("completed");
      case "cancelled": return i18n.t("cancelled");
      case "rejected": return i18n.t("rejected");
      default: return status;
    }
  };

  const renderBookingCard = (booking: Booking) => {
    const isUpcoming = booking.scheduledTimestamp && booking.scheduledTimestamp > Date.now();
    const timeUntil = booking.scheduledTimestamp 
      ? Math.floor((booking.scheduledTimestamp - Date.now()) / 60000)
      : 0;

    return (
      <Pressable
        key={booking.id}
        style={[styles.bookingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => handleViewBookingDetails(booking)}
      >
        {booking.isEmergency && booking.status === "emergency_pending" && (
          <View style={[styles.emergencyBanner, { backgroundColor: theme.error }]}>
            <Feather name="zap" size={18} color="#fff" />
            <ThemedText lightColor="#fff" weight="bold" style={{ marginLeft: 8 }}>
              EMERGENCY - RESPOND NOW!
            </ThemedText>
          </View>
        )}
        <View style={styles.bookingHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText weight="medium">{booking.patientName}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {booking.date} at {booking.time}
            </ThemedText>
            {booking.queuePosition && booking.queuePosition > 0 && (
              <View style={[styles.queueBadge, { backgroundColor: theme.primary + "20" }]}>
                <ThemedText type="caption" weight="medium" style={{ color: theme.primary }}>
                  {i18n.t("queue_position", { position: booking.queuePosition })}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + "20" }]}>
            <ThemedText type="caption" weight="medium" style={{ color: getStatusColor(booking.status) }}>
              {getStatusLabel(booking.status)}
            </ThemedText>
          </View>
        </View>

        {isUpcoming && (booking.status === "confirmed" || booking.status === "ready") && timeUntil > 0 && (
          <View style={[styles.timerBox, { backgroundColor: theme.warning + "20", borderColor: theme.warning }]}>
            <Feather name="clock" size={16} color={theme.warning} />
            <ThemedText type="caption" style={{ color: theme.warning, marginLeft: Spacing.xs }}>
              {timeUntil < 60 
                ? `${i18n.t("starts_in")} ${timeUntil} ${i18n.t("minutes")}` 
                : `${i18n.t("starts_in")} ${Math.floor(timeUntil / 60)} ${i18n.t("hours")}`}
            </ThemedText>
          </View>
        )}

        {booking.reason && (
          <View style={[styles.reasonBox, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {i18n.t("reason")}: {booking.reason}
            </ThemedText>
          </View>
        )}

        <View style={styles.bookingFooter}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
            <Feather name="video" size={14} color={theme.textSecondary} />
            <ThemedText type="caption">{booking.consultationType}</ThemedText>
          </View>
          <ThemedText weight="medium" style={{ color: theme.primary }}>
            ₦{booking.fee.toLocaleString()}
          </ThemedText>
        </View>

        {/* ✅ UPDATED ACTION BUTTONS LOGIC */}
        <View style={styles.actionButtons}>
            {(booking.status === "pending_confirmation" || booking.status === "emergency_pending") && (
                <>
                <PrimaryButton
                    title={i18n.t("confirm")}
                    onPress={() => handleViewBookingDetails(booking)}
                    style={{ flex: 1, marginRight: Spacing.xs }}
                />
                <PrimaryButton
                    title={i18n.t("reject")}
                    onPress={() => handleViewBookingDetails(booking)}
                    variant="outlined"
                    style={{ flex: 1 }}
                />
                // Inside the Quick Actions section, after the existing buttons

                </>
            )}

            {/* Ready to Start: Scheduled (ready status) OR Confirmed Emergency */}
            {(booking.status === "ready" || booking.status === "emergency_confirmed") && booking.canStartCall && (
                <PrimaryButton
                title={i18n.t("start_consultation")}
                onPress={() => handleStartConsultation(booking.id)} // Sets status to 'in_progress'
                style={{ flex: 1 }}
                />
            )}
            
            {/* In Progress: Show continue and complete */}
            {booking.status === "in_progress" && (
                <>
                    <PrimaryButton
                        title={i18n.t("continue_consultation")}
                        onPress={() => handleStartConsultation(booking.id)} // Resumes/Triggers call flow
                        style={{ flex: 1, marginRight: Spacing.xs }}
                    />
                    <PrimaryButton
                        title={i18n.t("complete_receive_payment")}
                        onPress={() => handleCompleteConsultation(booking.id)}
                        variant="outlined"
                        style={{ flex: 1 }}
                    />
                </>
            )}

            {/* Confirmed but not yet ready (Scheduled only) */}
            {booking.status === "confirmed" && !booking.canStartCall && (
                <ThemedText type="caption" style={{ color: theme.textSecondary, alignSelf: 'center', paddingVertical: Spacing.sm }}>
                    {i18n.t("call_starts_15_mins_before")}
                </ThemedText>
            )}
        </View>
      </Pressable>
    );
  };

  const renderReviewCard = (review: Review) => (
    <View
      key={review.id}
      style={[styles.reviewCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
    >
      <View style={styles.reviewHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText weight="medium">{review.patientName}</ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            {[...Array(5)].map((_, i) => (
              <Feather
                key={i}
                name="star"
                size={14}
                color={i < review.rating ? "#fbbf24" : theme.border}
                style={{ marginRight: 2 }}
              />
            ))}
          </View>
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {new Date(review.createdAt).toLocaleDateString()}
        </ThemedText>
      </View>
      {review.comment && (
        <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
          "{review.comment}"
        </ThemedText>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ThemedText>{i18n.t("loading")}...</ThemedText>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ThemedText>{i18n.t("profile_not_found")}</ThemedText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Profile Header */}
          <View style={[styles.profileCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.imageContainer}>
              {profile.imageUrl ? (
                <Image source={{ uri: profile.imageUrl }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.primary }]}>
                  <Feather name="user" size={40} color="#fff" />
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText type="h3">{profile.name}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {profile.professionalType?.toUpperCase()} • {profile.specialization}
              </ThemedText>
              
              <View style={styles.onlineToggle}>
                <ThemedText weight="medium">{i18n.t("available_for_consultations")}</ThemedText>
                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: theme.border, true: theme.success + "40" }}
                  thumbColor={isOnline ? theme.success : theme.textSecondary}
                />
              </View>
              {/* ✅ NEW EMERGENCY TOGGLE */}
              <View style={[styles.onlineToggle, { marginTop: Spacing.sm }]}>
                  <ThemedText weight="medium">{i18n.t("accept_emergency")}</ThemedText>
                  <Switch
                      value={acceptsEmergency}
                      onValueChange={handleToggleEmergency}
                      trackColor={{ false: theme.border, true: theme.error + "40" }}
                      thumbColor={acceptsEmergency ? theme.error : theme.textSecondary}
                  />
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {renderStatCard("users", i18n.t("total_bookings"), stats.totalBookings, theme.primary)}
            {renderStatCard("check-circle", i18n.t("completed"), stats.completedConsultations, theme.success)}
            {renderStatCard("star", i18n.t("rating"), stats.averageRating.toFixed(1), theme.warning)}
            {renderStatCard("dollar-sign", i18n.t("earnings"), `₦${stats.totalEarnings.toLocaleString()}`, theme.info)}
            <Pressable
  style={[styles.quickActionButton, { backgroundColor: theme.info }]}
  onPress={() => navigation.navigate('VideoCallTest')}
>
  <Feather name="video" size={20} color="#fff" />
  <ThemedText lightColor="#fff" weight="medium" style={{ marginTop: Spacing.xs }}>
    Test Video Call
  </ThemedText>
</Pressable>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.quickActionButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAvailability(true)}
            >
              <Feather name="calendar" size={20} color="#fff" />
              <ThemedText lightColor="#fff" weight="medium" style={{ marginTop: Spacing.xs }}>
                {i18n.t("manage_availability")}
              </ThemedText>
            </Pressable>
            
            <Pressable
              style={[styles.quickActionButton, { backgroundColor: theme.warning }]}
              onPress={() => setShowReviews(true)}
            >
              <Feather name="star" size={20} color="#fff" />
              <ThemedText lightColor="#fff" weight="medium" style={{ marginTop: Spacing.xs }}>
                {i18n.t("reviews")} ({reviews.length})
              </ThemedText>
            </Pressable>
          </View>

          {/* Pending Confirmations */}
          {bookings.filter(b => b.status === "pending_confirmation" || b.status === "emergency_pending").length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { backgroundColor: theme.warning + "20" }]}>
                <Feather name="alert-circle" size={20} color={theme.warning} />
                <ThemedText type="h4" style={{ marginLeft: Spacing.sm, color: theme.warning }}>
                  {i18n.t("pending_actions")} ({bookings.filter(b => b.status === "pending_confirmation" || b.status === "emergency_pending").length})
                </ThemedText>
              </View>
              {bookings.filter(b => b.status === "pending_confirmation" || b.status === "emergency_pending").map(renderBookingCard)}
            </View>
          )}

          {/* Bookings Section */}
          <View style={styles.section}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              {i18n.t("upcoming_recent_consultations")}
            </ThemedText>
            
            {bookings.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="calendar" size={48} color={theme.textSecondary} />
                <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                  {i18n.t("no_bookings_yet")}
                </ThemedText>
              </View>
            ) : (
              bookings
                .filter(b => b.status !== "pending_confirmation" && b.status !== "emergency_pending")
                .slice(0, 10)
                .map(renderBookingCard)
            )}
          </View>
        </View>

        {/* Booking Details Modal */}
        <Modal visible={showBookingDetails} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1, justifyContent: "flex-end" }}
            >
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                  <ThemedText type="h3" lightColor="#fff">{i18n.t("booking_details")}</ThemedText>
                  <Pressable onPress={() => setShowBookingDetails(false)}>
                    <Feather name="x" size={24} color="#fff" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody}>
                  {selectedBooking && (
                    <>
                      <View style={[styles.detailSection, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText weight="medium" style={{ marginBottom: Spacing.md }}>
                          {i18n.t("patient_information")}
                        </ThemedText>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">{i18n.t("name")}</ThemedText>
                          <ThemedText weight="medium">{selectedBooking.patientName}</ThemedText>
                        </View>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">{i18n.t("date")}</ThemedText>
                          <ThemedText weight="medium">{selectedBooking.date}</ThemedText>
                        </View>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">{i18n.t("time")}</ThemedText>
                          <ThemedText weight="medium">{selectedBooking.time}</ThemedText>
                        </View>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">{i18n.t("fee")}</ThemedText>
                          <ThemedText weight="medium">₦{selectedBooking.fee.toLocaleString()}</ThemedText>
                        </View>
                      </View>

                      {selectedBooking.reason && (
                        <View style={[styles.detailSection, { backgroundColor: theme.backgroundSecondary }]}>
                          <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                            {i18n.t("consultation_reason")}
                          </ThemedText>
                          <ThemedText style={{ color: theme.textSecondary }}>
                            {selectedBooking.reason}
                          </ThemedText>
                        </View>
                      )}

                      {(selectedBooking.status === "pending_confirmation" || selectedBooking.status === "emergency_pending") && (
                        <>
                          <View style={[styles.infoBox, { backgroundColor: theme.info + "15", borderColor: theme.info }]}>
                            <Feather name="info" size={20} color={theme.info} />
                            <ThemedText style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
                              {i18n.t("payment_held_until_confirm")}
                            </ThemedText>
                          </View>

                          <View style={styles.section}>
                            <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                              {i18n.t("rejection_reason")} ({i18n.t("if_rejecting")})
                            </ThemedText>
                            <TextInput
                              style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                              placeholder={i18n.t("enter_reason")}
                              placeholderTextColor={theme.textSecondary}
                              value={rejectionReason}
                              onChangeText={setRejectionReason}
                              multiline
                              numberOfLines={3}
                            />
                          </View>
                        </>
                      )}
                    </>
                  )}
                </ScrollView>

                {(selectedBooking?.status === "pending_confirmation" || selectedBooking?.status === "emergency_pending") && (
                  <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                    <PrimaryButton
                      title={i18n.t("reject")}
                      onPress={() => handleRejectBooking(selectedBooking!.id)}
                      variant="outlined"
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      title={i18n.t("confirm_booking")}
                      onPress={() => handleConfirmBooking(selectedBooking!.id)}
                      style={{ flex: 1, marginLeft: Spacing.sm }}
                    />
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Availability Modal (unchanged) */}
        <Modal visible={showAvailability} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1, justifyContent: "flex-end" }}
            >
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                  <ThemedText type="h3" lightColor="#fff">{i18n.t("manage_availability")}</ThemedText>
                  <Pressable onPress={() => setShowAvailability(false)}>
                    <Feather name="x" size={24} color="#fff" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody}>
                  {availability.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="calendar" size={48} color={theme.textSecondary} />
                      <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                        {i18n.t("no_availability_set")}
                      </ThemedText>
                    </View>
                  ) : (
                    availability.map((slot, index) => (
                      <View
                        key={slot.id}
                        style={[styles.availabilitySlot, { backgroundColor: theme.backgroundSecondary }]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText weight="medium">{i18n.t("day")} {index + 1}</ThemedText>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                            value={slot.day}
                            onChangeText={(text) => handleUpdateAvailabilitySlot(slot.id, 'day', text)}
                            placeholder="e.g., Monday"
                            placeholderTextColor={theme.textSecondary}
                          />
                          
                          <ThemedText type="caption" style={{ marginTop: Spacing.sm }}>{i18n.t("start_time")}</ThemedText>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                            value={slot.startTime}
                            onChangeText={(text) => handleUpdateAvailabilitySlot(slot.id, 'startTime', text)}
                            placeholder="e.g., 09:00 AM"
                            placeholderTextColor={theme.textSecondary}
                          />
                          
                          <ThemedText type="caption" style={{ marginTop: Spacing.sm }}>{i18n.t("end_time")}</ThemedText>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                            value={slot.endTime}
                            onChangeText={(text) => handleUpdateAvailabilitySlot(slot.id, 'endTime', text)}
                            placeholder="e.g., 05:00 PM"
                            placeholderTextColor={theme.textSecondary}
                          />
                          
                          <ThemedText type="caption" style={{ marginTop: Spacing.sm }}>{i18n.t("slot_duration")}</ThemedText>
                          <TextInput
                            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                            value={slot.slotDuration.toString()}
                            onChangeText={(text) => handleUpdateAvailabilitySlot(slot.id, 'slotDuration', parseInt(text) || 30)}
                            keyboardType="numeric"
                            placeholder="e.g., 30"
                            placeholderTextColor={theme.textSecondary}
                          />
                        </View>
                        
                        <Pressable onPress={() => handleRemoveAvailabilitySlot(slot.id)}>
                          <Feather name="trash-2" size={20} color={theme.error} />
                        </Pressable>
                      </View>
                    ))
                  )}

                  <PrimaryButton
                    title={i18n.t("add_day")}
                    onPress={handleAddAvailabilitySlot}
                    variant="outlined"
                    style={{ marginTop: Spacing.md }}
                  />
                </ScrollView>

                <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                  <PrimaryButton
                    title={i18n.t("save_availability")}
                    onPress={handleSaveAvailability}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Reviews Modal (unchanged) */}
        <Modal visible={showReviews} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                <ThemedText type="h3" lightColor="#fff">{i18n.t("patient_reviews")}</ThemedText>
                <Pressable onPress={() => setShowReviews(false)}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                {reviews.length === 0 ? (
                  <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="star" size={48} color={theme.textSecondary} />
                    <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                      {i18n.t("no_reviews_yet")}
                    </ThemedText>
                  </View>
                ) : (
                  reviews.map(renderReviewCard)
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ... (Your existing styles here)
  container: { flex: 1, paddingTop: 100 },
  content: { padding: Spacing.lg },
  profileCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  imageContainer: { position: "relative" },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  onlineToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: "48%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  bookingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  queueBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
    alignSelf: "flex-start",
  },
  timerBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  reasonBox: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalBody: {
    padding: Spacing.lg,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  availabilitySlot: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    minHeight: 80,
    textAlignVertical: "top"
  },
  detailSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginVertical: Spacing.md,
    alignItems: 'center'
  },
  emergencyBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: Spacing.sm,
  borderTopLeftRadius: BorderRadius.md,
  borderTopRightRadius: BorderRadius.md,
  margin: -Spacing.lg,
  marginBottom: Spacing.md,
}
});