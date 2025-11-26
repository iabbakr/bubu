import { View, StyleSheet, FlatList, Pressable, SectionList } from "react-native";
import { useState, useEffect } from "react";
import { ThemedText } from "../components/ThemedText";
import { ProductCard } from "../components/ProductCard";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { firebaseService, Product } from "../services/firebaseService";
import { Spacing, BorderRadius } from "../constants/theme";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SellerStackParamList } from "../types/type";
import { useNavigation } from "@react-navigation/native";
import { ViewModeSelector, ViewMode } from "../components/ViewModeSelector";

type MyProductsScreenNavigationProp = NativeStackNavigationProp<
  SellerStackParamList,
  "MyProducts"
>;

export default function MyProductsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<MyProductsScreenNavigationProp>();

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (user) loadProducts();
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    try {
      const allProducts = await firebaseService.getProducts();
      setProducts(allProducts.filter((p) => p.sellerId === user.uid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paginatedProducts = products.slice(0, page * PAGE_SIZE);

  // Group by subcategory for category view
  const getProductsByCategory = () => {
    const map = new Map<string, Product[]>();

    paginatedProducts.forEach((product) => {
      const cat = product.subcategory || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(product);
    });

    return Array.from(map.entries()).map(([title, data]) => ({
      title,
      data,
    }));
  };

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>
          My Products
        </ThemedText>

        {/* VIEW MODE SELECTOR */}
        <ViewModeSelector selected={viewMode} onChange={setViewMode} />

        {/* EMPTY STATE */}
        {paginatedProducts.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              You have no products yet.
            </ThemedText>
          </View>
        ) : viewMode === "category" ? (
          // CATEGORY VIEW
          <SectionList
            sections={getProductsByCategory()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <ProductCard
                  product={item}
                  onPress={() =>
                    navigation.navigate("EditProduct", { product: item })
                  }
                  viewMode="list"
                />
              </View>
            )}
            renderSectionHeader={({ section: { title, data } }) => (
              <View style={styles.categoryHeader}>
                <ThemedText type="h3">{title}</ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, marginTop: 2 }}
                >
                  {data.length} item{data.length !== 1 ? "s" : ""}
                </ThemedText>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: Spacing["5xl"] }}
          />
        ) : viewMode === "list" ? (
          // LIST VIEW
          <View style={styles.list}>
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode="list"
                onPress={() =>
                  navigation.navigate("EditProduct", { product })
                }
              />
            ))}
          </View>
        ) : (
          // GRID VIEW
          <View style={styles.grid}>
            {paginatedProducts.map((product) => (
              <View key={product.id} style={styles.gridItem}>
                <ProductCard
                  product={product}
                  viewMode="grid"
                  onPress={() =>
                    navigation.navigate("EditProduct", { product })
                  }
                />
              </View>
            ))}
          </View>
        )}

        {/* LOAD MORE */}
        {paginatedProducts.length < products.length && (
          <PrimaryButton
            title="Load More"
            onPress={() => setPage((prev) => prev + 1)}
            style={{ marginTop: Spacing.lg }}
          />
        )}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.md },
  empty: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
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
  list: {
    paddingBottom: Spacing.lg,
  },
  listItem: {
    marginBottom: Spacing.sm,
  },
  categoryHeader: {
    paddingVertical: Spacing.md,
  },
});
