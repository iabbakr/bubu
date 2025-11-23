// screens/PharmacyScreen.tsx

import { View, StyleSheet, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { ProductCard } from "../components/ProductCard";
import { LocationFilter } from "../components/LocationFilter";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { firebaseService, Product } from "../services/firebaseService";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type PharmacyScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Pharmacy'
>;

export default function PharmacyScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<PharmacyScreenNavigationProp>(); 
  const { user } = useAuth();
  const { getTotalItems } = useCart();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(
    user?.location?.state || null
  );

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedState]);

  const loadProducts = async () => {
    try {
      const data = await firebaseService.getProducts("pharmacy");
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    if (!selectedState) {
      // Show all products
      setFilteredProducts(products);
    } else {
      // Filter by selected state
      const filtered = products.filter(
        product => product.location?.state === selectedState
      );
      setFilteredProducts(filtered);
    }
  };

  const renderHeader = () => (
  <View style={styles.header}>
    <View style={styles.headerTop}>
      <View>
        <ThemedText type="h2">Health & Wellness</ThemedText>
        <ThemedText
          type="caption"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          {selectedState
            ? `Products in ${selectedState}`
            : "Medicines and health products you can trust"
          }
        </ThemedText>
      </View>
    </View>

    <LocationFilter
        selectedState={selectedState}
        onStateChange={setSelectedState}
      />
  </View>

  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="map-pin" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        No products in {selectedState || "this area"}
      </ThemedText>
      <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
        {selectedState 
          ? "Try selecting a different state"
          : "Check back later for new items"
        }
      </ThemedText>
      {selectedState && (
        <Pressable
          style={[styles.clearFilter, { backgroundColor: theme.primary }]}
          onPress={() => setSelectedState(null)}
        >
          <ThemedText lightColor="#fff" darkColor="#fff">
            View All States
          </ThemedText>
        </Pressable>
      )}
    </View>
  );

  const cartItemCount = getTotalItems();

  return (
    <ScreenScrollView>
      {renderHeader()}
      
      {cartItemCount > 0 && (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate("Cart" as never)}
        >
          <Feather name="shopping-cart" size={24} color={theme.buttonText} />
          <View style={[styles.badge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
              {cartItemCount}
            </ThemedText>
          </View>
        </Pressable>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Loading products...
          </ThemedText>
        </View>
      ) : filteredProducts.length === 0 ? (
        renderEmpty()
      ) : (
        <View style={styles.grid}>
          {filteredProducts.map(product => (
            <View key={product.id} style={styles.gridItem}>
              <ProductCard 
                product={product} 
                onPress={() => navigation.navigate("ProductDetail",{ productId: product.id })}
              />
            </View>
          ))}
        </View>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.xl,
  },
  headerTop: {
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.sm,
    paddingBottom: 100,
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: Spacing.sm,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  clearFilter: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  loading: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 104,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});