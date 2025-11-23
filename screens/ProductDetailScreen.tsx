import { View, StyleSheet, Image, Pressable, Alert } from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Product } from "../services/firebaseService";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

type RouteParams = {
  productId: string;
};

export default function ProductDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: RouteParams }, "params">>();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [route.params?.productId]);

  const loadProduct = async () => {
    try {
      const products = await firebaseService.getProducts();
      const found = products.find(p => p.id === route.params?.productId);
      setProduct(found || null);
    } catch (error) {
      console.error("Error loading product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!user) {
      Alert.alert("Error", "Please sign in to add items to cart");
      return;
    }

    if (!product) return;

    addToCart(product, quantity);
    Alert.alert(
      "Success",
      `Added ${quantity} ${product.name} to cart`,
      [
        { text: "Continue Shopping", style: "cancel" },
        { text: "View Cart", onPress: () => navigation.navigate("Cart" as never) },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenScrollView>
        <View style={styles.loading}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Loading product...
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  if (!product) {
    return (
      <ScreenScrollView>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
            Product not found
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  const discountedPrice = product.discount 
    ? product.price * (1 - product.discount / 100)
    : product.price;

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <Image 
          source={{ uri: product.imageUrl || "https://via.placeholder.com/400" }}
          style={styles.image}
        />

        {product.discount ? (
          <View style={[styles.badge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
              SAVE {product.discount}%
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.content}>
          <ThemedText type="h2" style={{ marginBottom: Spacing.sm }}>
            {product.name}
          </ThemedText>

          <View style={styles.priceRow}>
            <ThemedText type="h1" style={{ color: theme.primary }}>
              ₦{discountedPrice.toFixed(2)}
            </ThemedText>
            {product.discount ? (
              <ThemedText 
                type="h4" 
                style={[styles.originalPrice, { color: theme.textSecondary }]}
              >
                ₦{product.price.toFixed(2)}
              </ThemedText>
            ) : null}
          </View>

          <View style={[styles.stockBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather 
              name="package" 
              size={16} 
              color={product.stock > 0 ? theme.success : theme.error} 
            />
            <ThemedText 
              type="caption" 
              style={{ 
                marginLeft: Spacing.xs,
                color: product.stock > 0 ? theme.success : theme.error 
              }}
            >
              {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </ThemedText>
          </View>

          <ThemedText type="h4" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
            Description
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {product.description}
          </ThemedText>

          <View style={styles.quantitySection}>
            <ThemedText type="h4">Quantity</ThemedText>
            <View style={styles.quantityControls}>
              <Pressable
                style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Feather name="minus" size={20} color={theme.text} />
              </Pressable>
              <ThemedText type="h3" style={styles.quantity}>{quantity}</ThemedText>
              <Pressable
                style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                <Feather name="plus" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <PrimaryButton
            title={`Add to Cart • ₦${(discountedPrice * quantity).toFixed(2)}`}
            onPress={handleAddToCart}
            disabled={product.stock === 0}
          />
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  image: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  badge: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    padding: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  originalPrice: {
    textDecorationLine: "line-through",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  quantitySection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: {
    marginHorizontal: Spacing.xl,
    minWidth: 40,
    textAlign: "center",
  },
});
