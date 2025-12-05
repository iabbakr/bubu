// screens/ServicesScreen.tsx - UPDATED
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spacing, BorderRadius } from "../constants/theme";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ServicesStackParamList } from "@/navigation/ServicesStackNavigator";

const billServices = [
  { id: "airtime", name: "Airtime", icon: "phone", screen: "Airtime", color: "#10b981" },
  { id: "data", name: "Data", icon: "wifi", screen: "Data", color: "#3b82f6" },
  { id: "electricity", name: "Electricity", icon: "zap", screen: "Electricity", color: "#f59e0b" },
  { id: "cable", name: "Cable TV", icon: "tv", screen: "TV", color: "#8b5cf6" },
];

const professionalServices = [
  { 
    id: "doctor", 
    name: "Doctors", 
    icon: "activity", 
    screen: "Doctors",
    color: "#ef4444",
    description: "Medical consultations & diagnosis",
    count: 45
  },
  { 
    id: "pharmacist", 
    name: "Pharmacists", 
    icon: "package", 
    screen: "Pharmacists",
    color: "#10b981",
    description: "Medication advice & prescriptions",
    count: 32
  },
  { 
    id: "therapist", 
    name: "Therapists", 
    icon: "heart", 
    screen: "Therapists",
    color: "#f59e0b",
    description: "Mental health & counseling",
    count: 28
  },
  { 
    id: "lawyer", 
    name: "Lawyers", 
    icon: "briefcase", 
    screen: "Lawyers",
    color: "#8b5cf6",
    description: "Legal advice & consultation",
    count: 18
  },
];

export default function ServicesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ServicesStackParamList>>();
  const { theme } = useTheme();
  const { user } = useAuth();

  // If user is a professional, show their dashboard card
  const isProfessional = user?.role === "professional";

  const renderCompactServiceCard = (service: typeof billServices[0]) => (
    <Pressable
      key={service.id}
      style={({ pressed }) => [
        styles.compactCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() =>
        navigation.navigate(service.screen as keyof ServicesStackParamList, undefined)
      }
    >
      <View
        style={[
          styles.compactIcon,
          { backgroundColor: service.color + "15" },
        ]}
      >
        <Feather name={service.icon as any} size={20} color={service.color} />
      </View>
      <ThemedText weight="medium" style={styles.compactName}>
        {service.name}
      </ThemedText>
    </Pressable>
  );

  const renderProfessionalCard = (service: typeof professionalServices[0]) => (
    <Pressable
      key={service.id}
      style={({ pressed }) => [
        styles.professionalCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() => {
        navigation.navigate(service.screen as keyof ServicesStackParamList, undefined);
      }}
    >
      <View
        style={[
          styles.professionalIcon,
          { backgroundColor: service.color + "15" },
        ]}
      >
        <Feather name={service.icon as any} size={24} color={service.color} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText weight="medium" style={{ fontSize: 15 }}>
          {service.name}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginTop: 2 }}
        >
          {service.description}
        </ThemedText>
        <ThemedText
          type="caption"
          style={{ color: service.color, marginTop: 4, fontWeight: "600" }}
        >
          {service.count}+ available
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <ScreenScrollView>
      {/* Professional Dashboard Card - Only for professionals */}
      {isProfessional && (
        <Pressable
          style={[styles.dashboardCard, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("ProfessionalDashboard", undefined)}
        >
          <View style={styles.dashboardLeft}>
            <Feather name="activity" size={32} color="#fff" />
            <View style={{ marginLeft: Spacing.lg }}>
              <ThemedText type="h3" lightColor="#fff">
                Your Dashboard
              </ThemedText>
              <ThemedText type="caption" lightColor="#fff" style={{ opacity: 0.9, marginTop: 4 }}>
                Manage consultations & schedule
              </ThemedText>
            </View>
          </View>
          <Feather name="arrow-right" size={24} color="#fff" />
        </Pressable>
      )}

      {/* Bills & Utilities Section - Compact */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <ThemedText type="h3">Bills & Utilities</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Pay bills instantly
            </ThemedText>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {billServices.map(renderCompactServiceCard)}
        </ScrollView>
      </View>

      {/* Professional Services Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <ThemedText type="h3">Healthcare & Legal Professionals</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Consult certified experts
            </ThemedText>
          </View>
        </View>

        <View style={styles.professionalsList}>
          {professionalServices.map(renderProfessionalCard)}
        </View>

        {/* Features Card */}
        <View
          style={[
            styles.featuresCard,
            { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" },
          ]}
        >
          <View style={styles.featureItem}>
            <Feather name="video" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs, flex: 1 }}>
              HD video consultation
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="shield" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs, flex: 1 }}>
              100% verified professionals
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="clock" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs, flex: 1 }}>
              24/7 availability
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="lock" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs, flex: 1 }}>
              Secure & confidential
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Info Card */}
      <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="info" size={18} color={theme.info} />
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginLeft: Spacing.md, flex: 1 }}
        >
          All services are processed securely. Healthcare consultations are HIPAA compliant and legally binding.
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  dashboardCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  dashboardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  horizontalScroll: {
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  compactCard: {
    width: 100,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "center",
  },
  compactIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  compactName: {
    fontSize: 13,
    textAlign: "center",
  },
  professionalsList: {
    gap: Spacing.sm,
  },
  professionalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  professionalIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  featuresCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
});





















