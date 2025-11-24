import { View, StyleSheet, FlatList, Pressable } from "react-native";
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

type MyProductsScreenNavigationProp = NativeStackNavigationProp<SellerStackParamList, "MyProducts">;

export default function MyProductsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<MyProductsScreenNavigationProp>();

  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (user) loadProducts();
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    try {
      const allProducts = await firebaseService.getProducts();
      setProducts(allProducts.filter(p => p.sellerId === user.uid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paginatedProducts = products.slice(0, page * PAGE_SIZE);

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>My Products</ThemedText>

        {paginatedProducts.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>You have no products yet.</ThemedText>
          </View>
        ) : (
          <FlatList
            data={paginatedProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProductCard 
                product={item} 
                onPress={() => navigation.navigate("EditProduct", { product: item })} 
            />  
            )}
          />
        )}

        {paginatedProducts.length < products.length && (
          <PrimaryButton
            title="Load More"
            onPress={() => setPage(prev => prev + 1)}
            style={{ marginTop: Spacing.lg }}
          />
        )}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.md },
  empty: { padding: Spacing.xl, borderRadius: BorderRadius.md, alignItems: "center" },
  productCard: { padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
});
