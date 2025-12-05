// screens/professionals/SessionRatingScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ThemedText } from "../../components/ThemedText";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenScrollView } from "../../components/ScreenScrollView";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { Spacing, BorderRadius } from "../../constants/theme";
import { professionalService, Professional, Booking } from "../../services/professionalService";

export default function SessionRatingScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  
  const { bookingId, professionalId } = route.params as { bookingId: string; professionalId: string };

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profData, bookingData] = await Promise.all([
        professionalService.getProfessional(professionalId),
        professionalService.getBooking(bookingId),
      ]);
      
      setProfessional(profData);
      setBooking(bookingData);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load session details");
    }
  };

  const handleSubmitRating = async () => {
    if (!user || !professional || !booking) return;

    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a rating");
      return;
    }

    if (!comment.trim()) {
      Alert.alert("Comment Required", "Please write a brief comment");
      return;
    }

    try {
      setLoading(true);

      await professionalService.createReview({
        professionalId: professional.uid,
        patientId: user.uid,
        patientName: user.name,
        bookingId: booking.id,
        rating,
        comment: comment.trim(),
      });

      Alert.alert(
        "Thank You!",
        "Your rating has been submitted successfully",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting rating:", error);
      Alert.alert("Error", "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  const renderStar = (index: number) => {
    const filled = index <= rating;
    return (
      <Pressable
        key={index}
        onPress={() => setRating(index)}
        style={styles.starButton}
      >
        <Feather
          name={filled ? "star" : "star"}
          size={40}
          color={filled ? "#fbbf24" : theme.border}
          fill={filled ? "#fbbf24" : "transparent"}
        />
      </Pressable>
    );
  };

  if (!professional || !booking) {
    return (
      <ScreenScrollView>
        <View style={styles.container}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Image 
            source={{ uri: professional.imageUrl || "https://via.placeholder.com/400" }}
            style={styles.professionalImage}
          />
          <View style={{ flex: 1 }}>
            <ThemedText type="h3">{professional.name}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              {professional.specialization}
            </ThemedText>
            
            <View style={[styles.completedBadge, { backgroundColor: theme.success + "15" }]}>
              <Feather name="check-circle" size={14} color={theme.success} />
              <ThemedText type="caption" style={{ marginLeft: 4, color: theme.success }}>
                Session Completed
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Session Details */}
        <View style={[styles.detailsCard, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.detailRow}>
            <Feather name="calendar" size={16} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 8 }}>
              {booking.date} at {booking.time}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Feather name="video" size={16} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 8 }}>
              {booking.consultationType} consultation
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Feather name="clock" size={16} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 8 }}>
              Duration: ~30 minutes
            </ThemedText>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
            How was your experience?
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
            Your feedback helps us improve our services
          </ThemedText>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map(renderStar)}
          </View>

          {rating > 0 && (
            <ThemedText 
              weight="medium" 
              style={{ 
                textAlign: "center", 
                marginTop: Spacing.md,
                color: theme.primary 
              }}
            >
              {rating === 5 ? "Excellent!" :
               rating === 4 ? "Very Good!" :
               rating === 3 ? "Good" :
               rating === 2 ? "Fair" : "Poor"}
            </ThemedText>
          )}
        </View>

        {/* Comment Section */}
        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Tell us more (optional)
          </ThemedText>
          
          <View style={[styles.commentBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <TextInput
              style={[styles.commentInput, { color: theme.text }]}
              placeholder="What did you like or what could be improved?"
              placeholderTextColor={theme.textSecondary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Quick Feedback Tags */}
        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Quick feedback
          </ThemedText>
          
          <View style={styles.tagsContainer}>
            {["Professional", "Helpful", "Patient", "Knowledgeable", "Friendly"].map((tag) => (
              <Pressable
                key={tag}
                style={[
                  styles.tag,
                  { 
                    backgroundColor: comment.includes(tag) 
                      ? theme.primary + "20" 
                      : theme.backgroundSecondary,
                    borderColor: comment.includes(tag) 
                      ? theme.primary 
                      : theme.border 
                  }
                ]}
                onPress={() => {
                  if (comment.includes(tag)) {
                    setComment(comment.replace(tag, "").trim());
                  } else {
                    setComment(comment ? `${comment} ${tag}` : tag);
                  }
                }}
              >
                <ThemedText 
                  type="caption"
                  style={{ 
                    color: comment.includes(tag) ? theme.primary : theme.text 
                  }}
                >
                  {tag}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <PrimaryButton
          title="Submit Rating"
          onPress={handleSubmitRating}
          loading={loading}
          disabled={rating === 0}
        />

        {/* Skip Option */}
        <Pressable 
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
        >
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Skip for now
          </ThemedText>
        </Pressable>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  professionalImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.sm,
  },
  detailsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  commentBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 120,
  },
  commentInput: {
    fontSize: 15,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
});