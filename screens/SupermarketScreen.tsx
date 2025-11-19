import { View, StyleSheet, FlatList, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { ProductCard } from "../components/ProductCard";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Product } from "../utils/firebase";
import { useTheme } from "../hooks/useTheme";
import { Spacing } from "../constants/theme";

export default function SupermarketScreen() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

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

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="h2">Fresh Groceries</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
        Quality products delivered to your door
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather name="shopping-bag" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
        No products available
      </ThemedText>
      <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
        Check back later for new items
      </ThemedText>
    </View>
  );

  return (
    <ScreenScrollView>
      {renderHeader()}
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
                onPress={() => {}}
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
});
