// screens/ServicesScreen.tsx - Compact with Professional Services
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ServicesStackParamList } from "@/navigation/ServicesStackNavigator";

const billServices = [
  { id: "airtime", name: "Airtime", icon: "phone", screen: "Airtime", color: "#10b981" },
  { id: "data", name: "Data", icon: "wifi", screen: "Data", color: "#3b82f6" },
  { id: "electricity", name: "Electricity", icon: "zap", screen: "Electricity", color: "#f59e0b" },
  { id: "cable", name: "Cable TV", icon: "tv", screen: "CableTV", color: "#8b5cf6" },
];

const professionalServices = [
  { 
    id: "doctor", 
    name: "Doctor", 
    icon: "activity", 
    screen: "Professionals",
    params: { type: "doctor" },
    color: "#ef4444",
    description: "General practitioners"
  },
  { 
    id: "pharmacist", 
    name: "Pharmacist", 
    icon: "package", 
    screen: "Professionals",
    params: { type: "pharmacist" },
    color: "#10b981",
    description: "Medication experts"
  },
  { 
    id: "dentist", 
    name: "Dentist", 
    icon: "smile", 
    screen: "Professionals",
    params: { type: "dentist" },
    color: "#3b82f6",
    description: "Dental care specialists"
  },
  { 
    id: "therapist", 
    name: "Therapist", 
    icon: "heart", 
    screen: "Professionals",
    params: { type: "therapist" },
    color: "#f59e0b",
    description: "Mental health support"
  },
];

export default function ServicesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ServicesStackParamList>>();
  const { theme } = useTheme();

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
        navigation.navigate(service.screen as keyof ServicesStackParamList)
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
        // Navigate to professionals screen with type parameter
        // navigation.navigate(service.screen as any, service.params);
        // For now, show coming soon
        alert(`${service.name} consultation coming soon!`);
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
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <ScreenScrollView>
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
            <ThemedText type="h3">Talk to Professionals</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Consult certified healthcare experts
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
              Video consultation
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="shield" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs, flex: 1 }}>
              Certified professionals
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <Feather name="clock" size={16} color={theme.primary} />
            <ThemedText type="caption" style={{ marginLeft: Spacing.xs, flex: 1 }}>
              24/7 availability
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
          All services are processed securely. Healthcare consultations are HIPAA compliant.
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
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