// navigation/ServicesStackNavigator.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ServicesScreen from "@/screens/ServicesScreen";
import AirtimeScreen from "@/screens/AirtimeScreen";
import DataScreen from "@/screens/DataScreen";
import ElectricityScreen from "@/screens/ElectricityScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";

// Professional screens
import DoctorsScreen from "@/screens/professionals/DoctorsScreen";
import PharmacistsScreen from "@/screens/professionals/PharmacistsScreen";
//import TherapistsScreen from "@/screens/professionals/TherapistsScreen";
import LawyersScreen from "@/screens/professionals/LawyersScreen";
import ProfessionalProfileScreen from "@/screens/professionals/ProfessionalProfileScreen";
import BookingScreen from "@/screens/professionals/BookingScreen";
import ConsultationRoomScreen from "@/screens/professionals/ConsultationRoomScreen";
import ProfessionalDashboardScreen from "@/screens/professionals/ProfessionalDashboardScreen";
import ProfessionalSettingsScreen from "@/screens/professionals/ProfessionalSettingsScreen";
import SessionRatingScreen from "@/screens/professionals/SessionRatingScreen";

export type ServicesStackParamList = {
  Services: undefined;
  Airtime: undefined;
  Data: undefined;
  TV: undefined;
  Electricity: undefined;
  Education: undefined;
  
  // Professional screens
  Doctors: undefined;
  Pharmacists: undefined;
  Therapists: undefined;
  Lawyers: undefined;
  ProfessionalProfile: { professionalId: string };
  Booking: { professionalId: string };
  ConsultationRoom: { bookingId: string };
  ProfessionalDashboard: undefined;
  ProfessionalSettings: undefined;
  SessionRating: { bookingId: string; professionalId: string };
};

const Stack = createNativeStackNavigator<ServicesStackParamList>();

export default function ServicesStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Services"
        component={ServicesScreen}
        options={{ title: "Services" }}
      />
      <Stack.Screen 
        name="Airtime" 
        component={AirtimeScreen}
        options={{ title: "Buy Airtime" }}
      />
      <Stack.Screen 
        name="Data" 
        component={DataScreen}
        options={{ title: "Buy Data" }}
      />
      <Stack.Screen 
        name="Electricity" 
        component={ElectricityScreen}
        options={{ title: "Pay Electricity" }}
      />
      
      {/* Professional Category Screens */}
      <Stack.Screen
        name="Doctors"
        component={DoctorsScreen}
        options={{ title: "Doctors" }}
      />
      <Stack.Screen
        name="Pharmacists"
        component={PharmacistsScreen}
        options={{ title: "Pharmacists" }}
      />
      {/**
      <Stack.Screen
        name="Therapists"
        component={TherapistsScreen}
        options={{ title: "Therapists" }}
      />
       */}
      <Stack.Screen
        name="Lawyers"
        component={LawyersScreen}
        options={{ title: "Lawyers" }}
      />
      
      {/* Professional Detail & Booking */}
      <Stack.Screen
        name="ProfessionalProfile"
        component={ProfessionalProfileScreen}
        options={{ title: "Professional Profile" }}
      />
      <Stack.Screen
        name="Booking"
        component={BookingScreen}
        options={{ title: "Book Session" }}
      />
      <Stack.Screen
        name="ConsultationRoom"
        component={ConsultationRoomScreen}
        options={{ title: "Consultation", headerShown: false }}
      />
      
      {/* Professional Dashboard */}
      <Stack.Screen
        name="ProfessionalDashboard"
        component={ProfessionalDashboardScreen}
        options={{ title: "My Dashboard" }}
      />
      <Stack.Screen
        name="ProfessionalSettings"
        component={ProfessionalSettingsScreen}
        options={{ title: "Professional Settings" }}
      />
      
      {/* Rating */}
      <Stack.Screen
        name="SessionRating"
        component={SessionRatingScreen}
        options={{ title: "Rate Session" }}
      />
    </Stack.Navigator>
  );
}