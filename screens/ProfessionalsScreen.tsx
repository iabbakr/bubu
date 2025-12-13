// screens/ProfessionalsScreen.tsx - UPDATED

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spacing, BorderRadius } from "../constants/theme";
import { professionalService, Professional, Booking, Review } from "../services/professionalService";
// IMPORTANT: Assuming firebaseService contains the walletService logic for this context
import { firebaseService } from "../services/firebaseService"; 
// IMPORTANT: Assuming ConsultationModal and RatingModal are imported from their own file (ConsultationModal.tsx)
import { ConsultationModal, RatingModal } from "../components/ConsultationModal";
import i18n from "../lib/i18n";
import { useNavigation } from "@react-navigation/native"; 

type ProfessionalType = "doctor" | "pharmacist" | "therapist" | "dentist" | "lawyer";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x400/6366f1/ffffff?text=Doctor";

export default function ProfessionalsScreen({ route }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  // 🛑 ADDED: Navigation instance
  const navigation = useNavigation<any>(); 
  
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [selectedType, setSelectedType] = useState<"all" | ProfessionalType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false); // ✅ NEW STATE: Emergency Modal
  const [showProfile, setShowProfile] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [professionalReviews, setProfessionalReviews] = useState<Review[]>([]);

  useEffect(() => {
    loadProfessionals();
    const params = route.params as { type?: ProfessionalType };
    if (params?.type) setSelectedType(params.type);
  }, [route.params]);

  useEffect(() => {
    filterProfessionals();
  }, [professionals, selectedType, searchQuery]);

  const loadProfessionals = async () => {
    try {
      setLoading(true);
      const data = await professionalService.getAllProfessionals();
      
      const mappedData = data.map(prof => {
          const professional = prof as Professional;
          return {
              ...professional,
              professionalType: (professional.professionalType || "doctor") as ProfessionalType,
              specialization: professional.specialization || "General Practitioner",
              yearsOfExperience: professional.yearsOfExperience || 0,
              consultationFee: professional.consultationFee || 5000,
              imageUrl: professional.imageUrl || PLACEHOLDER_IMAGE,
              currentQueue: professional.currentQueue || 0,
              nextAvailable: professional.nextAvailable || "Available now",
              responseTime: professional.responseTime || "5 mins",
              rating: professional.rating || 4.5,
              reviewCount: professional.reviewCount || 0,
              isOnline: professional.isOnline || false,
              isVerified: professional.isVerified !== false,
              maxDailySlots: professional.maxDailySlots || 10, 
              // Ensure acceptsEmergency defaults to true if not set, or false based on professional's choice
              acceptsEmergency: professional.acceptsEmergency !== false, 
              workplace: professional.workplace || "", // Ensure workplace is included
          };
      });
      setProfessionals(mappedData as Professional[]);
    } catch (error) {
      Alert.alert(i18n.t("error"), i18n.t("failed_to_load"));
    } finally {
      setLoading(false);
    }
  };

  const filterProfessionals = () => {
    let filtered = professionals;
    if (selectedType !== "all") {
      filtered = filtered.filter((p) => (p.professionalType as ProfessionalType) === selectedType);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.specialization?.toLowerCase().includes(query)
      );
    }
    setFilteredProfessionals(filtered);
  };

  const handleViewProfile = async (professional: Professional) => {
    setSelectedProfessional(professional);
    try {
      const reviews = await professionalService.getProfessionalReviews(professional.uid);
      setProfessionalReviews(reviews);
      setShowProfile(true);
    } catch (error) {
       Alert.alert(i18n.t("error"), i18n.t("failed_to_load_reviews"));
    }
  };

  const handleBookNow = (professional: Professional) => {
    if (!user) {
      Alert.alert(i18n.t("sign_in_required"), i18n.t("please_sign_in"));
      return;
    }
    setSelectedProfessional(professional);
    setShowBookingModal(true);
  };

  const handleEmergency = (professional: Professional) => { 
    if (!user) {
      Alert.alert(i18n.t("sign_in_required"), i18n.t("please_sign_in"));
      return;
    }
    // Check for offline status and if they accept emergency
    if (!professional.isOnline || professional.acceptsEmergency === false) {
        Alert.alert(i18n.t("not_available"), i18n.t("professional_not_available_emergency"));
        return;
    }
    setSelectedProfessional(professional);
    setShowEmergencyModal(true);
  };
  
  // ✅ ADDED: Call History Navigation Handler
  const handleViewCallHistory = () => {
      if (!user) {
          Alert.alert(i18n.t("sign_in_required"), i18n.t("please_sign_in"));
          return;
      }
      
      // Determine the navigation target based on user role (assuming 'CallHistory' is a dedicated screen/tab)
      navigation.navigate('CallHistory');
  };


  const renderProfessionalCard = ({ item }: { item: Professional }) => {
    const safeItem = {
      ...item,
      professionalType: (item.professionalType || "doctor") as ProfessionalType,
      specialization: item.specialization || "Healthcare Professional",
      yearsOfExperience: item.yearsOfExperience || 0,
      consultationFee: item.consultationFee || 5000,
      rating: item.rating || 4.5,
      reviewCount: item.reviewCount || 0,
      currentQueue: item.currentQueue || 0,
      nextAvailable: item.nextAvailable || "Available now",
      responseTime: item.responseTime || "5 mins",
      imageUrl: item.imageUrl || PLACEHOLDER_IMAGE,
      isOnline: item.isOnline || false,
      isVerified: item.isVerified !== false,
      maxDailySlots: item.maxDailySlots || 10,
      acceptsEmergency: item.acceptsEmergency !== false,
      workplace: item.workplace || "", // Ensure workplace is available
    };

    const typeColors: Record<ProfessionalType, string> = {
      doctor: theme.error,
      pharmacist: theme.success,
      therapist: theme.warning,
      dentist: theme.info,
      lawyer: "#8b5cf6",
    };

    const typeIcons: Record<ProfessionalType, keyof typeof Feather.glyphMap> = {
      doctor: "activity",
      pharmacist: "package",
      therapist: "heart",
      dentist: "smile",
      lawyer: "briefcase",
    };

    const typeColor = typeColors[safeItem.professionalType] || theme.primary;
    const typeIcon = typeIcons[safeItem.professionalType] || "user";

    return (
      <Pressable
        key={safeItem.uid}
        style={[styles.professionalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => handleViewProfile(safeItem)}
      >
        {/* Top Section: Image on Left, Info on Right */}
        <View style={styles.topSection}>
          {/* Left: Image Container */}
          <View style={styles.imageWrapper}>
            <Image source={{ uri: safeItem.imageUrl }} style={styles.professionalImage} />
            
            {/* Badges Overlay on Image */}
            <View style={styles.imageBadges}>
              {safeItem.isOnline && (
                <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
                  <View style={styles.pulseDot} />
                  <ThemedText lightColor="#fff" style={styles.statusText}>
                    {i18n.t("online")}
                  </ThemedText>
                </View>
              )}
              {safeItem.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: theme.info }]}>
                  <Feather name="shield" size={14} color="#fff" />
                </View>
              )}
            </View>
          </View>

          {/* Right: Professional Info */}
          <View style={styles.profInfoContainer}>
            <View style={styles.nameRow}>
              <ThemedText weight="bold" style={styles.profName}>
                {safeItem.name}
              </ThemedText>
              <View style={styles.ratingRow}>
              <Feather name="star" size={14} color="#fbbf24" />
              <ThemedText weight="medium" style={styles.ratingText}>
                {safeItem.rating.toFixed(1)}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                ({safeItem.reviewCount})
              </ThemedText>
            </View>
            </View>
            
            <ThemedText style={[styles.specialization, { color: theme.textSecondary }]}>

              <Feather name={typeIcon} size={13} color={typeColor} />{" "}
              {safeItem.specialization}
            </ThemedText>

            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              {safeItem.yearsOfExperience} {i18n.t("years_experience")}
            </ThemedText>

            {/* ✅ ADDED: Workplace below years of experience */}
            {safeItem.workplace ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Feather name="briefcase" size={12} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                  {safeItem.workplace}
                </ThemedText>
              </View>
            ) : null}

            <View style={[styles.feeContainer, { backgroundColor: theme.primary + "15", marginTop: 8 }]}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {i18n.t("consultation_fee")}
              </ThemedText>
              <ThemedText weight="bold" style={{ color: theme.primary, fontSize: 18 }}>
                ₦{safeItem.consultationFee.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom Section: Stats, Queue Info, and Actions */}
        <View style={styles.bottomSection}>
          {/* Stats Grid */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.info + "15" }]}>
              <Feather name="users" size={13} color={theme.info} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {i18n.t("queue")}
              </ThemedText>
              <ThemedText weight="bold" style={{ color: theme.info, fontSize: 8 }}>
                {safeItem.currentQueue}
              </ThemedText>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.success + "15" }]}>
              <Feather name="clock" size={13} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {i18n.t("next_slot")}
              </ThemedText>
              <ThemedText weight="medium" style={{ color: theme.success, fontSize: 8 }}>
                {safeItem.nextAvailable}
              </ThemedText>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.warning + "15" }]}>
              <Feather name="zap" size={13} color={theme.warning} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {i18n.t("avg_response")}
              </ThemedText>
              <ThemedText weight="medium" style={{ color: theme.warning, fontSize: 8 }}>
                {safeItem.responseTime}
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, flex: 1 }]}
              onPress={() => handleViewProfile(safeItem)}
            >
              <Feather name="user" size={16} color={theme.text} />
              <ThemedText weight="medium" style={{ marginLeft: 6 }}>
                {i18n.t("view_profile")}
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary, flex: 1.2 }]}
              onPress={() => handleBookNow(safeItem)}
            >
              <Feather name="calendar" size={16} color="#fff" />
              <ThemedText lightColor="#fff" weight="medium" style={{ marginLeft: 6 }}>
                {i18n.t("schedule_consultation")}
              </ThemedText>
            </Pressable>
          </View>

          {/* Emergency Button */}
          {safeItem.acceptsEmergency && safeItem.isOnline && (
            <Pressable
              style={[styles.emergencyButton, { backgroundColor: theme.error }]}
              onPress={() => handleEmergency(safeItem)}
            >
              <Feather name="zap" size={18} color="#fff" />
              <ThemedText lightColor="#fff" weight="bold" style={{ marginLeft: 8 }}>
                🚨 {i18n.t("emergency_consultation")} - ₦10,000
              </ThemedText>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText type="h2">{i18n.t("healthcare_professionals")}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {i18n.t("connect_with_experts")}
            </ThemedText>
          </View>
          
          <View style={styles.headerActions}>
            <View style={[styles.onlineBadge, { backgroundColor: theme.success + "20" }]}>
              <Feather name="check-circle" size={14} color={theme.success} />
              <ThemedText type="caption" weight="medium" style={{ color: theme.success }}>
                {professionals.filter(p => p.isOnline).length} {i18n.t("online")}
              </ThemedText>
            </View>
            {/* ✅ ADDED: Call History Icon */}
            {user && (
              <Pressable 
                onPress={handleViewCallHistory} 
                style={[styles.callHistoryIcon, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="phone" size={24} color={theme.text} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={i18n.t("search_professionals")}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
          <View style={styles.filterRow}>
            {(["all", "doctor", "pharmacist", "therapist", "dentist", "lawyer"] as const).map((type) => {
              const filterIcons: Record<typeof type, keyof typeof Feather.glyphMap> = {
                all: "users",
                doctor: "activity",
                pharmacist: "package",
                therapist: "heart",
                dentist: "smile",
                lawyer: "briefcase",
              };
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: selectedType === type ? theme.primary : theme.cardBackground,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Feather
                    name={filterIcons[type]}
                    size={16}
                    color={selectedType === type ? "#fff" : theme.text}
                  />
                  <ThemedText
                    weight="medium"
                    lightColor={selectedType === type ? "#fff" : theme.text}
                    style={{ fontSize: 13, marginLeft: Spacing.xs }}
                  >
                    {type === "all" ? i18n.t("all") : type.charAt(0).toUpperCase() + type.slice(1)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: Spacing["3xl"] }} />
      ) : (
        <FlatList
          data={filteredProfessionals}
          keyExtractor={(item) => item.uid}
          renderItem={renderProfessionalCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={64} color={theme.textSecondary} />
              <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
                {i18n.t("no_professionals_found")}
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Profile Modal */}
      {showProfile && selectedProfessional && (
        <ProfileModal
          professional={selectedProfessional}
          reviews={professionalReviews}
          onClose={() => setShowProfile(false)}
          onBook={() => {
            setShowProfile(false);
            handleBookNow(selectedProfessional);
          }}
          // ✅ UPDATED: Added onEmergency prop
          onEmergency={() => { 
            setShowProfile(false);
            handleEmergency(selectedProfessional);
          }}
        />
      )}

      {/* Booking Modal (Regular Scheduled) */}
      {showBookingModal && selectedProfessional && (
        <BookingModal
          professional={selectedProfessional}
          onClose={() => setShowBookingModal(false)}
          onConfirm={(booking) => {
            setCurrentBooking(booking);
            setShowBookingModal(false);
            setShowConsultation(true); // Go directly to Consultation Modal (Waiting state)
          }}
        />
      )}
      
      {/* ✅ NEW MODAL: Emergency Modal */}
      {showEmergencyModal && selectedProfessional && (
        <EmergencyModal
            professional={selectedProfessional}
            onClose={() => setShowEmergencyModal(false)}
            onConfirm={(booking) => {
                setCurrentBooking(booking);
                setShowEmergencyModal(false);
                setShowConsultation(true); // Go directly to Consultation Modal (Pending Confirmation state)
            }}
        />
      )}

      {/* Consultation Modal (For Scheduled and Emergency) */}
      {showConsultation && selectedProfessional && currentBooking && (
        <ConsultationModal
          professional={selectedProfessional}
          booking={currentBooking}
          onClose={() => {
            setShowConsultation(false);
            // After consultation closes, trigger rating. The internal logic of ConsultationModal should handle when this happens.
            setShowRating(true); 
          }}
        />
      )}

      {/* Rating Modal */}
      {showRating && selectedProfessional && currentBooking && (
        <RatingModal
          professional={selectedProfessional}
          booking={currentBooking}
          onClose={() => {
            setShowRating(false);
            setCurrentBooking(null);
            setSelectedProfessional(null);
            loadProfessionals();
          }}
        />
      )}
    </View>
  );
}

// ===================================
// MODAL COMPONENTS (Updated/New)
// ===================================

// Profile Modal Component (Updated with Emergency Button)
const ProfileModal = ({ professional, reviews, onClose, onBook, onEmergency }: {
    professional: Professional;
    reviews: Review[];
    onClose: () => void;
    onBook: () => void;
    onEmergency: () => void; // ✅ UPDATED: Added onEmergency
  }) => {
    const { theme } = useTheme();
    // ✅ Logic to determine if emergency button should be active
    const acceptsEmergency = professional.acceptsEmergency !== false && professional.isOnline;
  
    return (
      <Modal visible animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
              <ThemedText type="h3" lightColor="#fff">{professional.name}</ThemedText>
              <Pressable onPress={onClose}><Feather name="x" size={24} color="#fff" /></Pressable>
            </View>
  
            <ScrollView style={styles.modalBody}>
              <View style={{ alignItems: "center", marginBottom: Spacing.lg }}>
                
                <Image source={{ uri: professional.imageUrl || PLACEHOLDER_IMAGE }} style={styles.profileImageLarge} />

              
                <ThemedText type="h3" style={{ marginTop: Spacing.md }}>{professional.name}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {professional.specialization}
                </ThemedText>
  
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.sm }}>
                  {[...Array(5)].map((_, i) => (
                    <Feather
                      key={i}
                      name="star"
                      size={18}
                      color={i < Math.round(professional.rating || 0) ? "#fbbf24" : theme.border}
                      style={{ marginRight: 4 }}
                    />
                  ))}
                  <ThemedText weight="medium" style={{ marginLeft: Spacing.xs }}>
                    {professional.rating?.toFixed(1)} ({professional.reviewCount} {i18n.t("reviews")})
                  </ThemedText>
                </View>
              </View>
  
              {professional.bio && (
                <View style={{ marginBottom: Spacing.lg }}>
                  <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                    {i18n.t("about")}
                  </ThemedText>
                  <ThemedText style={{ color: theme.textSecondary }}>{professional.bio}</ThemedText>
                </View>
              )}
  
              <View style={{ marginBottom: Spacing.lg }}>
                <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                  {i18n.t("details")}
                </ThemedText>
                <View style={[styles.detailRow, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="caption">{i18n.t("experience")}</ThemedText>
                  <ThemedText weight="medium">{professional.yearsOfExperience} {i18n.t("years")}</ThemedText>
                </View>
                <View style={[styles.detailRow, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="caption">{i18n.t("consultation_fee")}</ThemedText>
                  <ThemedText weight="medium">₦{professional.consultationFee?.toLocaleString()}</ThemedText>
                </View>
                {professional.languages && professional.languages.length > 0 && (
                  <View style={[styles.detailRow, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText type="caption">{i18n.t("languages")}</ThemedText>
                    <ThemedText weight="medium">{professional.languages.join(", ")}</ThemedText>
                  </View>
                )}
                {professional.workplace && (
                  <View style={[styles.detailRow, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText type="caption">{i18n.t("workplace")}</ThemedText>
                    <ThemedText weight="medium">{professional.workplace}</ThemedText>
                  </View>
                )}
              </View>
  
              {reviews.length > 0 && (
                <View>
                  <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
                    {i18n.t("recent_reviews")}
                  </ThemedText>
                  {reviews.slice(0, 3).map((review) => (
                    <View
                      key={review.id}
                      style={[styles.reviewCard, { backgroundColor: theme.backgroundSecondary }]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.xs }}>
                        {[...Array(5)].map((_, i) => (
                          <Feather
                            key={i}
                            name="star"
                            size={12}
                            color={i < review.rating ? "#fbbf24" : theme.border}
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        "{review.comment}"
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                        - {review.patientName}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
  
            <View style={[styles.modalFooter, { borderTopColor: theme.border, flexDirection: 'column', gap: Spacing.sm }]}>
              <PrimaryButton title={i18n.t("book_consultation")} onPress={onBook} style={{ width: '100%' }} />
              {acceptsEmergency && (
                <PrimaryButton 
                    title={"🚨 " + i18n.t("emergency_consultation")} 
                    onPress={onEmergency} 
                    style={{ width: '100%', backgroundColor: theme.error }} 
                />
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

// BookingModal Component (Scheduled) - Logic is unchanged, but included for completeness
const BookingModal = ({ professional, onClose, onConfirm }: {
  professional: Professional;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedDate && selectedDate.length >= 10) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      // Assuming getAvailableSlots is implemented to handle date format
      const slots = await professionalService.getAvailableSlots(professional.uid, selectedDate);
      setAvailableSlots(slots);
      setSelectedTime("");
    } catch (error) {
      Alert.alert(i18n.t("error"), i18n.t("failed_to_load_slots"));
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !user) {
      Alert.alert(i18n.t("error"), i18n.t("select_date_time"));
      return;
    }

    if (selectedDate.length < 10) {
      Alert.alert(i18n.t("error"), i18n.t("invalid_date_format"));
      return;
    }

    setSubmitting(true);
    try {
      const booking = await professionalService.createBooking({
        professionalId: professional.uid,
        patientId: user.uid,
        patientName: user.name || "Patient",
        professionalName: professional.name,
        date: selectedDate,
        time: selectedTime,
        consultationType: "video",
        reason: reason.trim() || null,
        fee: professional.consultationFee!,
        
      });

      onConfirm(booking);
    } catch (error: any) {
      Alert.alert(i18n.t("error"), error.message || i18n.t("booking_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
              <ThemedText type="h3" lightColor="#fff">{i18n.t("schedule_consultation")}</ThemedText>
              <Pressable onPress={onClose} disabled={submitting}>
                <Feather name="x" size={24} color="#fff" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={[styles.professionalInfo, { backgroundColor: theme.backgroundSecondary }]}>
                
                <Image source={{ uri: professional.imageUrl || PLACEHOLDER_IMAGE }} style={styles.modalImage} />
                
                <View>
                  <ThemedText weight="medium">{professional.name}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {professional.specialization}
                  </ThemedText>
                  <ThemedText weight="medium" style={{ color: theme.primary, marginTop: Spacing.xs }}>
                    ₦{professional.consultationFee?.toLocaleString()}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.infoBox, { backgroundColor: theme.info + "15", borderColor: theme.info, marginTop: Spacing.md }]}>
                <Feather name="info" size={20} color={theme.info} />
                <ThemedText style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
                  {i18n.t("payment_on_hold")}
                </ThemedText>
              </View>

              <View style={styles.section}>
                <ThemedText weight="medium">{i18n.t("date")} (YYYY-MM-DD)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  placeholder="e.g., 2025-12-15"
                  placeholderTextColor={theme.textSecondary}
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  editable={!submitting}
                />
              </View>

              <View style={styles.section}>
                <ThemedText weight="medium">{i18n.t("available_time_slots")}</ThemedText>
                {loadingSlots ? (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    {i18n.t("loading")}...
                  </ThemedText>
                ) : availableSlots.length === 0 ? (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                    {selectedDate ? i18n.t("no_slots_available") : i18n.t("select_date_first")}
                  </ThemedText>
                ) : (
                  <View style={styles.timeGrid}>
                    {availableSlots.map(time => (
                      <Pressable
                        key={time}
                        style={[
                          styles.timeSlot,
                          {
                            backgroundColor: selectedTime === time ? theme.primary + "20" : theme.backgroundSecondary,
                            borderColor: selectedTime === time ? theme.primary : theme.border
                          }
                        ]}
                        onPress={() => setSelectedTime(time)}
                        disabled={submitting}
                      >
                        <ThemedText weight="medium" style={{ color: selectedTime === time ? theme.primary : theme.text }}>
                          {time}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <ThemedText weight="medium">{i18n.t("consultation_reason")} ({i18n.t("optional")})</ThemedText>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  placeholder={i18n.t("describe_symptoms")}
                  placeholderTextColor={theme.textSecondary}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  numberOfLines={4}
                  editable={!submitting}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <PrimaryButton
                title={i18n.t("cancel")}
                onPress={onClose}
                variant="outlined"
                style={{ flex: 1 }}
                disabled={submitting}
              />
              <PrimaryButton
                title={submitting ? i18n.t("submitting") : i18n.t("submit_request")}
                onPress={handleConfirm}
                disabled={!selectedDate || !selectedTime || submitting}
                style={{ flex: 1, marginLeft: Spacing.sm }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ✅ NEW MODAL: Emergency Modal
const EmergencyModal = ({ professional, onClose, onConfirm }: {
    professional: Professional;
    onClose: () => void;
    onConfirm: (booking: Booking) => void;
  }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
  
    const handleConfirm = async () => {
      if (!user) return;
      setSubmitting(true);
  
      try {
        // IMPORTANT: We pass firebaseService here, assuming it holds the walletService functionality
        const booking = await professionalService.createEmergencyBooking(
          professional.uid,
          user.uid,
          user.name || "Patient",
          professional.name,
          reason.trim() || null,
          firebaseService
        );
        
        onConfirm(booking);
      } catch (error: any) {
        Alert.alert(i18n.t("error"), error.message || i18n.t("emergency_booking_failed"));
      } finally {
        setSubmitting(false);
      }
    };
  
    return (
      <Modal visible animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.error }]}>
                <ThemedText type="h3" lightColor="#fff">🚨 {i18n.t("emergency_consultation")}</ThemedText>
                <Pressable onPress={onClose} disabled={submitting}>
                  <Feather name="x" size={24} color="#fff" />
                </Pressable>
              </View>
  
              <ScrollView style={styles.modalBody}>
                <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
                    <Image source={{ uri: professional.imageUrl || PLACEHOLDER_IMAGE }} style={styles.profileImageLarge} />
                    <ThemedText type="h2" style={{ marginTop: Spacing.md, color: theme.error }}>
                        {i18n.t("immediate_attention")}
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
                        {i18n.t("confirm_emergency_with")} **{professional.name}**.
                    </ThemedText>
                    <View style={[styles.infoBox, { backgroundColor: theme.error + "15", borderColor: theme.error, marginTop: Spacing.lg }]}>
                        <Feather name="alert-triangle" size={20} color={theme.error} />
                        <ThemedText style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
                            {i18n.t("professional_must_respond")}. {i18n.t("fee")}: **₦10,000**
                        </ThemedText>
                    </View>
                </View>

                <View style={styles.section}>
                  <ThemedText weight="medium">{i18n.t("brief_emergency_reason")}</ThemedText>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                    placeholder={i18n.t("describe_symptoms_briefly")}
                    placeholderTextColor={theme.textSecondary}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={4}
                    editable={!submitting}
                  />
                </View>
              </ScrollView>
  
              <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                <PrimaryButton
                  title={i18n.t("cancel")}
                  onPress={onClose}
                  variant="outlined"
                  style={{ flex: 1 }}
                  disabled={submitting}
                />
                <PrimaryButton
                  title={submitting ? i18n.t("requesting") : i18n.t("start_emergency")}
                  onPress={handleConfirm}
                  disabled={submitting}
                  style={{ flex: 1, marginLeft: Spacing.sm, backgroundColor: theme.error }}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };
  
// Note: The original styles in the prompt need to be replaced by the improved styles for the components to render correctly.

const styles = StyleSheet.create({
  container: { flex: 1,
  paddingTop: 100,
 },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  callHistoryIcon: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 16 },
  filterRow: { flexDirection: "row", gap: Spacing.sm },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1
  },
  listContent: { padding: Spacing.lg },

  // ===== IMPROVED PROFESSIONAL CARD STYLES =====
  professionalCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  // Top Section (Image + Info side by side)
  topSection: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  imageWrapper: {
    position: "relative",
    width: 120,
    height: 120,
  },

  professionalImage: {
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius.lg,
    resizeMode: "cover"
  },

  imageBadges: {
    position: "absolute",
    top: 6,
    right: 6,
    gap: 4,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4
  },

  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff"
  },

  statusText: {
    fontSize: 10,
    fontWeight: "600"
  },

  verifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center"
  },

  profInfoContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  profName: {
    fontSize: 18,
    flex: 1,
  },

  specialization: {
    fontSize: 14,
    marginBottom: 6,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },

  ratingText: {
    fontSize: 14,
  },

  feeContainer: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },

  // Bottom Section (Stats + Actions)
  bottomSection: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },

  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  statBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },

  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },

  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  // Other existing styles...
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100
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
  modalBody: { padding: Spacing.lg, maxHeight: 500 },
  professionalInfo: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.lg
  },
  modalImage: { width: 60, height: 60, borderRadius: 30 },
  section: { marginBottom: Spacing.lg },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    minHeight: 100,
    textAlignVertical: "top"
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm
  },
  timeSlot: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    minWidth: "30%",
    alignItems: "center"
  },
  modalFooter: { flexDirection: "row", padding: Spacing.lg, borderTopWidth: 1 },
  profileImageLarge: { width: 120, height: 120, borderRadius: 60 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs
  },
  reviewCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm
  },
  infoBox: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xl,
    alignItems: 'center'
  },
});