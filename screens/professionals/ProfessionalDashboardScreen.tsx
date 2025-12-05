// screens/professionals/ProfessionalDashboardScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  FlatList,
  Switch,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../../components/ThemedText";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenScrollView } from "../../components/ScreenScrollView";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { Spacing, BorderRadius } from "../../constants/theme";
import { professionalService, Booking } from "../../services/professionalService";

export default function ProfessionalDashboardScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [isOnline, setIsOnline] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "professional") {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Load professional data
      const professional = await professionalService.getProfessional(user.uid);
      if (professional) {
        setIsOnline(professional.isOnline || false);
      }

      // Load bookings
      const bookingsData = await professionalService.getProfessionalBookings(user.uid);
      setBookings(bookingsData.filter(b => 
        b.status === "pending" || b.status === "confirmed" || b.status === "in_progress"
      ));

      // Load stats
      const statsData = await professionalService.getProfessionalStats(user.uid);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!user) return;
    
    try {
      const newStatus = !isOnline;
      await professionalService.updateProfessionalStatus(user.uid, newStatus);
      setIsOnline(newStatus);
      Alert.alert(
        "Status Updated",
        `You are now ${newStatus ? "online" : "offline"}`
      );
    } catch (error) {
      Alert.alert("Error", "Failed to update status");
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await professionalService.updateBookingStatus(bookingId, "confirmed");
      loadDashboardData();
      Alert.alert("Success", "Booking confirmed");
    } catch (error) {
      Alert.alert("Error", "Failed to accept booking");
    }
  };

  const handleStartConsultation = (bookingId: string) => {
    navigation.navigate("ConsultationRoom" as never, { bookingId } as never);
  };

  const renderStatCard = (icon: string, label: string, value: string | number, color: string) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon as any} size={24} color={color} />
      </View>
      <ThemedText type="h2" style={{ marginTop: Spacing.sm }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>{label}</ThemedText>
    </View>
  );

  const renderBookingCard = ({ item }: { item: Booking }) => (
    <Pressable
      style={[styles.bookingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
    >
      <View style={styles.bookingHeader}>
        <View>
          <ThemedText weight="medium" style={{ fontSize: 16 }}>{item.patientName}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {item.date} at {item.time}
          </ThemedText>
        </View>
        <View style={[
          styles.statusBadge,
          {
            backgroundColor: 
              item.status === "pending" ? theme.warning + "20" :
              item.status === "confirmed" ? theme.success + "20" :
              theme.info + "20"
          }
        ]}>
          <ThemedText 
            type="caption" 
            weight="medium"
            style={{
              color: 
                item.status === "pending" ? theme.warning :
                item.status === "confirmed" ? theme.success :
                theme.info
            }}
          >
            {item.status.toUpperCase()}
          </ThemedText>
        </View>
      </View>

      {item.reason && (
        <View style={[styles.reasonBox, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="file-text" size={14} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ marginLeft: 8, flex: 1 }}>{item.reason}</ThemedText>
        </View>
      )}

      <View style={styles.bookingFooter}>
        <View style={styles.bookingInfo}>
          <Feather name="video" size={14} color={theme.primary} />
          <ThemedText type="caption" style={{ marginLeft: 4 }}>
            {item.consultationType}
          </ThemedText>
        </View>

        {item.queuePosition && (
          <View style={styles.bookingInfo}>
            <Feather name="clock" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 4 }}>
              Position {item.queuePosition}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        {item.status === "pending" && (
          <PrimaryButton
            title="Accept"
            onPress={() => handleAcceptBooking(item.id)}
            style={{ flex: 1, marginRight: Spacing.xs }}
          />
        )}
        {item.status === "confirmed" && (
          <PrimaryButton
            title="Start Consultation"
            onPress={() => handleStartConsultation(item.id)}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Pressable>
  );

  if (user?.role !== "professional") {
    return (
      <ScreenScrollView>
        <View style={styles.container}>
          <ThemedText>Professional access only</ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText type="h2">Dashboard</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              Manage your consultations
            </ThemedText>
          </View>
          
          <Pressable 
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("ProfessionalSettings" as never)}
          >
            <Feather name="settings" size={24} color={theme.text} />
          </Pressable>
        </View>

        {/* Online Status Toggle */}
        <View style={[styles.statusToggle, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.statusLeft}>
            <Feather 
              name={isOnline ? "check-circle" : "x-circle"} 
              size={20} 
              color={isOnline ? theme.success : theme.textSecondary} 
            />
            <View style={{ marginLeft: Spacing.md }}>
              <ThemedText weight="medium">
                {isOnline ? "You're Online" : "You're Offline"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {isOnline ? "Accepting consultations" : "Not accepting consultations"}
              </ThemedText>
            </View>
          </View>
          <Switch value={isOnline} onValueChange={toggleOnlineStatus} />
        </View>
      </View>

      {/* Stats Grid */}
      {stats && (
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {renderStatCard("users", "Total Bookings", stats.totalBookings, theme.primary)}
            {renderStatCard("check-circle", "Completed", stats.completedConsultations, theme.success)}
          </View>
          <View style={styles.statsGrid}>
            {renderStatCard("star", "Rating", stats.averageRating.toFixed(1), "#fbbf24")}
            {renderStatCard("dollar-sign", "Earnings", `₦${stats.totalEarnings.toLocaleString()}`, theme.info)}
          </View>
        </View>
      )}

      {/* Queue Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h3">Current Queue</ThemedText>
          <View style={[styles.queueBadge, { backgroundColor: theme.info + "15" }]}>
            <ThemedText weight="medium" style={{ color: theme.info }}>
              {bookings.length}
            </ThemedText>
          </View>
        </View>

        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                No pending consultations
              </ThemedText>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: Spacing.lg,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  statusToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statsSection: {
    padding: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    flex: 1,
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  queueBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    minWidth: 40,
    alignItems: "center",
  },
  bookingCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
  },
  reasonBox: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  bookingFooter: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  bookingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
});