import { View, StyleSheet, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { ProductCard } from "../components/ProductCard";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useCart } from "../hooks/useCart";
import { firebaseService, Product } from "../utils/firebase";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

export default function PharmacyScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { getTotalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

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

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="h2">Health & Wellness</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
        Medicines and health products you can trust
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="heart" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        No products available
      </ThemedText>
      <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
        Check back later for new items
      </ThemedText>
    </View>
  );

  const cartItemCount = getTotalItems();

  return (
    <ScreenScrollView>
      {renderHeader()}
      
      {cartItemCount > 0 ? (
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
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Loading products...
          </ThemedText>
        </View>
      ) : products.length === 0 ? (
        renderEmpty()
      ) : (
        <View style={styles.grid}>
          {products.map(product => (
            <View key={product.id} style={styles.gridItem}>
              <ProductCard 
                product={product} 
                onPress={() => navigation.navigate("ProductDetail" as never, { productId: product.id } as never)}
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
  loading: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 104,
    width: Spacing.fabSize,
    height: Spacing.fabSize,
    borderRadius: Spacing.fabSize / 2,
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
