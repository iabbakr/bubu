// screens/ProfessionalDashboardScreen.tsx - FINAL FIX

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
  ActivityIndicator, 
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spacing, BorderRadius } from "../constants/theme";
import { professionalService, Booking, Professional, TimeSlot, Review } from "../services/professionalService";
import { useNavigation } from '@react-navigation/native';
import { firebaseService } from "../services/firebaseService"; 
import { walletService } from "../services/walletService"; 
import { ConsultationModal, RatingModal } from "../components/ConsultationModal";
import i18n from "../lib/i18n";
import { uploadImageToCloudinary } from "../lib/cloudinary";

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/100x100/6366f1/ffffff?text=U";


export default function ProfessionalDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

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
  const [acceptsEmergency, setAcceptsEmergency] = useState(false);
  
  // Modals
  const [showAvailability, setShowAvailability] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Availability state
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [startDateInput, setStartDateInput] = useState('2024-01-01'); 
  const [endDateInput, setEndDateInput] = useState('2099-12-31');
  
  // Profile editor state
  const [editedProfile, setEditedProfile] = useState({
    bio: "",
    specialization: "",
    yearsOfExperience: 0,
    consultationFee: 0,
    workplace: "",
    languages: [] as string[],
    imageUrl: "", 
  });
  const [languageInput, setLanguageInput] = useState("");
  const [localImageUri, setLocalImageUri] = useState<string | null>(null); 
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
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
        
        let availabilityData = profileData.availability || [];
        
        // Ensure all 7 days exist with defaults
        if (availabilityData.length < DAYS_OF_WEEK.length) {
          const defaultSlots = DAYS_OF_WEEK.map((day, index) => ({
            id: `slot_${day}`,
            day,
            startTime: '09:00 AM',
            endTime: '05:00 PM',
            slotDuration: 30,
            isEnabled: index < 5, 
          }));
          
          // Merge existing slots over defaults
          availabilityData = defaultSlots.map(defaultSlot => {
            const existing = availabilityData.find(slot => slot.day === defaultSlot.day);
            return existing ? { ...defaultSlot, ...existing } : defaultSlot;
          });
        }
        
        setAvailability(availabilityData);
        setAcceptsEmergency(profileData.acceptsEmergency || false);
        
        // Initialize profile editor
        setEditedProfile({
          bio: profileData.bio || "",
          specialization: profileData.specialization || "",
          yearsOfExperience: profileData.yearsOfExperience || 0,
          consultationFee: profileData.consultationFee || 0,
          workplace: profileData.workplace || "",
          languages: profileData.languages || [],
          imageUrl: profileData.imageUrl || "",
        });
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
  
  const handleImagePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant media library access to select a profile picture.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setLocalImageUri(result.assets[0].uri);
    }
  };
  
  const handleSaveProfile = async () => {
    if (!user) return;
    setUploadingImage(true);

    try {
      let finalImageUrl = editedProfile.imageUrl;
      const updateData: Partial<Professional> = { ...editedProfile };

      // 1. Handle image upload if a new one was selected
      if (localImageUri) {
        const uploadedUrl = await uploadImageToCloudinary(localImageUri, "professional_profiles");
        finalImageUrl = uploadedUrl;
      }
      
      updateData.imageUrl = finalImageUrl;
      
      // 2. Save profile data to Firestore (including new image URL)
      await professionalService.updateProfessionalProfile(user.uid, updateData);
      
      Alert.alert(i18n.t("success"), "Profile updated successfully");
      setShowProfileEditor(false);
      setLocalImageUri(null);
      loadDashboardData();
    } catch (error) {
      console.error("Failed to update profile:", error);
      Alert.alert(i18n.t("error"), "Failed to update profile. Please try again.");
    } finally {
      setUploadingImage(false);
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

  const handleToggleEmergency = async (value: boolean) => {
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

  const handleAddLanguage = () => {
    if (languageInput.trim() && !editedProfile.languages.includes(languageInput.trim())) {
      setEditedProfile({
        ...editedProfile,
        languages: [...editedProfile.languages, languageInput.trim()]
      });
      setLanguageInput("");
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    setEditedProfile({
      ...editedProfile,
      languages: editedProfile.languages.filter(l => l !== lang)
    });
  };

  const handleSaveAvailability = async () => {
    try {
      setSavingAvailability(true);
      
      const validSlots = availability.filter(slot => 
        slot.day && slot.startTime && slot.endTime && slot.slotDuration > 0
      );

      if (validSlots.length === 0) {
        Alert.alert(i18n.t("error"), "Please add at least one valid time slot");
        return;
      }

      await professionalService.setAvailability(user!.uid, validSlots);
      Alert.alert(i18n.t("success"), "Availability updated successfully");
      setShowAvailability(false);
      loadDashboardData();
    } catch (error: any) {
      console.error("Save availability error:", error);
      Alert.alert(i18n.t("error"), error.message || "Failed to save availability");
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleToggleDay = (id: string) => {
    setAvailability(availability.map(slot =>
      slot.id === id ? { ...slot, isEnabled: !slot.isEnabled } : slot
    ));
  };

  const handleUpdateSlot = (id: string, field: keyof TimeSlot, value: any) => {
    setAvailability(availability.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      // 🌟 FIX: Pass walletService instead of firebaseService
      await professionalService.confirmBooking(bookingId, user!.uid, walletService); 
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
      // 🌟 FIX: Pass walletService instead of firebaseService
      await professionalService.rejectBooking(bookingId, user!.uid, rejectionReason, walletService);
      Alert.alert(i18n.t("success"), i18n.t("booking_rejected"));
      setShowBookingDetails(false);
      setRejectionReason("");
      loadDashboardData();
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("failed_to_reject"));
    }
  };

  const handleStartConsultation = async (bookingId: string) => {
    const bookingToStart = bookings.find(b => b.id === bookingId);
    if (!bookingToStart || !user || !profile) {
        Alert.alert(i18n.t("error"), "Booking or profile not found");
        return;
    }

    try {
      // 🔥 FIX: Use the service method that initiates the call and sends the notification
      const callId = await professionalService.initiateCall(bookingId, user.uid);
      
      const updatedBooking: Booking = { 
        ...bookingToStart, 
        status: "in_progress",
        callStartedAt: bookingToStart.callStartedAt || Date.now(),
        callInitiatedBy: user.uid,
        canStartCall: true,
        currentCallId: callId,
      };

      setCurrentBooking(updatedBooking);
      setShowConsultation(true);
      
      loadDashboardData();
    } catch (error: any) {
      console.error("Call initiation failed:", error);
      Alert.alert(i18n.t("error"), error.message || "Failed to start consultation");
    }
  };

  const handleCompleteConsultation = async (bookingId: string) => {
    try {
      // 🌟 FIX: Pass walletService instead of firebaseService
      await professionalService.completeBooking(bookingId, walletService);
      Alert.alert(i18n.t("success"), "Consultation completed. Payment received.");
      loadDashboardData();
    } catch (error) {
      Alert.alert(i18n.t("error"), "Failed to complete consultation");
    }
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
      case "pending_confirmation": return "Pending Confirmation";
      case "confirmed": return "Confirmed";
      case "ready": return "Ready to Start";
      case "in_progress": return "In Progress";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      case "rejected": return "Rejected";
      default: return status;
    }
  };

// ProfessionalDashboardScreen.tsx - FIXED: Always show queue counter
// Key changes:
// - **FIX: Added 'ready' status to the Start Consultation button logic.**
// - Show queue position for ALL patients, not just professionals
// - Fixed button visibility logic for confirmed bookings

const renderBookingCard = (booking: Booking) => {
  const isUpcoming = booking.scheduledTimestamp && booking.scheduledTimestamp > Date.now();
  const timeUntil = booking.scheduledTimestamp 
    ? Math.floor((booking.scheduledTimestamp - Date.now()) / 60000)
    : 0;

  return (
    <Pressable
      key={booking.id}
      style={[styles.bookingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => {
        setSelectedBooking(booking);
        setShowBookingDetails(true);
      }}
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
          
          {/* 🔥 FIX: Always show queue position for everyone */}
          {booking.queuePosition && booking.queuePosition > 0 && (
            <View style={[styles.queueBadge, { backgroundColor: theme.primary + "20", marginTop: Spacing.xs }]}>
              <ThemedText type="caption" weight="medium" style={{ color: theme.primary }}>
                Queue Position #{booking.queuePosition}
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
              ? `Starts in ${timeUntil} minutes` 
              : `Starts in ${Math.floor(timeUntil / 60)} hours`}
          </ThemedText>
        </View>
      )}

      {booking.reason && (
        <View style={[styles.reasonBox, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Reason: {booking.reason}
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

      <View style={styles.actionButtons}>
          {(booking.status === "pending_confirmation" || booking.status === "emergency_pending") && (
              <>
              <PrimaryButton
                  title="Confirm"
                  onPress={() => {
                    setSelectedBooking(booking);
                    setShowBookingDetails(true);
                  }}
                  style={{ flex: 1, marginRight: Spacing.xs }}
              />
              <PrimaryButton
                  title="Reject"
                  onPress={() => {
                    setSelectedBooking(booking);
                    setShowBookingDetails(true);
                  }}
                  variant="outlined"
                  style={{ flex: 1 }}
              />
              </>
          )}

          {/* 🌟 FIX: Show "Start Consultation" for confirmed, emergency_confirmed, OR ready statuses */}
          {(booking.status === "confirmed" || booking.status === "emergency_confirmed" || booking.status === "ready") && (
              <PrimaryButton
              title="Start Consultation"
              onPress={() => handleStartConsultation(booking.id)}
              style={{ flex: 1 }}
              />
          )}
          
          {/* 🔥 FIX: Show Continue/Complete only for in_progress */}
          {booking.status === "in_progress" && (
              <>
                  <PrimaryButton
                      title="Continue"
                      onPress={() => handleStartConsultation(booking.id)}
                      style={{ flex: 1, marginRight: Spacing.xs }}
                  />
                  <PrimaryButton
                      title="Complete"
                      onPress={() => handleCompleteConsultation(booking.id)}
                      variant="outlined"
                      style={{ flex: 1 }}
                  />
              </>
          )}

          {/* Remove the redundant 'ready' message since the button is now visible when 'ready' */}
          {/* {booking.status === "ready" && !booking.canStartCall && (
              <ThemedText type="caption" style={{ color: theme.textSecondary, alignSelf: 'center', paddingVertical: Spacing.sm }}>
                  Call available 15 mins before scheduled time
              </ThemedText>
          )} */}
      </View>
    </Pressable>
  );
};

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ThemedText>Loading...</ThemedText>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ThemedText>Profile not found</ThemedText>
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
              
              {profile.workplace && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Feather name="briefcase" size={12} color={theme.textSecondary} />
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                    {profile.workplace}
                  </ThemedText>
                </View>
              )}
              
              <View style={styles.onlineToggle}>
                <ThemedText weight="medium">Available for consultations</ThemedText>
                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  trackColor={{ false: theme.border, true: theme.success + "40" }}
                  thumbColor={isOnline ? theme.success : theme.textSecondary}
                />
              </View>

              <View style={[styles.onlineToggle, { marginTop: Spacing.sm }]}>
                  <ThemedText weight="medium">Accept Emergency</ThemedText>
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
            {renderStatCard("users", "Total Bookings", stats.totalBookings, theme.primary)}
            {renderStatCard("check-circle", "Completed", stats.completedConsultations, theme.success)}
            {renderStatCard("star", "Rating", stats.averageRating.toFixed(1), theme.warning)}
            {renderStatCard("dollar-sign", "Earnings", `₦${stats.totalEarnings.toLocaleString()}`, theme.info)}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.quickActionButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAvailability(true)}
            >
              <Feather name="calendar" size={20} color="#fff" />
              <ThemedText lightColor="#fff" weight="medium" style={{ marginTop: Spacing.xs }}>
                Manage Availability
              </ThemedText>
            </Pressable>
            
            <Pressable
              style={[styles.quickActionButton, { backgroundColor: theme.warning }]}
              onPress={() => setShowReviews(true)}
            >
              <Feather name="star" size={20} color="#fff" />
              <ThemedText lightColor="#fff" weight="medium" style={{ marginTop: Spacing.xs }}>
                Reviews ({reviews.length})
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.quickActionButton, { backgroundColor: theme.info }]}
              onPress={() => {
                setLocalImageUri(null); 
                setShowProfileEditor(true);
              }}
            >
              <Feather name="edit" size={20} color="#fff" />
              <ThemedText lightColor="#fff" weight="medium" style={{ marginTop: Spacing.xs }}>
                Edit Profile
              </ThemedText>
            </Pressable>
          </View>

          {/* Pending Confirmations */}
          {bookings.filter(b => b.status === "pending_confirmation" || b.status === "emergency_pending").length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { backgroundColor: theme.warning + "20" }]}>
                <Feather name="alert-circle" size={20} color={theme.warning} />
                <ThemedText type="h4" style={{ marginLeft: Spacing.sm, color: theme.warning }}>
                  Pending Actions ({bookings.filter(b => b.status === "pending_confirmation" || b.status === "emergency_pending").length})
                </ThemedText>
              </View>
              {bookings.filter(b => b.status === "pending_confirmation" || b.status === "emergency_pending").map(renderBookingCard)}
            </View>
          )}

          {/* Bookings Section */}
          <View style={styles.section}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Upcoming & Recent Consultations
            </ThemedText>
            
            {bookings.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="calendar" size={48} color={theme.textSecondary} />
                <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                  No bookings yet
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

        {/* Profile Editor Modal - UPDATED WITH IMAGE UPLOAD */}
        <Modal visible={showProfileEditor} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1, justifyContent: "flex-end" }}
            >
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                  <ThemedText type="h3" lightColor="#fff">Edit Profile</ThemedText>
                  <Pressable onPress={() => setShowProfileEditor(false)} disabled={uploadingImage}>
                    <Feather name="x" size={24} color="#fff" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Image Upload Section */}
                  <View style={[styles.section, { alignItems: 'center' }]}>
                    <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>Profile Picture</ThemedText>
                    <Pressable 
                      style={[styles.profileImageEditor, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                      onPress={handleImagePick}
                      disabled={uploadingImage}
                    >
                      <Image 
                        source={{ uri: localImageUri || editedProfile.imageUrl || PLACEHOLDER_IMAGE }} 
                        style={styles.profileImageEdit} 
                      />
                      <View style={[styles.cameraIcon, { backgroundColor: theme.primary }]}>
                        <Feather name="camera" size={20} color="#fff" />
                      </View>
                    </Pressable>
                    {(localImageUri && !uploadingImage) && (
                      <ThemedText type="caption" style={{ color: theme.success, marginTop: Spacing.xs }}>
                        New image selected. Save to upload.
                      </ThemedText>
                    )}
                  </View>
                  
                  <View style={styles.section}>
                    <ThemedText weight="medium">Bio</ThemedText>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                      placeholder="Tell patients about yourself..."
                      placeholderTextColor={theme.textSecondary}
                      value={editedProfile.bio}
                      onChangeText={(text) => setEditedProfile({...editedProfile, bio: text})}
                      multiline
                      numberOfLines={4}
                      editable={!uploadingImage}
                    />
                  </View>

                  <View style={styles.section}>
                    <ThemedText weight="medium">Specialization</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                      placeholder="e.g., General Practitioner"
                      placeholderTextColor={theme.textSecondary}
                      value={editedProfile.specialization}
                      onChangeText={(text) => setEditedProfile({...editedProfile, specialization: text})}
                      editable={!uploadingImage}
                    />
                  </View>

                  <View style={styles.section}>
                    <ThemedText weight="medium">Workplace / Clinic</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                      placeholder="e.g., City General Hospital"
                      placeholderTextColor={theme.textSecondary}
                      value={editedProfile.workplace}
                      onChangeText={(text) => setEditedProfile({...editedProfile, workplace: text})}
                      editable={!uploadingImage}
                    />
                  </View>

                  <View style={styles.section}>
                    <ThemedText weight="medium">Years of Experience</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                      placeholder="e.g., 5"
                      placeholderTextColor={theme.textSecondary}
                      value={editedProfile.yearsOfExperience.toString()}
                      onChangeText={(text) => setEditedProfile({...editedProfile, yearsOfExperience: parseInt(text) || 0})}
                      keyboardType="numeric"
                      editable={!uploadingImage}
                    />
                  </View>

                  <View style={styles.section}>
                    <ThemedText weight="medium">Consultation Fee (₦)</ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                      placeholder="e.g., 5000"
                      placeholderTextColor={theme.textSecondary}
                      value={editedProfile.consultationFee.toString()}
                      onChangeText={(text) => setEditedProfile({...editedProfile, consultationFee: parseInt(text) || 0})}
                      keyboardType="numeric"
                      editable={!uploadingImage}
                    />
                  </View>

                  <View style={styles.section}>
                    <ThemedText weight="medium">Languages</ThemedText>
                    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border, flex: 1 }]}
                        placeholder="Add a language"
                        placeholderTextColor={theme.textSecondary}
                        value={languageInput}
                        onChangeText={setLanguageInput}
                        editable={!uploadingImage}
                      />
                      <PrimaryButton 
                        title="Add" 
                        onPress={handleAddLanguage} 
                        style={{ paddingHorizontal: 20 }} 
                        disabled={uploadingImage}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                      {editedProfile.languages.map((lang) => (
                        <View key={lang} style={[styles.languageChip, { backgroundColor: theme.primary + "20", borderColor: theme.primary }]}>
                          <ThemedText type="caption" style={{ color: theme.primary }}>{lang}</ThemedText>
                          <Pressable onPress={() => handleRemoveLanguage(lang)} disabled={uploadingImage}>
                            <Feather name="x" size={14} color={theme.primary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                  <PrimaryButton
                    title="Cancel"
                    onPress={() => setShowProfileEditor(false)}
                    variant="outlined"
                    style={{ flex: 1 }}
                    disabled={uploadingImage}
                  />
                  <PrimaryButton
                    title={uploadingImage ? "Saving..." : "Save Profile"}
                    onPress={handleSaveProfile}
                    disabled={uploadingImage}
                    style={{ flex: 1, marginLeft: Spacing.sm }}
                    icon={uploadingImage ? <ActivityIndicator color="#fff" /> : undefined}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Availability Modal - UPDATED WITH DATE RANGE INPUTS */}
        <Modal visible={showAvailability} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1, justifyContent: "flex-end" }}
            >
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                  <ThemedText type="h3" lightColor="#fff">Manage Availability</ThemedText>
                  <Pressable onPress={() => setShowAvailability(false)} disabled={savingAvailability}>
                    <Feather name="x" size={24} color="#fff" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* --- Schedule Duration Section --- */}
                  <View style={[styles.section, { marginBottom: Spacing.md }]}>
                    <ThemedText weight="medium" style={{ marginBottom: Spacing.xs }}>Schedule Duration</ThemedText>
                    <View style={styles.dateRangeContainer}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="caption" style={{ marginBottom: 4 }}>Start Date (YYYY-MM-DD)</ThemedText>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                          value={startDateInput}
                          onChangeText={setStartDateInput}
                          placeholder="e.g., 2024-01-01"
                          placeholderTextColor={theme.textSecondary}
                          editable={!savingAvailability}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="caption" style={{ marginBottom: 4 }}>End Date (YYYY-MM-DD)</ThemedText>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                          value={endDateInput}
                          onChangeText={setEndDateInput}
                          placeholder="e.g., 2099-12-31"
                          placeholderTextColor={theme.textSecondary}
                          editable={!savingAvailability}
                        />
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.infoBox, { backgroundColor: theme.info + "15", borderColor: theme.info }]}>
                    <Feather name="info" size={20} color={theme.info} />
                    <ThemedText style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
                      Define your recurring **weekly schedule** below. This schedule applies between the **Start Date** and **End Date** above.
                    </ThemedText>
                  </View>

                  {/* --- Weekly Schedule Definition --- */}
                  {availability.map((slot) => (
                    <View
                      key={slot.id}
                      style={[
                        styles.availabilitySlot,
                        { 
                          backgroundColor: slot.isEnabled ? theme.backgroundSecondary : theme.border + "20",
                          opacity: slot.isEnabled ? 1 : 0.6
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
                        <ThemedText weight="bold">{slot.day}</ThemedText>
                        <Switch
                          value={slot.isEnabled}
                          onValueChange={() => handleToggleDay(slot.id)}
                          trackColor={{ false: theme.border, true: theme.success + "40" }}
                          thumbColor={slot.isEnabled ? theme.success : theme.textSecondary}
                          disabled={savingAvailability}
                        />
                      </View>

                      {slot.isEnabled && (
                        <>
                          <View style={{ marginBottom: Spacing.sm }}>
                            <ThemedText type="caption" style={{ marginBottom: 4 }}>Start Time</ThemedText>
                            <TextInput
                              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                              value={slot.startTime}
                              onChangeText={(text) => handleUpdateSlot(slot.id, 'startTime', text)}
                              placeholder="e.g., 09:00 AM"
                              placeholderTextColor={theme.textSecondary}
                              editable={!savingAvailability}
                            />
                          </View>

                          <View style={{ marginBottom: Spacing.sm }}>
                            <ThemedText type="caption" style={{ marginBottom: 4 }}>End Time</ThemedText>
                            <TextInput
                              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                              value={slot.endTime}
                              onChangeText={(text) => handleUpdateSlot(slot.id, 'endTime', text)}
                              placeholder="e.g., 05:00 PM"
                              placeholderTextColor={theme.textSecondary}
                              editable={!savingAvailability}
                            />
                          </View>

                          <View>
                            <ThemedText type="caption" style={{ marginBottom: 4 }}>Slot Duration (minutes)</ThemedText>
                            <TextInput
                              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                              value={slot.slotDuration.toString()}
                              onChangeText={(text) => handleUpdateSlot(slot.id, 'slotDuration', parseInt(text) || 30)}
                              keyboardType="numeric"
                              placeholder="e.g., 30"
                              placeholderTextColor={theme.textSecondary}
                              editable={!savingAvailability}
                            />
                          </View>
                        </>
                      )}
                    </View>
                  ))}
                </ScrollView>

                <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                  <PrimaryButton
                    title="Cancel"
                    onPress={() => setShowAvailability(false)}
                    variant="outlined"
                    style={{ flex: 1 }}
                    disabled={savingAvailability}
                  />
                  <PrimaryButton
                    title={savingAvailability ? "Saving..." : "Save Availability"}
                    onPress={handleSaveAvailability}
                    disabled={savingAvailability}
                    style={{ flex: 1, marginLeft: Spacing.sm }}
                  />
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Booking Details Modal (unchanged logic) */}
        <Modal visible={showBookingDetails} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1, justifyContent: "flex-end" }}
            >
              <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                  <ThemedText type="h3" lightColor="#fff">Booking Details</ThemedText>
                  <Pressable onPress={() => setShowBookingDetails(false)}>
                    <Feather name="x" size={24} color="#fff" />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody}>
                  {selectedBooking && (
                    <>
                      <View style={[styles.detailSection, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText weight="medium" style={{ marginBottom: Spacing.md }}>
                          Patient Information
                        </ThemedText>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">Name</ThemedText>
                          <ThemedText weight="medium">{selectedBooking.patientName}</ThemedText>
                        </View>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">Date</ThemedText>
                          <ThemedText weight="medium">{selectedBooking.date}</ThemedText>
                        </View>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">Time</ThemedText>
                          <ThemedText weight="medium">{selectedBooking.time}</ThemedText>
                        </View>
                        <View style={styles.detailRow}>
                          <ThemedText type="caption">Fee</ThemedText>
                          <ThemedText weight="medium">₦{selectedBooking.fee.toLocaleString()}</ThemedText>
                        </View>
                      </View>

                      {selectedBooking.reason && (
                        <View style={[styles.detailSection, { backgroundColor: theme.backgroundSecondary }]}>
                          <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                            Consultation Reason
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
                              Payment will be held until you confirm and complete the consultation.
                            </ThemedText>
                          </View>

                          <View style={styles.section}>
                            <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                              Rejection Reason (if rejecting)
                            </ThemedText>
                            <TextInput
                              style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                              placeholder="Enter reason for rejection..."
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
                      title="Reject"
                      onPress={() => handleRejectBooking(selectedBooking!.id)}
                      variant="outlined"
                      style={{ flex: 1 }}
                    />
                    <PrimaryButton
                      title="Confirm Booking"
                      onPress={() => handleConfirmBooking(selectedBooking!.id)}
                      style={{ flex: 1, marginLeft: Spacing.sm }}
                    />
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Reviews Modal (unchanged logic) */}
        <Modal visible={showReviews} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                <ThemedText type="h3" lightColor="#fff">Patient Reviews</ThemedText>
                <Pressable onPress={() => setShowReviews(false)}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                {reviews.length === 0 ? (
                  <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="star" size={48} color={theme.textSecondary} />
                    <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                      No reviews yet
                    </ThemedText>
                  </View>
                ) : (
                  reviews.map((review) => (
                    <View
                      key={review.id}
                      style={[styles.reviewCard, { backgroundColor: theme.backgroundSecondary }]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.xs }}>
                        {[...Array(5)].map((_, i) => (
                          <Feather
                            key={i}
                            name="star"
                            size={14}
                            color={i < review.rating ? "#fbbf24" : theme.border}
                            style={{ marginRight: 2 }}
                          />
                        ))}
                        <ThemedText type="caption" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      {review.comment && (
                        <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
                          "{review.comment}"
                        </ThemedText>
                      )}
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                        - {review.patientName}
                      </ThemedText>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Consultation Modal */}
      {showConsultation && currentBooking && profile && (
          <ConsultationModal 
            professional={profile}
            booking={currentBooking}
            onClose={() => {
              setShowConsultation(false);
              setCurrentBooking(null);
            }}
          />
        )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
  profileImageEditor: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  profileImageEdit: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 60, 
    opacity: 0.8 
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 8,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
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
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    minWidth: "48%",
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
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
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
  },
  reviewCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  }
});