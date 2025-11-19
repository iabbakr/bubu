import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

const services = [
  { id: "airtime", name: "Airtime", icon: "phone" },
  { id: "data", name: "Data", icon: "wifi" },
  { id: "tv", name: "Cable TV", icon: "tv" },
  { id: "electricity", name: "Electricity", icon: "zap" },
  { id: "education", name: "Education", icon: "book" },
];

export default function ServicesScreen() {
  const { theme } = useTheme();

  const renderServiceCard = (service: typeof services[0]) => (
    <Pressable
      key={service.id}
      style={({ pressed }) => [
        styles.serviceCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        }
      ]}
      onPress={() => {}}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.secondary + "33" }]}>
        <Feather name={service.icon as any} size={28} color={theme.primary} />
      </View>
      <ThemedText type="h4" style={styles.serviceName}>
        {service.name}
      </ThemedText>
    </Pressable>
  );

  return (
    <ScreenScrollView>
      <View style={styles.header}>
        <ThemedText type="h2">Bills & Utilities</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          Pay your bills quickly and securely
        </ThemedText>
      </View>

      <View style={styles.grid}>
        {services.map(renderServiceCard)}
      </View>

      <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="info" size={20} color={theme.info} />
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.md, flex: 1 }}>
          All bill payments are processed instantly via VTPass
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.sm,
    marginBottom: Spacing.xl,
  },
  serviceCard: {
    width: "50%",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  serviceName: {
    marginTop: Spacing.md,
    textAlign: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
