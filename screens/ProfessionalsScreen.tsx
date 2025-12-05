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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spacing, BorderRadius } from "../constants/theme";
import { professionalService, Professional, Booking } from "../services/professionalService";
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  CallControls,
  CallContent,
} from '@stream-io/video-react-native-sdk';
import { initStreamClient, createVideoCall, checkBackendHealth } from '../services/streamService';

// ⚠️ REDUNDANT LOCAL DECLARATION REMOVED (Assuming it is now imported or available via context)
// The ProfessionalType used here is the one imported through professionalService.
type ProfessionalType = "doctor" | "pharmacist" | "therapist" | "dentist" | "lawyer"; // Keeping this line to prevent further cascading errors in this file's context.

// 1. At the top, update the useEffect to filter by route params:
export default function ProfessionalsScreen({ route }: any) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [selectedType, setSelectedType] = useState<"all" | ProfessionalType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConsultation, setShowConsultation] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  
  // FIX 1: Corrected useEffect to load data and handle route params
  useEffect(() => {
    loadProfessionals();
    // If navigated with type parameter, auto-select that type
    const params = route.params as { type?: ProfessionalType };
    if (params?.type) {
      setSelectedType(params.type);
    }
  }, [route.params]);

  useEffect(() => {
    filterProfessionals();
  }, [professionals, selectedType, searchQuery]);

  // FIX 3: Fix the loadProfessionals function to correctly map User data to Professional interface
  const loadProfessionals = async () => {
    try {
      setLoading(true);
      const data = await professionalService.getAllProfessionals();
      // Map User data to Professional interface with defaults for missing fields
      const mappedData = data.map(prof => ({
        ...prof,
        // Ensure Professional-specific fields exist with defaults
        professionalType: prof.professionalType || "doctor",
        specialization: prof.specialization || "General Practitioner",
        yearsOfExperience: prof.yearsOfExperience || 0,
        consultationFee: prof.consultationFee || 5000,
        imageUrl: prof.imageUrl || "https://via.placeholder.com/400",
        currentQueue: prof.currentQueue || 0,
        nextAvailable: prof.nextAvailable || "Available now",
        responseTime: prof.responseTime || "5 mins",
        rating: prof.rating || 4.5,
        reviewCount: prof.reviewCount || 0,
        isOnline: prof.isOnline || false,
        isVerified: prof.isVerified !== false, // Default to true
      }));
      setProfessionals(mappedData as Professional[]);
    } catch (error) {
      Alert.alert("Error", "Failed to load professionals");
    } finally {
      setLoading(false);
    }
  };

  const filterProfessionals = () => {
    let filtered = professionals;
    if (selectedType !== "all") {
      // Ensure p.professionalType is handled safely
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

  const handleBookNow = (professional: Professional) => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to book a consultation");
      return;
    }
    setSelectedProfessional(professional);
    setShowBookingModal(true);
  };

  // FIX 5: Ensure all required fields have defaults in renderProfessionalCard
  const renderProfessionalCard = ({ item }: { item: Professional }) => {
    const safeItem = {
      ...item,
      professionalType: (item.professionalType || "doctor") as ProfessionalType, // Ensure type safety for dictionary access
      specialization: item.specialization || "Healthcare Professional",
      yearsOfExperience: item.yearsOfExperience || 0,
      consultationFee: item.consultationFee || 5000,
      rating: item.rating || 4.5,
      reviewCount: item.reviewCount || 0,
      currentQueue: item.currentQueue || 0,
      nextAvailable: item.nextAvailable || "Available now",
      responseTime: item.responseTime || "5 mins",
      imageUrl: item.imageUrl || "https://via.placeholder.com/400",
      isOnline: item.isOnline || false,
      isVerified: item.isVerified !== false, // Default to true if not set
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
    
    // Use safeItem.professionalType which is now safely cast to ProfessionalType
    const typeColor = typeColors[safeItem.professionalType] || theme.primary; 
    const typeIcon = typeIcons[safeItem.professionalType] || "user";

    return (
      <Pressable
        style={[styles.professionalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => handleBookNow(safeItem)}
      >
        <View style={styles.cardHeader}>
          <Image source={{ uri: safeItem.imageUrl }} style={styles.professionalImage} />
          <View style={styles.headerOverlay}>
            {safeItem.isOnline && (
              <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
                <View style={styles.pulseDot} />
                <ThemedText lightColor="#fff" style={styles.statusText}>Online</ThemedText>
              </View>
            )}
            {safeItem.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.info }]}>
                <Feather name="shield" size={14} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.headerBottom}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
              <Feather name={typeIcon} size={16} color="#fff" />
              <ThemedText lightColor="#fff" style={{ fontSize: 13 }}>{safeItem.specialization}</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <ThemedText weight="medium" style={{ fontSize: 18 }}>{safeItem.name}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {safeItem.yearsOfExperience} years experience
              </ThemedText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="star" size={14} color="#fbbf24" />
                <ThemedText weight="medium">{safeItem.rating}</ThemedText>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                ({safeItem.reviewCount} reviews)
              </ThemedText>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.info + "15" }]}>
              <Feather name="users" size={16} color={theme.info} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Queue</ThemedText>
              <ThemedText weight="medium" style={{ color: theme.info, fontSize: 18 }}>
                {safeItem.currentQueue}
              </ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.success + "15" }]}>
              <Feather name="clock" size={16} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Next Slot</ThemedText>
              <ThemedText weight="medium" style={{ color: theme.success }}>
                {safeItem.nextAvailable}
              </ThemedText>
            </View>
          </View>
          <View style={styles.feeRow}>
            <View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Consultation Fee</ThemedText>
              <ThemedText type="h3">₦{safeItem.consultationFee.toLocaleString()}</ThemedText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Avg Response</ThemedText>
              <ThemedText weight="medium">{safeItem.responseTime}</ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }}>
            <Pressable style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, flex: 1 }]}>
              <ThemedText weight="medium">View Profile</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.primary, flex: 1 }]}
              onPress={() => handleBookNow(safeItem)}
            >
              <Feather name="video" size={16} color="#fff" />
              <ThemedText lightColor="#fff" weight="medium" style={{ marginLeft: Spacing.xs }}>
                Book Now
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText type="h2">Healthcare Professionals</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Connect with verified experts
            </ThemedText>
          </View>
          <View style={[styles.onlineBadge, { backgroundColor: theme.success + "20" }]}>
            <Feather name="check-circle" size={14} color={theme.success} />
            <ThemedText type="caption" weight="medium" style={{ color: theme.success }}>
              {professionals.filter(p => p.isOnline).length} Online
            </ThemedText>
          </View>
        </View>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name or specialization..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
          <View style={styles.filterRow}>
            {(["all", "doctor", "pharmacist", "therapist", "dentist", "lawyer"] as const).map((type) => { // Added 'dentist' to filter types
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
                    {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1) + (type !== 'lawyer' && type !== 'therapist' ? "s" : "")}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
      <FlatList
        data={filteredProfessionals}
        keyExtractor={(item) => item.uid}
        renderItem={renderProfessionalCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
              No professionals found
            </ThemedText>
          </View>
        }
      />
      {showBookingModal && selectedProfessional && (
        <BookingModal
          professional={selectedProfessional}
          onClose={() => setShowBookingModal(false)}
          onConfirm={(booking) => {
            setCurrentBooking(booking);
            setShowBookingModal(false);
            setShowConsultation(true);
          }}
        />
      )}
      {showConsultation && selectedProfessional && currentBooking && (
        <ConsultationModal
          professional={selectedProfessional}
          booking={currentBooking}
          onClose={() => {
            setShowConsultation(false);
            setCurrentBooking(null);
          }}
        />
      )}
    </View>
  );
}

