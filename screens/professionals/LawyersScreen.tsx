// screens/professionals/LawyersScreen.tsx
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

const LAWYER_SPECIALIZATIONS = [
  "All",
  "Corporate Law",
  "Criminal Law",
  "Family Law",
  "Real Estate",
  "Intellectual Property",
  "Tax Law",
];

export default function LawyersScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [lawyers, setLawyers] = useState<Professional[]>([]);
  const [filteredLawyers, setFilteredLawyers] = useState<Professional[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);
  const [selectedSpecialization, setSelectedSpecialization] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLawyers();
  }, []);

  useEffect(() => {
    filterLawyers();
  }, [lawyers, searchQuery, filterOnline, selectedSpecialization]);

  const loadLawyers = async () => {
    try {
      setLoading(true);
      const data = await professionalService.getProfessionalsByType("lawyer");
      setLawyers(data);
    } catch (error) {
      Alert.alert("Error", "Failed to load lawyers");
    } finally {
      setLoading(false);
    }
  };

  const filterLawyers = () => {
    let filtered = lawyers;
    
    if (filterOnline) {
      filtered = filtered.filter((l) => l.isOnline);
    }
    
    if (selectedSpecialization !== "All") {
      filtered = filtered.filter((l) => l.specialization === selectedSpecialization);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.specialization?.toLowerCase().includes(query)
      );
    }
    
    setFilteredLawyers(filtered);
  };

  const handleLawyerPress = (lawyer: Professional) => {
    navigation.navigate("ProfessionalProfile", { professionalId: lawyer.uid });
  };

  const renderLawyerCard = ({ item }: { item: Professional }) => (
    <Pressable
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => handleLawyerPress(item)}
    >
      <Image 
        source={{ uri: item.imageUrl || "https://via.placeholder.com/400" }} 
        style={styles.image} 
      />
      
      {item.isOnline && (
        <View style={[styles.onlineBadge, { backgroundColor: theme.success }]}>
          <View style={styles.pulseDot} />
          <ThemedText lightColor="#fff" style={styles.badgeText}>Available</ThemedText>
        </View>
      )}
      
      {item.isVerified && (
        <View style={[styles.verifiedBadge, { backgroundColor: "#8b5cf6" }]}>
          <Feather name="check-circle" size={16} color="#fff" />
        </View>
      )}

      <View style={styles.cardContent}>
        <ThemedText weight="medium" style={{ fontSize: 18 }}>{item.name}</ThemedText>
        
        <View style={styles.specializationRow}>
          <Feather name="briefcase" size={14} color="#8b5cf6" />
          <ThemedText type="caption" style={{ marginLeft: 4, color: theme.textSecondary }}>
            {item.specialization || "General Practice"}
          </ThemedText>
        </View>

        {item.professionalLicense && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <Feather name="shield" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 4, color: theme.textSecondary }}>
              Bar License: {item.professionalLicense}
            </ThemedText>
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Feather name="award" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ marginLeft: 4 }}>
              {item.yearsOfExperience}+ years
            </ThemedText>
          </View>
          
          <View style={styles.ratingContainer}>
            <Feather name="star" size={14} color="#fbbf24" />
            <ThemedText weight="medium" style={{ marginLeft: 4 }}>
              {item.rating || "New"}
            </ThemedText>
            {item.reviewCount && (
              <ThemedText type="caption" style={{ marginLeft: 4, color: theme.textSecondary }}>
                ({item.reviewCount})
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Consultation Fee
            </ThemedText>
            <ThemedText type="h4" style={{ color: "#8b5cf6" }}>
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

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: "#8b5cf6" + "15", borderColor: "#8b5cf6" }]}
            onPress={() => handleLawyerPress(item)}
          >
            <Feather name="phone" size={14} color="#8b5cf6" />
            <ThemedText style={{ marginLeft: 4, color: "#8b5cf6", fontSize: 13, fontWeight: "600" }}>
              Consult
            </ThemedText>
          </Pressable>
          
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            onPress={() => handleLawyerPress(item)}
          >
            <Feather name="info" size={14} color={theme.text} />
            <ThemedText style={{ marginLeft: 4, fontSize: 13 }}>
              View Profile
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText type="h2">Legal Consultation</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
              {filteredLawyers.length} lawyers available
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
            <Feather 
              name="check-circle" 
              size={16} 
              color={filterOnline ? "#fff" : theme.text} 
            />
            <ThemedText 
              lightColor={filterOnline ? "#fff" : theme.text}
              style={{ marginLeft: 4, fontSize: 13 }}
            >
              Online
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search lawyers by name..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Specialization Filters */}
        <View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            Practice Area
          </ThemedText>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={LAWYER_SPECIALIZATIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.specializationChip,
                  {
                    backgroundColor: selectedSpecialization === item ? "#8b5cf6" : theme.cardBackground,
                    borderColor: selectedSpecialization === item ? "#8b5cf6" : theme.border,
                  }
                ]}
                onPress={() => setSelectedSpecialization(item)}
              >
                <ThemedText
                  lightColor={selectedSpecialization === item ? "#fff" : theme.text}
                  style={{ fontSize: 13, fontWeight: "600" }}
                >
                  {item}
                </ThemedText>
              </Pressable>
            )}
            contentContainerStyle={{ gap: Spacing.sm }}
          />
        </View>
      </View>

      <FlatList
        data={filteredLawyers}
        keyExtractor={(item) => item.uid}
        renderItem={renderLawyerCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="briefcase" size={64} color={theme.textSecondary} />
            <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
              No lawyers found
            </ThemedText>
            <ThemedText type="caption" style={{ marginTop: 8, color: theme.textSecondary }}>
              Try adjusting your filters
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
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 16 },
  specializationChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
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
  verifiedBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
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
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
});