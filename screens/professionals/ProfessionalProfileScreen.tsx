// screens/professionals/ProfessionalProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "../../components/ThemedText";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { Spacing, BorderRadius } from "../../constants/theme";
import { professionalService, Professional, Review } from "../../services/professionalService";
import { ServicesStackParamList } from "../../navigation/ServicesStackNavigator";

type NavigationProp = NativeStackNavigationProp<ServicesStackParamList>;

export default function ProfessionalProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  
  const { professionalId } = route.params as { professionalId: string };

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"about" | "reviews">("about");

  useEffect(() => {
    loadProfessionalData();
  }, [professionalId]);

  const loadProfessionalData = async () => {
    try {
      setLoading(true);
      const [profData, reviewsData] = await Promise.all([
        professionalService.getProfessional(professionalId),
        professionalService.getProfessionalReviews(professionalId),
      ]);
      
      setProfessional(profData);
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error loading professional:", error);
      Alert.alert("Error", "Failed to load professional profile");
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to book a consultation");
      return;
    }
    navigation.navigate("Booking", { professionalId });
  };

  if (loading || !professional) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading profile...</ThemedText>
        </View>
      </View>
    );
  }

  const typeColors = {
    doctor: theme.error,
    pharmacist: theme.success,
    therapist: theme.warning,
    dentist: theme.info,
    lawyer: "#8b5cf6",
  };

  const typeColor = typeColors[professional.professionalType as keyof typeof typeColors] || theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView>
        {/* Header Image & Basic Info */}
        <View style={styles.headerSection}>
          <Image 
            source={{ uri: professional.imageUrl || "https://via.placeholder.com/400" }}
            style={styles.headerImage}
          />
          
          {professional.isOnline && (
            <View style={[styles.onlineIndicator, { backgroundColor: theme.success }]}>
              <View style={styles.pulseDot} />
              <ThemedText lightColor="#fff" style={styles.onlineText}>Available Now</ThemedText>
            </View>
          )}

          <View style={[styles.headerOverlay, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.headerContent}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                  <ThemedText type="h2">{professional.name}</ThemedText>
                  {professional.isVerified && (
                    <Feather name="check-circle" size={24} color={theme.info} />
                  )}
                </View>
                
                <ThemedText style={{ color: typeColor, marginTop: 4, fontWeight: "600" }}>
                  {professional.specialization}
                </ThemedText>

                {professional.yearsOfExperience && (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                    {professional.yearsOfExperience}+ years of experience
                  </ThemedText>
                )}
              </View>

              <View style={styles.ratingBox}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="star" size={20} color="#fbbf24" />
                  <ThemedText type="h3" style={{ marginLeft: 4 }}>
                    {professional.rating ? professional.rating.toFixed(1) : "New"}
                  </ThemedText>
                </View>
                {professional.reviewCount && professional.reviewCount > 0 && (
                  <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
                    {professional.reviewCount} reviews
                  </ThemedText>
                )}
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: theme.primary + "15" }]}>
                  <Feather name="users" size={20} color={theme.primary} />
                </View>
                <ThemedText type="h4">{professional.consultationsCompleted || 0}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Consultations
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: theme.info + "15" }]}>
                  <Feather name="clock" size={20} color={theme.info} />
                </View>
                <ThemedText type="h4">{professional.responseTime || "5 mins"}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Response Time
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: theme.success + "15" }]}>
                  <Feather name="user-check" size={20} color={theme.success} />
                </View>
                <ThemedText type="h4">{professional.currentQueue || 0}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  In Queue
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: theme.cardBackground }]}>
          <Pressable
            style={[
              styles.tab,
              selectedTab === "about" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setSelectedTab("about")}
          >
            <ThemedText 
              weight="medium"
              style={{ color: selectedTab === "about" ? theme.primary : theme.textSecondary }}
            >
              About
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              selectedTab === "reviews" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }
            ]}
            onPress={() => setSelectedTab("reviews")}
          >
            <ThemedText 
              weight="medium"
              style={{ color: selectedTab === "reviews" ? theme.primary : theme.textSecondary }}
            >
              Reviews ({reviews.length})
            </ThemedText>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {selectedTab === "about" ? (
            <>
              {/* Bio */}
              {professional.bio && (
                <View style={styles.section}>
                  <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>About</ThemedText>
                  <ThemedText style={{ lineHeight: 22 }}>{professional.bio}</ThemedText>
                </View>
              )}

              {/* Credentials */}
              <View style={styles.section}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Credentials</ThemedText>
                
                {professional.professionalLicense && (
                  <View style={[styles.credentialItem, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="award" size={18} color={theme.primary} />
                    <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        License Number
                      </ThemedText>
                      <ThemedText weight="medium">{professional.professionalLicense}</ThemedText>
                    </View>
                  </View>
                )}

                {professional.languages && professional.languages.length > 0 && (
                  <View style={[styles.credentialItem, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="globe" size={18} color={theme.primary} />
                    <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        Languages
                      </ThemedText>
                      <ThemedText weight="medium">{professional.languages.join(", ")}</ThemedText>
                    </View>
                  </View>
                )}
              </View>

              {/* Availability */}
              {professional.availability && professional.availability.length > 0 && (
                <View style={styles.section}>
                  <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Availability</ThemedText>
                  <View style={styles.daysContainer}>
                    {professional.availability.map((day) => (
                      <View 
                        key={day}
                        style={[styles.dayChip, { backgroundColor: theme.primary + "15", borderColor: theme.primary }]}
                      >
                        <ThemedText style={{ color: theme.primary, fontSize: 13 }}>
                          {day}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Consultation Fee */}
              <View style={[styles.feeCard, { backgroundColor: typeColor + "10", borderColor: typeColor + "30" }]}>
                <View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Consultation Fee
                  </ThemedText>
                  <ThemedText type="h2" style={{ color: typeColor, marginTop: 4 }}>
                    ₦{professional.consultationFee?.toLocaleString()}
                  </ThemedText>
                </View>
                <Feather name="info" size={20} color={typeColor} />
              </View>
            </>
          ) : (
            <>
              {/* Reviews List */}
              {reviews.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="message-square" size={64} color={theme.textSecondary} />
                  <ThemedText type="h4" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
                    No reviews yet
                  </ThemedText>
                  <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
                    Be the first to review!
                  </ThemedText>
                </View>
              ) : (
                reviews.map((review) => (
                  <View 
                    key={review.id}
                    style={[styles.reviewCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  >
                    <View style={styles.reviewHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText weight="medium">{review.patientName}</ThemedText>
                        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                          {new Date(review.createdAt).toLocaleDateString()}
                        </ThemedText>
                      </View>
                      <View style={{ flexDirection: "row", gap: 2 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Feather
                            key={star}
                            name="star"
                            size={14}
                            color={star <= review.rating ? "#fbbf24" : theme.border}
                            fill={star <= review.rating ? "#fbbf24" : "transparent"}
                          />
                        ))}
                      </View>
                    </View>
                    <ThemedText style={{ marginTop: Spacing.md, lineHeight: 20 }}>
                      {review.comment}
                    </ThemedText>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Book Button */}
      <View style={[styles.bottomBar, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Starting from
          </ThemedText>
          <ThemedText type="h3" style={{ color: typeColor }}>
            ₦{professional.consultationFee?.toLocaleString()}
          </ThemedText>
        </View>
        <PrimaryButton
          title="Book Now"
          onPress={handleBookNow}
          style={{ flex: 1, marginLeft: Spacing.md }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSection: {
    position: "relative",
  },
  headerImage: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
  },
  onlineIndicator: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  onlineText: { fontSize: 13, fontWeight: "600" },
  headerOverlay: {
    marginTop: -40,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
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
    marginBottom: Spacing.lg,
  },
  ratingBox: {
    alignItems: "center",
    minWidth: 60,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  tabsContainer: {
    flexDirection: "row",
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  credentialItem: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dayChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  feeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});