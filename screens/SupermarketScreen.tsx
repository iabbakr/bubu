// screens/SupermarketScreen.tsx

import { View, StyleSheet, Pressable, Alert, SectionList } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { ProductCard } from "../components/ProductCard";
import { ViewModeSelector, ViewMode } from "../components/ViewModeSelector";
import { LocationFilterWithCityAndArea } from "../components/LocationFilterWithCity";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { SearchBar } from "../components/SearchBar";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { firebaseService, Product } from "../services/firebaseService";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type SupermarketScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Supermarket'
>;

export default function SupermarketScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<SupermarketScreenNavigationProp>();
  const { user } = useAuth();
  const { getTotalItems, addToCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | null>(user?.location?.state || null);
  const [selectedCity, setSelectedCity] = useState<string | null>(user?.location?.city || null);
  const [selectedArea, setSelectedArea] = useState<string | null>(user?.location?.area || null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedState, selectedCity, selectedArea, search]);

  const loadProducts = async () => {
    try {
      const data = await firebaseService.getProducts("supermarket");
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedState) {
      filtered = filtered.filter(p => p.location?.state === selectedState);
    }

    if (selectedCity) {
      filtered = filtered.filter(p => p.location?.city === selectedCity);
    }

    if (selectedArea) {
      filtered = filtered.filter(p => p.location?.area === selectedArea);
    }

    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(lowerSearch) ||
             p.description?.toLowerCase().includes(lowerSearch)
      );
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      Alert.alert("Login Required", "Please sign in to add items to cart");
      return;
    }
    addToCart(product, 1);
    Alert.alert("Added!", `${product.name} added to cart`);
  };

  // Group products by subcategory for category view
  const getProductsByCategory = () => {
    const categories = new Map<string, Product[]>();
    
    filteredProducts.forEach(product => {
      const category = product.subcategory || "Other";
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(product);
    });

    return Array.from(categories.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <ThemedText type="h2">Fresh Groceries</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {selectedState 
              ? selectedCity
                ? selectedArea
                  ? `Products in ${selectedArea}, ${selectedCity}`
                  : `Products in ${selectedCity}, ${selectedState}`
                : `Products in ${selectedState}`
              : "Quality products delivered to your door"
            }
          </ThemedText>
        </View>
      </View>

      <SearchBar value={search} onChange={setSearch} />

      <LocationFilterWithCityAndArea
        selectedState={selectedState}
        selectedCity={selectedCity}
        selectedArea={selectedArea}
        onChange={(state, city, area) => {
          setSelectedState(state);
          setSelectedCity(city);
          setSelectedArea(area);
        }}
      />

      <ViewModeSelector selected={viewMode} onChange={setViewMode} />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="map-pin" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        No products in {selectedArea || selectedCity || selectedState || "this area"}
      </ThemedText>
      <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
        {selectedState 
          ? "Try selecting a different location"
          : "Check back later for new items"
        }
      </ThemedText>
      {(selectedState || selectedCity || selectedArea) && (
        <Pressable
          style={[styles.clearFilter, { backgroundColor: theme.primary }]}
          onPress={() => {
            setSelectedState(null);
            setSelectedCity(null);
            setSelectedArea(null);
          }}
        >
          <ThemedText lightColor="#fff" darkColor="#fff">
            View All Locations
          </ThemedText>
        </Pressable>
      )}
    </View>
  );

  const renderCategoryView = () => {
    const sections = getProductsByCategory();
    
    return (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <ProductCard
              product={item}
              onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
              viewMode="list"
              onAddToCart={() => handleAddToCart(item)}
            />
          </View>
        )}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={[styles.categoryHeader, { backgroundColor: theme.background }]}>
            <ThemedText type="h3">{title}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {data.length} product{data.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
        )}
        contentContainerStyle={styles.categoryList}
        stickySectionHeadersEnabled={true}
      />
    );
  };

  const cartItemCount = getTotalItems();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {viewMode === "category" ? (
        <>
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg }}>
            {renderHeader()}
          </View>
          {loading ? (
            <View style={styles.loading}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Loading products...
              </ThemedText>
            </View>
          ) : filteredProducts.length === 0 ? (
            renderEmpty()
          ) : (
            renderCategoryView()
          )}
        </>
      ) : (
        <ScreenScrollView>
          {renderHeader()}

          {loading ? (
            <View style={styles.loading}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Loading products...
              </ThemedText>
            </View>
          ) : filteredProducts.length === 0 ? (
            renderEmpty()
          ) : viewMode === "list" ? (
            <View style={styles.list}>
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
                  viewMode="list"
                  onAddToCart={() => handleAddToCart(product)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredProducts.map(product => (
                <View key={product.id} style={styles.gridItem}>
                  <ProductCard
                    product={product}
                    onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
                    viewMode="grid"
                    onAddToCart={() => handleAddToCart(product)}
                  />
                </View>
              ))}
            </View>
          )}
        </ScreenScrollView>
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.lg,
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
  list: {
    paddingBottom: 100,
  },
  listItem: {
    marginBottom: 0,
  },
  categoryList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  categoryHeader: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
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