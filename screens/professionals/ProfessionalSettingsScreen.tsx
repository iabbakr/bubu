// screens/professionals/ProfessionalSettingsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { ThemedText } from "../../components/ThemedText";
import { TextInputField } from "../../components/TextInputField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenScrollView } from "../../components/ScreenScrollView";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { Spacing, BorderRadius } from "../../constants/theme";
import { professionalService, Professional } from "../../services/professionalService";
import { uploadImageToCloudinary } from "../../lib/cloudinary";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function ProfessionalSettingsScreen() {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string>("");
  const [specialization, setSpecialization] = useState("");
  const [license, setLicense] = useState("");
  const [experience, setExperience] = useState("");
  const [fee, setFee] = useState("");
  const [bio, setBio] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role === "professional") {
      loadProfessionalData();
    }
  }, [user]);

  const loadProfessionalData = async () => {
    if (!user) return;
    
    try {
      const professional = await professionalService.getProfessional(user.uid);
      if (professional) {
        setImageUri(professional.imageUrl || "");
        setSpecialization(professional.specialization || "");
        setLicense(professional.professionalLicense || "");
        setExperience(professional.yearsOfExperience?.toString() || "");
        setFee(professional.consultationFee?.toString() || "");
        setBio(professional.bio || "");
        setAvailability(professional.availability || []);
      }
    } catch (error) {
      console.error("Error loading professional data:", error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please grant camera roll permissions");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const toggleDay = (day: string) => {
    if (availability.includes(day)) {
      setAvailability(availability.filter(d => d !== day));
    } else {
      setAvailability([...availability, day]);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!specialization.trim() || !fee.trim()) {
      Alert.alert("Missing Info", "Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      let uploadedImageUrl = imageUri;

      // Upload image if it's a local URI
      if (imageUri && !imageUri.startsWith("http")) {
        uploadedImageUrl = await uploadImageToCloudinary(imageUri, "professionals");
      }

      const updateData: Partial<Professional> = {
        imageUrl: uploadedImageUrl,
        specialization: specialization.trim(),
        professionalLicense: license.trim(),
        yearsOfExperience: parseInt(experience) || 0,
        consultationFee: parseFloat(fee) || 0,
        bio: bio.trim(),
        availability,
      };

      await professionalService.updateProfessionalProfile(user.uid, updateData);
      await refreshUser();

      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

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
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Profile Image Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>Profile Photo</ThemedText>
          
          <Pressable 
            style={[styles.imageContainer, { backgroundColor: theme.backgroundSecondary }]}
            onPress={pickImage}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="camera" size={32} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
                  Tap to upload photo
                </ThemedText>
              </View>
            )}
          </Pressable>
        </View>

        {/* Professional Info Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>Professional Information</ThemedText>
          
          <TextInputField
            label="Specialization *"
            value={specialization}
            onChangeText={setSpecialization}
            placeholder={
              user.professionalType === "doctor" ? "e.g. Cardiologist, Pediatrician" :
              user.professionalType === "pharmacist" ? "e.g. Clinical Pharmacist" :
              user.professionalType === "therapist" ? "e.g. Clinical Psychologist" :
              "e.g. Corporate Law"
            }
          />

          <TextInputField
            label="License Number"
            value={license}
            onChangeText={setLicense}
            placeholder="Professional license number"
          />

          <TextInputField
            label="Years of Experience"
            value={experience}
            onChangeText={setExperience}
            placeholder="Years in practice"
            keyboardType="numeric"
          />

          <TextInputField
            label="Consultation Fee (₦) *"
            value={fee}
            onChangeText={setFee}
            placeholder="Fee per session"
            keyboardType="numeric"
          />

          <TextInputField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell patients about yourself..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Availability Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>Availability</ThemedText>
          <ThemedText type="caption" style={{ marginBottom: Spacing.md, color: theme.textSecondary }}>
            Select the days you're available for consultations
          </ThemedText>
          
          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map((day) => (
              <Pressable
                key={day}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: availability.includes(day) 
                      ? theme.primary 
                      : theme.cardBackground,
                    borderColor: availability.includes(day) 
                      ? theme.primary 
                      : theme.border,
                  },
                ]}
                onPress={() => toggleDay(day)}
              >
                <ThemedText
                  weight="medium"
                  lightColor={availability.includes(day) ? "#fff" : theme.text}
                  style={{ fontSize: 13 }}
                >
                  {day.slice(0, 3)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Practice Info Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.info + "10", borderColor: theme.info + "30" }]}>
          <Feather name="info" size={20} color={theme.info} />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <ThemedText weight="medium" style={{ color: theme.info }}>
              Profile Verification
            </ThemedText>
            <ThemedText type="caption" style={{ marginTop: 4 }}>
              {user.isVerified 
                ? "Your profile is verified ✓" 
                : "Your profile is pending verification. Admins will review your credentials."}
            </ThemedText>
          </View>
        </View>

        {/* Save Button */}
        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: Spacing.lg }}
        />

        {/* Statistics Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>Statistics</ThemedText>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="users" size={24} color={theme.primary} />
              <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>
                {user.consultationsCompleted || 0}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Consultations
              </ThemedText>
            </View>

            <View style={[styles.statBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="star" size={24} color="#fbbf24" />
              <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>
                {user.rating?.toFixed(1) || "New"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Rating
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  imageContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: "center",
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  dayButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    minWidth: 80,
    alignItems: "center",
  },
  infoCard: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statBox: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
});