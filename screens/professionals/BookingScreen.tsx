// screens/professionals/BookingScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "../../components/ThemedText";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ScreenScrollView } from "../../components/ScreenScrollView";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { Spacing, BorderRadius } from "../../constants/theme";
import { professionalService, Professional, Booking } from "../../services/professionalService";
import { firebaseService } from "../../services/firebaseService";
import { ServicesStackParamList } from "../../navigation/ServicesStackNavigator";

type NavigationProp = NativeStackNavigationProp<ServicesStackParamList>;

export default function BookingScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  
  const { professionalId } = route.params as { professionalId: string };

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [consultationType, setConsultationType] = useState<"video" | "chat">("video");
  const [reason, setReason] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [professionalId]);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      const [profData, walletData] = await Promise.all([
        professionalService.getProfessional(professionalId),
        firebaseService.getWallet(user.uid),
      ]);
      
      setProfessional(profData);
      setWallet(walletData);
      
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load booking information");
    }
  };

  const loadAvailableSlots = async () => {
    try {
      const slots = await professionalService.getAvailableSlots(professionalId, selectedDate);
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error loading slots:", error);
    }
  };

  const generateDateOptions = () => {
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const handleConfirmBooking = async () => {
    if (!user || !professional) return;

    if (!selectedDate || !selectedTime) {
      Alert.alert("Missing Information", "Please select date and time");
      return;
    }

    if (!reason.trim()) {
      Alert.alert("Missing Information", "Please provide a reason for consultation");
      return;
    }

    // Check wallet balance
    const consultationFee = professional.consultationFee || 0;
    if (wallet.balance < consultationFee) {
      Alert.alert(
        "Insufficient Balance",
        `You need ₦${consultationFee.toLocaleString()} for this consultation. Please top up your wallet.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Top Up", onPress: () => navigation.navigate("Wallet" as never) }
        ]
      );
      return;
    }

    try {
      setLoading(true);

      // Deduct from wallet
      const newBalance = wallet.balance - consultationFee;
      const updatedWallet = {
        ...wallet,
        balance: newBalance,
        transactions: [
          {
            id: Date.now().toString(),
            type: "debit" as const,
            amount: consultationFee,
            description: `Consultation with ${professional.name}`,
            timestamp: Date.now(),
          },
          ...wallet.transactions,
        ],
      };
      await firebaseService.updateWallet(updatedWallet);

      // Create booking
      const booking = await professionalService.createBooking({
        professionalId: professional.uid,
        professionalName: professional.name,
        patientId: user.uid,
        patientName: user.name,
        date: selectedDate,
        time: selectedTime,
        consultationType,
        reason: reason.trim(),
        fee: consultationFee,
        status: "pending",
      });

      Alert.alert(
        "Booking Confirmed!",
        `Your consultation is scheduled for ${selectedDate} at ${selectedTime}. You're in position ${booking.queuePosition} in the queue.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error creating booking:", error);
      Alert.alert("Error", "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  if (!professional) {
    return (
      <ScreenScrollView>
        <View style={styles.container}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ScreenScrollView>
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
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Professional Info Card */}
        <View style={[styles.professionalCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Image 
            source={{ uri: professional.imageUrl || "https://via.placeholder.com/400" }}
            style={styles.professionalImage}
          />
          <View style={{ flex: 1 }}>
            <ThemedText type="h3">{professional.name}</ThemedText>
            <ThemedText style={{ color: typeColor, marginTop: 4 }}>
              {professional.specialization}
            </ThemedText>
            
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.sm, gap: Spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="star" size={14} color="#fbbf24" />
                <ThemedText style={{ marginLeft: 4 }}>{professional.rating || "New"}</ThemedText>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="users" size={14} color={theme.info} />
                <ThemedText style={{ marginLeft: 4 }}>{professional.currentQueue || 0} in queue</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Wallet Balance */}
        {wallet && (
          <View style={[styles.walletCard, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Feather name="credit-card" size={20} color={theme.primary} />
              <View style={{ marginLeft: Spacing.md }}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Wallet Balance
                </ThemedText>
                <ThemedText type="h4" style={{ color: theme.primary }}>
                  ₦{wallet.balance.toLocaleString()}
                </ThemedText>
              </View>
            </View>
            {wallet.balance < (professional.consultationFee || 0) && (
              <Pressable onPress={() => navigation.navigate("Wallet" as never)}>
                <ThemedText style={{ color: theme.primary, fontSize: 13, fontWeight: "600" }}>
                  Top Up
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {/* Consultation Type */}
        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Consultation Type</ThemedText>
          
          <View style={styles.typeContainer}>
            <Pressable
              style={[
                styles.typeButton,
                {
                  backgroundColor: consultationType === "video" ? theme.primary : theme.cardBackground,
                  borderColor: consultationType === "video" ? theme.primary : theme.border,
                }
              ]}
              onPress={() => setConsultationType("video")}
            >
              <Feather 
                name="video" 
                size={24} 
                color={consultationType === "video" ? "#fff" : theme.text} 
              />
              <ThemedText 
                weight="medium"
                lightColor={consultationType === "video" ? "#fff" : theme.text}
                style={{ marginTop: Spacing.sm }}
              >
                Video Call
              </ThemedText>
              <ThemedText 
                type="caption"
                lightColor={consultationType === "video" ? "#fff" : theme.textSecondary}
              >
                Face-to-face
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.typeButton,
                {
                  backgroundColor: consultationType === "chat" ? theme.primary : theme.cardBackground,
                  borderColor: consultationType === "chat" ? theme.primary : theme.border,
                }
              ]}
              onPress={() => setConsultationType("chat")}
            >
              <Feather 
                name="message-square" 
                size={24} 
                color={consultationType === "chat" ? "#fff" : theme.text} 
              />
              <ThemedText 
                weight="medium"
                lightColor={consultationType === "chat" ? "#fff" : theme.text}
                style={{ marginTop: Spacing.sm }}
              >
                Chat
              </ThemedText>
              <ThemedText 
                type="caption"
                lightColor={consultationType === "chat" ? "#fff" : theme.textSecondary}
              >
                Text-based
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Select Date</ThemedText>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.datesContainer}>
              {generateDateOptions().map((date) => {
                const dateStr = date.toISOString().split('T')[0];
                const isSelected = selectedDate === dateStr;
                
                return (
                  <Pressable
                    key={dateStr}
                    style={[
                      styles.dateCard,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.cardBackground,
                        borderColor: isSelected ? theme.primary : theme.border,
                      }
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                  >
                    <ThemedText 
                      type="caption"
                      lightColor={isSelected ? "#fff" : theme.textSecondary}
                    >
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </ThemedText>
                    <ThemedText 
                      type="h3"
                      lightColor={isSelected ? "#fff" : theme.text}
                      style={{ marginVertical: 4 }}
                    >
                      {date.getDate()}
                    </ThemedText>
                    <ThemedText 
                      type="caption"
                      lightColor={isSelected ? "#fff" : theme.textSecondary}
                    >
                      {date.toLocaleDateString('en-US', { month: 'short' })}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Select Time</ThemedText>
          
          {availableSlots.length === 0 ? (
            <View style={[styles.emptySlots, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="clock" size={32} color={theme.textSecondary} />
              <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                No slots available for this date
              </ThemedText>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {availableSlots.map((slot) => (
                <Pressable
                  key={slot}
                  style={[
                    styles.timeSlot,
                    {
                      backgroundColor: selectedTime === slot ? theme.primary : theme.cardBackground,
                      borderColor: selectedTime === slot ? theme.primary : theme.border,
                    }
                  ]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <ThemedText 
                    weight="medium"
                    lightColor={selectedTime === slot ? "#fff" : theme.text}
                  >
                    {slot}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Reason */}
        <View style={styles.section}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Reason for Consultation</ThemedText>
          
          <View style={[styles.reasonBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <TextInput
              style={[styles.reasonInput, { color: theme.text }]}
              placeholder="Describe your symptoms or concerns..."
              placeholderTextColor={theme.textSecondary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Booking Summary</ThemedText>
          
          <View style={styles.summaryRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Professional</ThemedText>
            <ThemedText weight="medium">{professional.name}</ThemedText>
          </View>
          
          <View style={styles.summaryRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Date & Time</ThemedText>
            <ThemedText weight="medium">
              {selectedDate && selectedTime ? `${selectedDate} at ${selectedTime}` : "Not selected"}
            </ThemedText>
          </View>
          
          <View style={styles.summaryRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Type</ThemedText>
            <ThemedText weight="medium">{consultationType === "video" ? "Video Call" : "Chat"}</ThemedText>
          </View>
          
          <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md, marginTop: Spacing.md }]}>
            <ThemedText type="h4">Total</ThemedText>
            <ThemedText type="h3" style={{ color: typeColor }}>
              ₦{professional.consultationFee?.toLocaleString()}
            </ThemedText>
          </View>
        </View>

        {/* Confirm Button */}
        <PrimaryButton
          title="Confirm Booking"
          onPress={handleConfirmBooking}
          loading={loading}
          disabled={!selectedDate || !selectedTime || !reason.trim()}
          style={{ marginTop: Spacing.lg }}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  professionalCard: {
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
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  typeContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  typeButton: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
  },
  datesContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dateCard: {
    width: 80,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
  },
  emptySlots: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  timeSlot: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    minWidth: 100,
    alignItems: "center",
  },
  reasonBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
  },
  reasonInput: {
    fontSize: 15,
    lineHeight: 22,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
});