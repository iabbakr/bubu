import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Image,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "../../components/ThemedText";
import { useTheme } from "../../hooks/useTheme";
import { Spacing, BorderRadius } from "../../constants/theme";
import { professionalService, Professional } from "../../services/professionalService";
import { ServicesStackParamList } from "../../navigation/ServicesStackNavigator";

type NavigationProp = NativeStackNavigationProp<ServicesStackParamList>;

export default function PharmacistsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [pharmacists, setPharmacists] = useState<Professional[]>([]);
  const [filteredPharmacists, setFilteredPharmacists] = useState<Professional[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPharmacists();
  }, []);

  useEffect(() => {
    filterPharmacists();
  }, [pharmacists, searchQuery, filterOnline]);

  const loadPharmacists = async () => {
    try {
      setLoading(true);
      const data = await professionalService.getProfessionalsByType("pharmacist");
      setPharmacists(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load pharmacists");
    } finally {
      setLoading(false);
    }
  };

  const filterPharmacists = () => {
    let filtered = pharmacists;
    if (filterOnline) filtered = filtered.filter((p) => p.isOnline);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.specialization?.toLowerCase().includes(query)
      );
    }
    setFilteredPharmacists(filtered);
  };

  const renderCard = ({ item }: { item: Professional }) => (
    <Pressable
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => navigation.navigate("ProfessionalProfile", { professionalId: item.uid })}
    >
      <Image source={{ uri: item.imageUrl || "https://via.placeholder.com/400" }} style={styles.image} />
      
      {item.isOnline && (
        <View style={[styles.onlineBadge, { backgroundColor: theme.success }]}>
          <View style={styles.pulseDot} />
          <ThemedText lightColor="#fff" style={styles.badgeText}>Online</ThemedText>
        </View>
      )}
      
      <View style={styles.cardContent}>
        <ThemedText weight="medium" style={{ fontSize: 18 }}>{item.name}</ThemedText>
        <View style={styles.specializationRow}>
          <Feather name="package" size={14} color={theme.success} />
          <ThemedText type="caption" style={{ marginLeft: 4, color: theme.textSecondary }}>
            {item.specialization || "Clinical Pharmacist"}
          </ThemedText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Feather name="briefcase" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 4 }}>
              {item.yearsOfExperience}+ years
            </ThemedText>
          </View>
          <View style={styles.ratingContainer}>
            <Feather name="star" size={14} color="#fbbf24" />
            <ThemedText weight="medium" style={{ marginLeft: 4 }}>
              {item.rating || "New"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Consultation Fee</ThemedText>
            <ThemedText type="h4" style={{ color: theme.success }}>
              ₦{item.consultationFee?.toLocaleString()}
            </ThemedText>
          </View>
          <View style={[styles.queueBadge, { backgroundColor: theme.info + "15" }]}>
            <Feather name="users" size={14} color={theme.info} />
            <ThemedText style={{ marginLeft: 4, color: theme.info, fontWeight: "600" }}>
              {item.currentQueue || 0}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText type="h2">Find a Pharmacist</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              {filteredPharmacists.length} pharmacists available
            </ThemedText>
          </View>
          <Pressable 
            style={[
              styles.filterBtn, 
              { 
                backgroundColor: filterOnline ? theme.success : theme.backgroundSecondary,
                borderColor: filterOnline ? theme.success : theme.border 
              }
            ]}
            onPress={() => setFilterOnline(!filterOnline)}
          >
            <Feather name="check-circle" size={16} color={filterOnline ? "#fff" : theme.text} />
            <ThemedText lightColor={filterOnline ? "#fff" : theme.text} style={{ marginLeft: 4, fontSize: 13 }}>
              Online Only
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search pharmacists..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredPharmacists}
        keyExtractor={(item) => item.uid}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="user-x" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
              No pharmacists found
            </ThemedText>
          </View>
        }
      />
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 16 },
  listContent: { padding: Spacing.lg },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  onlineBadge: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  cardContent: { padding: Spacing.lg },
  specializationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  queueBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
});