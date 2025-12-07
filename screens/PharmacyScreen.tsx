import { View, StyleSheet, Pressable, Alert, FlatList, Dimensions } from "react-native";
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
import { Animated } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
// --- ASSUMED I18N IMPORT ---
import i18n from '@/lib/i18n'; 
// ---------------------------

type PharmacyScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Pharmacy'
>;

interface CategoryData {
  name: string;
  count: number;
  icon: string;
  color: string;
}

const ScreenHeader = ({ navigation, cartItemCount, theme, selectedState, selectedCity, selectedArea, onLocationChange }: { 
  navigation: PharmacyScreenNavigationProp, 
  cartItemCount: number, 
  theme: ReturnType<typeof useTheme>['theme'],
  selectedState: string | null,
  selectedCity: string | null,
  selectedArea: string | null,
  onLocationChange: (state: string | null, city: string | null, area: string | null) => void,
}) => (
  <SafeAreaView edges={['top']} style={[styles.screenHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
    <View style={styles.screenHeaderContent}>
      <View style={styles.screenHeaderLocation}>
        <LocationFilterWithCityAndArea
          selectedState={selectedState}
          selectedCity={selectedCity}
          selectedArea={selectedArea}
          style={styles.locationFilterInHeader} 
          onChange={onLocationChange}
          hideLabels={true} 
        />
      </View>
      
      <Pressable
        style={styles.headerCartButton}
        // NOTE: 'Cart' might need to be translated if your route names are translated, 
        // but typically route names are static strings.
        onPress={() => navigation.navigate("Cart" as never)}
      >
        <Feather name="shopping-cart" size={24} color={theme.text} />
        {cartItemCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
              {cartItemCount}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </View>
  </SafeAreaView>
);

export default function PharmacyScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<PharmacyScreenNavigationProp>();
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedState, selectedCity, selectedArea, search]);

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
      Alert.alert(
        i18n.t("login_required"), 
        i18n.t("sign_in_add_to_cart")
      );
      return;
    }

    if (product.isPrescriptionRequired) {
      Alert.alert(
        i18n.t("prescription_required_title"),
        i18n.t("prescription_required_body"),
        [
          { text: i18n.t("cancel"), style: "cancel" },
          { 
            text: i18n.t("add_anyway"), 
            onPress: () => {
              addToCart(product, 1);
              Alert.alert(i18n.t("success"), i18n.t("added_to_cart", { product: product.name }));
            }
          }
        ]
      );
      return;
    }

    addToCart(product, 1);
    Alert.alert(i18n.t("success"), i18n.t("added_to_cart", { product: product.name }));
  };

  const getCategoryColor = (category: string): string => {
    const colorMap: { [key: string]: string } = {
      'Prescription': '#E63946',
      'Pain Relief': '#FF6B6B',
      'Vitamins': '#FFD43B',
      'First Aid': '#FF8787',
      'Personal Care': '#CC5DE8',
      'Baby Care': '#74C0FC',
      'Medical Devices': '#51CF66',
      'Supplements': '#FF922B',
      'General Medicine': '#4DABF7',
      'Other': '#868E96',
    };
    return colorMap[category] || '#868E96';
  };

  const getCategoryIcon = (category: string): string => {
    const iconMap: { [key: string]: string } = {
      'Prescription': 'file-text',
      'Pain Relief': 'zap',
      'Vitamins': 'heart',
      'First Aid': 'plus-square',
      'Personal Care': 'user',
      'Baby Care': 'smile',
      'Medical Devices': 'activity',
      'Supplements': 'star',
      'General Medicine': 'package',
      'Other': 'grid',
    };
    return iconMap[category] || 'box';
  };

  const getCategories = (): CategoryData[] => {
    const categories = new Map<string, number>();
    
    filteredProducts.forEach(product => {
      const category = product.subcategory || "General Medicine";
      categories.set(category, (categories.get(category) || 0) + 1);
    });

    return Array.from(categories.entries())
      .map(([name, count]) => ({
        name,
        count,
        icon: getCategoryIcon(name),
        color: getCategoryColor(name),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const getCategoryProducts = (category: string): Product[] => {
    return filteredProducts.filter(p => (p.subcategory || "General Medicine") === category);
  };

  const renderHeader = () => {
    let locationText = i18n.t("medicines_and_health_products");

    if (selectedArea) {
      locationText = `${i18n.t("products_in")} ${selectedArea}, ${selectedCity}`;
    } else if (selectedCity) {
      locationText = `${i18n.t("products_in")} ${selectedCity}, ${selectedState}`;
    } else if (selectedState) {
      locationText = `${i18n.t("products_in")} ${selectedState}`;
    }

    return (
      <Animated.View style={[styles.headerContainer, { backgroundColor: theme.cardBackground }]}>
        <View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            {locationText}
          </ThemedText>
        </View>

        <SearchBar value={search} onChange={setSearch} />
        
        <ViewModeSelector selected={viewMode} onChange={setViewMode} />
      </Animated.View>
    );
  };

  const renderEmpty = () => {
    const areaName = selectedArea || selectedCity || selectedState || i18n.t('this_area'); // Fallback key 'this_area' needed if area is dynamic. Assuming "this area" is already translated in "no_products_in_area"
    
    const subtitleKey = selectedState 
      ? "try_different_location"
      : "check_back_later_new_items";

    return (
      <View style={styles.empty}>
        <Feather name="map-pin" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
          {i18n.t("no_products_in_area", { area: areaName })}
        </ThemedText>
        <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
          {i18n.t(subtitleKey)}
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
              {i18n.t("view_all_locations")}
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const renderCategoryList = () => {
    const categories = getCategories();

    return (
      <View style={styles.categoryListContainer}>
        <View style={styles.categoryListHeader}>
          <ThemedText type="h3">{i18n.t("browse_by_category")}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
            {i18n.t("categories_available", { count: categories.length })}
          </ThemedText>
        </View>

        {categories.map((category, index) => (
          <Pressable
            key={category.name}
            style={[
              styles.categoryListItem, 
              { 
                backgroundColor: theme.cardBackground,
                borderBottomColor: theme.border,
                borderBottomWidth: index < categories.length - 1 ? StyleSheet.hairlineWidth : 0,
              }
            ]}
            onPress={() => setSelectedCategory(category.name)}
          >
            <View style={styles.categoryListLeft}>
              <View style={[styles.categoryIconCircle, { backgroundColor: category.color + '20' }]}>
                <Feather name={category.icon as any} size={24} color={category.color} />
              </View>
              <View style={styles.categoryListInfo}>
                <ThemedText type="defaultSemiBold">{category.name}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {/* Using custom logic for pluralization in English based on original code */}
                  {category.count} {i18n.t('product_count', { count: category.count }).replace('{{count}}', String(category.count))}
                </ThemedText>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>
    );
  };

  const renderCategoryProducts = () => {
    if (!selectedCategory) return null;

    const categoryProducts = getCategoryProducts(selectedCategory);
    const categoryData = getCategories().find(c => c.name === selectedCategory);

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={[styles.categoryProductsHeader, { backgroundColor: categoryData?.color, borderBottomColor: theme.border }]}>
          <Pressable
            style={styles.backButton}
            onPress={() => setSelectedCategory(null)}
          >
            <Feather name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <View style={styles.categoryProductsTitle}>
            <ThemedText type="h2" lightColor="#fff" darkColor="#fff">{selectedCategory}</ThemedText>
            <ThemedText type="caption" lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
              {/* Using custom logic for pluralization in English based on original code */}
              {categoryProducts.length} {i18n.t('product_count', { count: categoryProducts.length }).replace('{{count}}', String(categoryProducts.length))}
            </ThemedText>
          </View>
        </View>

        <ScreenScrollView>
          <View style={styles.list}>
            {categoryProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => navigation.navigate("ProductDetail", { productId: product.id })}
                viewMode="list"
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </View>
        </ScreenScrollView>
      </View>
    );
  };

  const cartItemCount = getTotalItems();

  const handleLocationChange = (state: string | null, city: string | null, area: string | null) => {
    setSelectedState(state);
    setSelectedCity(city);
    setSelectedArea(area);
  };

  if (selectedCategory) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScreenHeader 
          navigation={navigation} 
          cartItemCount={cartItemCount} 
          theme={theme} 
          selectedState={selectedState}
          selectedCity={selectedCity}
          selectedArea={selectedArea}
          onLocationChange={handleLocationChange}
        /> 
        {renderCategoryProducts()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenHeader 
        navigation={navigation} 
        cartItemCount={cartItemCount} 
        theme={theme} 
        selectedState={selectedState}
        selectedCity={selectedCity}
        selectedArea={selectedArea}
        onLocationChange={handleLocationChange}
      /> 

      {viewMode === "category" ? (
        <ScreenScrollView>
          <View>
            {renderHeader()} 
          </View>
          {loading ? (
            <View style={styles.loading}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {i18n.t("loading_products")}
              </ThemedText>
            </View>
          ) : filteredProducts.length === 0 ? (
            renderEmpty()
          ) : (
            renderCategoryList()
          )}
        </ScreenScrollView>
      ) : (
        <ScreenScrollView>
          <View>
            {renderHeader()}
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {i18n.t("loading_products")}
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
    </View>
  );
}

const styles = StyleSheet.create({
  screenHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  screenHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  screenHeaderLocation: {
    flex: 1, 
    marginRight: Spacing.md,
  },
  locationFilterInHeader: {
    paddingVertical: 0,
  },
  headerCartButton: {
    padding: Spacing.sm,
  },
  headerContainer: {
    padding: 5,
    paddingTop: 4,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    margin: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 0,
    backgroundColor: "transparent",
  },
  categoryListContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  categoryListHeader: {
    marginBottom: Spacing.lg,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  categoryListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  categoryListInfo: {
    flex: 1,
  },
  categoryProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  categoryProductsTitle: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 0, 
    paddingHorizontal: 0,
    width: "100%",
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
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
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});