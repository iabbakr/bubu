import { View, StyleSheet, Pressable, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Product } from "@/utils/firebase";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { theme } = useTheme();
  
  const discountedPrice = product.discount 
    ? product.price * (1 - product.discount / 100)
    : product.price;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { 
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1
        }
      ]}
      onPress={onPress}
    >
      <Image 
        source={{ uri: product.imageUrl || "https://via.placeholder.com/150" }}
        style={styles.image}
      />
      {product.discount ? (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
            -{product.discount}%
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.content}>
        <ThemedText type="h4" numberOfLines={2} style={styles.name}>
          {product.name}
        </ThemedText>
        <View style={styles.priceRow}>
          <ThemedText type="h3" style={{ color: theme.primary }}>
            ${discountedPrice.toFixed(2)}
          </ThemedText>
          {product.discount ? (
            <ThemedText 
              type="caption" 
              style={[styles.originalPrice, { color: theme.textSecondary }]}
            >
              ${product.price.toFixed(2)}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.footer}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Stock: {product.stock}
          </ThemedText>
          <Feather name="shopping-cart" size={18} color={theme.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  image: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  badge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: Spacing.md,
  },
  name: {
    marginBottom: Spacing.xs,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  originalPrice: {
    textDecorationLine: "line-through",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
});