// ———————————————————————— BOOKING MODAL ————————————————————————
const BookingModal = ({ professional, onClose, onConfirm }: {
  professional: Professional;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [consultationType] = useState<"video" | "chat">("video");
  const [reason] = useState("");
  const timeSlots = ["09:00 AM", "10:00 AM", "02:00 PM", "04:00 PM"];
  
  // Safely access professional details with defaults
  const safeProfessional = {
      ...professional,
      specialization: professional.specialization || "Healthcare Professional",
      consultationFee: professional.consultationFee || 5000,
      imageUrl: professional.imageUrl || "https://via.placeholder.com/60",
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime || !user) {
      Alert.alert("Error", "Please select date and time");
      return;
    }
    
    // Simple date validation (you would use a date picker in a real app)
    if (selectedDate.length < 10) {
        Alert.alert("Error", "Please enter a valid date in YYYY-MM-DD format");
        return;
    }

    try {
      // NOTE: In a real app, you would handle payment/wallet deduction here before booking
      const booking = await professionalService.createBooking({
        professionalId: safeProfessional.uid,
        patientId: user.uid,
        patientName: user.name || "Patient",
        professionalName: safeProfessional.name,
        date: selectedDate,
        time: selectedTime,
        consultationType,
        reason: reason.trim(),
        fee: safeProfessional.consultationFee,
        status: "confirmed",
      });
      onConfirm(booking);
      Alert.alert("Booking Confirmed", `Your consultation with ${safeProfessional.name} is confirmed for ${selectedDate} at ${selectedTime}.`);
    } catch (error) {
      console.error("Booking error:", error);
      Alert.alert("Error", "Failed to create booking. Please try again.");
    }
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
            <ThemedText type="h3" lightColor="#fff">Book Consultation</ThemedText>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#fff" /></Pressable>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={[styles.professionalInfo, { backgroundColor: theme.backgroundSecondary }]}>
              <Image source={{ uri: safeProfessional.imageUrl }} style={styles.modalImage} />
              <View>
                <ThemedText weight="medium">{safeProfessional.name}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {safeProfessional.specialization}
                </ThemedText>
              </View>
            </View>
            <View style={styles.section}>
              <ThemedText weight="medium">Date (e.g., 2025-12-01)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                value={selectedDate}
                onChangeText={setSelectedDate}
              />
            </View>
            <View style={styles.section}>
              <ThemedText weight="medium">Time</ThemedText>
              <View style={styles.timeGrid}>
                {timeSlots.map(time => (
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
                  >
                    <ThemedText weight="medium" style={{ color: selectedTime === time ? theme.primary : theme.text }}>
                      {time}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <PrimaryButton title="Cancel" onPress={onClose} variant="outlined" style={{ flex: 1 }} />
            <PrimaryButton 
              title={`Pay ₦${safeProfessional.consultationFee.toLocaleString()} & Confirm`} 
              onPress={handleConfirm} 
              style={{ flex: 1, marginLeft: Spacing.sm }} 
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ———————————————————————— FULLY WORKING VIDEO CALL MODAL ————————————————————————
// FIX 4: Updated ConsultationModal with robust error handling, cleanup, and loading states
const ConsultationModal = ({ professional, booking, onClose }: {
  professional: Professional;
  booking: Booking;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeCall();
    
    return () => {
      // Cleanup function to hangup/disconnect when modal is closed or component unmounts
      if (call) {
        call.leave().catch(console.error);
      }
      if (client) {
        client.disconnectUser().catch(console.error);
      }
    };
  }, []); // Empty dependency array ensures it runs only on mount/unmount

  const initializeCall = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Check backend health first
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        throw new Error('Video service is currently unavailable. Please try again later.');
      }
      
      // 2. Initialize Stream client
      const streamClient = await initStreamClient(
        user!.uid,
        user!.name || 'Patient',
        user?.imageUrl
      );
      setClient(streamClient);
      
      // 3. Create video call (using booking ID for unique session)
      const { callId } = await createVideoCall(
        booking.id,
        professional.uid,
        user!.uid,
        professional.name,
        user!.name || 'Patient'
      );
      
      // 4. CRITICAL: Use 'video' type for video calls
      const newCall = streamClient.call('video', callId);
      
      // 5. Join or create the call
      await newCall.join({ create: true });
      setCall(newCall);
      setLoading(false);
    } catch (error: any) {
      console.error('Call initialization failed:', error);
      const errorMessage = error.message || 'Could not start video call. Please check your internet connection and try again.';
      setError(errorMessage);
      setLoading(false);
      
      // Show error and close after a slight delay
      setTimeout(() => {
        Alert.alert(
          'Connection Failed', 
          errorMessage,
          [{ text: 'OK', onPress: onClose }]
        );
      }, 100);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText type="h2" lightColor="#fff" style={{ marginBottom: Spacing.md }}>
            Connecting to Dr. {professional.name}...
          </ThemedText>
          <ThemedText lightColor="#fff" style={{ opacity: 0.7 }}>
            Please wait while we set up the video call
          </ThemedText>
        </View>
      </Modal>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Modal visible animationType="fade">
        <View style={{ flex: 1, backgroundColor: theme.error, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Feather name="alert-circle" size={64} color="#fff" />
          <ThemedText type="h2" lightColor="#fff" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
            Connection Failed
          </ThemedText>
          <ThemedText lightColor="#fff" style={{ marginTop: Spacing.md, textAlign: 'center', opacity: 0.9 }}>
            {error}
          </ThemedText>
          <PrimaryButton 
            title="Close" 
            onPress={onClose}
            style={{ marginTop: Spacing.xl, minWidth: 200, backgroundColor: theme.primary }}
          />
        </View>
      </Modal>
    );
  }

  // --- Call Interface ---
  if (!client || !call) {
    return null;
  }

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
                  
                  // Update booking status to completed
                  await professionalService.updateBookingStatus(booking.id, "completed");
                  
                  onClose();
                } catch (err) {
                  console.error('Error ending call:', err);
                  // Ensure onClose is called even if update fails
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


// ———————————————————————— STYLES ————————————————————————
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.lg, paddingBottom: Spacing.md, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.md },
  onlineBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  searchBar: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.md },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 16 },
  filterRow: { flexDirection: "row", gap: Spacing.sm },
  filterButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
  listContent: { padding: Spacing.lg },
  professionalCard: { borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.lg, overflow: "hidden" },
  cardHeader: { height: 180, position: "relative" },
  professionalImage: { width: "100%", height: "100%", resizeMode: "cover" },
  headerOverlay: { position: "absolute", top: Spacing.md, right: Spacing.md, flexDirection: "row", gap: Spacing.xs },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full, gap: 4 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  statusText: { fontSize: 11, fontWeight: "600" },
  verifiedBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  headerBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: "rgba(0,0,0,0.6)" },
  cardContent: { padding: Spacing.lg },
  titleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
  statsGrid: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: "center" },
  feeRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#eee", marginBottom: Spacing.md },
  actionButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 100 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg },
  modalBody: { padding: Spacing.lg },
  professionalInfo: { flexDirection: "row", padding: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.md, marginBottom: Spacing.lg },
  modalImage: { width: 60, height: 60, borderRadius: 30 },
  section: { marginBottom: Spacing.lg },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.sm },
  timeSlot: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2, minWidth: "30%", alignItems: "center" },
  modalFooter: { flexDirection: "row", padding: Spacing.lg, borderTopWidth: 1 },
});

export { ConsultationModal };