// screens/ProfessionalDashboardScreen.tsx
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spacing, BorderRadius } from "../constants/theme";
import { professionalService, Booking, Professional } from "../services/professionalService";
import * as ImagePicker from 'expo-image-picker';

export default function ProfessionalDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Professional | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedConsultations: 0,
    cancelledConsultations: 0,
    totalEarnings: 0,
    averageRating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // Profile editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    specialization: "",
    yearsOfExperience: "",
    consultationFee: "",
    bio: "",
    languages: "",
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load profile
      const profileData = await professionalService.getProfessional(user.uid);
      if (profileData) {
        setProfile(profileData);
        setIsOnline(profileData.isOnline || false);
        setEditData({
          specialization: profileData.specialization || "",
          yearsOfExperience: profileData.yearsOfExperience?.toString() || "",
          consultationFee: profileData.consultationFee?.toString() || "",
          bio: profileData.bio || "",
          languages: profileData.languages?.join(", ") || "",
        });
      }

      // Load bookings
      const bookingsData = await professionalService.getProfessionalBookings(user.uid);
      setBookings(bookingsData);

      // Load stats
      const statsData = await professionalService.getProfessionalStats(user.uid);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnline = async (value: boolean) => {
    try {
      setIsOnline(value);
      await professionalService.updateProfessionalStatus(user!.uid, value);
      Alert.alert(
        "Status Updated",
        value ? "You are now online and available for consultations" : "You are now offline"
      );
    } catch (error) {
      setIsOnline(!value);
      Alert.alert("Error", "Failed to update status");
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updateData: Partial<Professional> = {
        specialization: editData.specialization.trim(),
        yearsOfExperience: parseInt(editData.yearsOfExperience) || 0,
        consultationFee: parseFloat(editData.consultationFee) || 0,
        bio: editData.bio.trim(),
        languages: editData.languages.split(",").map(l => l.trim()).filter(Boolean),
      };

      await professionalService.updateProfessionalProfile(user!.uid, updateData);
      
      Alert.alert("Success", "Profile updated successfully");
      setIsEditing(false);
      loadDashboardData();
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const handleUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // In a real app, you'd upload to storage and get URL
        // For now, we'll just use the local URI
        const imageUri = result.assets[0].uri;
        
        await professionalService.updateProfessionalProfile(user!.uid, {
          imageUrl: imageUri,
        });
        
        Alert.alert("Success", "Profile image updated");
        loadDashboardData();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload image");
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await professionalService.updateBookingStatus(bookingId, "confirmed");
      Alert.alert("Success", "Booking confirmed");
      loadDashboardData();
    } catch (error) {
      Alert.alert("Error", "Failed to confirm booking");
    }
  };

  const handleStartConsultation = async (bookingId: string) => {
    try {
      await professionalService.updateBookingStatus(bookingId, "in_progress");
      Alert.alert("Success", "Consultation started");
      loadDashboardData();
    } catch (error) {
      Alert.alert("Error", "Failed to start consultation");
    }
  };

  const handleCompleteConsultation = async (bookingId: string) => {
    try {
      await professionalService.updateBookingStatus(bookingId, "completed");
      Alert.alert("Success", "Consultation completed");
      loadDashboardData();
    } catch (error) {
      Alert.alert("Error", "Failed to complete consultation");
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

  const renderBookingCard = (booking: Booking) => {
    const getStatusColor = () => {
      switch (booking.status) {
        case "pending": return theme.warning;
        case "confirmed": return theme.info;
        case "in_progress": return theme.primary;
        case "completed": return theme.success;
        case "cancelled": return theme.error;
        default: return theme.textSecondary;
      }
    };

    return (
      <View
        key={booking.id}
        style={[styles.bookingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      >
        <View style={styles.bookingHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText weight="medium">{booking.patientName}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {booking.date} at {booking.time}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + "20" }]}>
            <ThemedText type="caption" weight="medium" style={{ color: getStatusColor() }}>
              {booking.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>

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

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {booking.status === "pending" && (
            <PrimaryButton
              title="Accept"
              onPress={() => handleAcceptBooking(booking.id)}
              style={{ flex: 1 }}
            />
          )}
          {booking.status === "confirmed" && (
            <PrimaryButton
              title="Start Consultation"
              onPress={() => handleStartConsultation(booking.id)}
              style={{ flex: 1 }}
            />
          )}
          {booking.status === "in_progress" && (
            <PrimaryButton
              title="Complete"
              onPress={() => handleCompleteConsultation(booking.id)}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ThemedText>Loading dashboard...</ThemedText>
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Pressable onPress={handleUploadImage} style={styles.imageContainer}>
            {profile.imageUrl ? (
              <Image source={{ uri: profile.imageUrl }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.primary }]}>
                <Feather name="user" size={40} color="#fff" />
              </View>
            )}
            <View style={[styles.cameraIcon, { backgroundColor: theme.primary }]}>
              <Feather name="camera" size={16} color="#fff" />
            </View>
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText type="h3">{profile.name}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {profile.professionalType?.toUpperCase()}
            </ThemedText>
            
            <View style={styles.onlineToggle}>
              <ThemedText weight="medium">Available for consultations</ThemedText>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                trackColor={{ false: theme.border, true: theme.success + "40" }}
                thumbColor={isOnline ? theme.success : theme.textSecondary}
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

        {/* Profile Details Section */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Profile Details</ThemedText>
            <Pressable onPress={() => setIsEditing(!isEditing)}>
              <Feather name={isEditing ? "x" : "edit-2"} size={20} color={theme.primary} />
            </Pressable>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Specialization
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={editData.specialization}
                  onChangeText={(text) => setEditData({ ...editData, specialization: text })}
                  placeholder="e.g., General Practitioner"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Years of Experience
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={editData.yearsOfExperience}
                  onChangeText={(text) => setEditData({ ...editData, yearsOfExperience: text })}
                  placeholder="e.g., 5"
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Consultation Fee (₦)
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={editData.consultationFee}
                  onChangeText={(text) => setEditData({ ...editData, consultationFee: text })}
                  placeholder="e.g., 5000"
                  keyboardType="numeric"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Languages (comma-separated)
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={editData.languages}
                  onChangeText={(text) => setEditData({ ...editData, languages: text })}
                  placeholder="e.g., English, Yoruba, Igbo"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Bio
                </ThemedText>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={editData.bio}
                  onChangeText={(text) => setEditData({ ...editData, bio: text })}
                  placeholder="Tell patients about yourself..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <PrimaryButton title="Save Changes" onPress={handleSaveProfile} />
            </View>
          ) : (
            <View style={styles.detailsList}>
              <View style={styles.detailItem}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>Specialization</ThemedText>
                <ThemedText weight="medium">{profile.specialization || "Not set"}</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>Experience</ThemedText>
                <ThemedText weight="medium">{profile.yearsOfExperience || 0} years</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>Consultation Fee</ThemedText>
                <ThemedText weight="medium">₦{profile.consultationFee?.toLocaleString() || 0}</ThemedText>
              </View>
              <View style={styles.detailItem}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>Languages</ThemedText>
                <ThemedText weight="medium">{profile.languages?.join(", ") || "Not set"}</ThemedText>
              </View>
              {profile.bio && (
                <View style={styles.detailItem}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>Bio</ThemedText>
                  <ThemedText>{profile.bio}</ThemedText>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Bookings Section */}
        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Recent Bookings
          </ThemedText>
          
          {bookings.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="calendar" size={48} color={theme.textSecondary} />
              <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                No bookings yet
              </ThemedText>
            </View>
          ) : (
            bookings.slice(0, 5).map(renderBookingCard)
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    paddingTop: 100

  },
  content: { padding: Spacing.lg },
  profileCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  imageContainer: {
    position: "relative",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
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
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  editForm: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  detailsList: {
    gap: Spacing.md,
  },
  detailItem: {
    gap: Spacing.xs,
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
});