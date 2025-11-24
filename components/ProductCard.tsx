// components/ProductCard.tsx

import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Product } from "@/services/firebaseService";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { theme } = useTheme();

  const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const isNearExpiry = product.expiryDate
    ? new Date(product.expiryDate) < new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // ~45 days
    : false;

  const isExpired = product.expiryDate
    ? new Date(product.expiryDate) < new Date()
    : false;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        },
      ]}
      onPress={onPress}
    >
      {/* Image + Badges */}
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: product.imageUrl || "https://via.placeholder.com/300" }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Discount Badge */}
        {product.discount ? (
          <View style={[styles.discountBadge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.badgeText}>SAVE {product.discount}%</ThemedText>
          </View>
        ) : null}

        {/* Out of Stock / Expired Overlay */}
        {(product.stock === 0 || isExpired) && (
          <View style={styles.overlay}>
            <ThemedText style={styles.overlayText}>
              {isExpired ? "EXPIRED" : "OUT OF STOCK"}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Brand + Weight */}
        {(product.brand || product.weight) && (
          <ThemedText type="caption" style={{ color: theme.primary, marginBottom: 4 }}>
            {product.brand} {product.weight ? `• ${product.weight}` : ""}
          </ThemedText>
        )}

        {/* Product Name */}
        <ThemedText type="h4" numberOfLines={2} style={styles.name}>
          {product.name}
        </ThemedText>

        {/* Subcategory Chip */}
        {product.subcategory && (
          <View style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ fontSize: 11 }}>
              {product.subcategory}
            </ThemedText>
          </View>
        )}

        {/* Info Badges Row */}
        <View style={styles.badgesRow}>
          {/* Prescription Badge */}
          {product.isPrescriptionRequired && (
            <View style={[styles.smallBadge, { backgroundColor: "#007AFF20" }]}>
              <Feather name="file-text" size={12} color="#007AFF" />
              <ThemedText type="caption" style={{ marginLeft: 4, color: "#007AFF", fontSize: 11 }}>
                Rx Required
              </ThemedText>
            </View>
          )}

          {/* Expiring Soon Badge */}
          {isNearExpiry && !isExpired && (
            <View style={[styles.smallBadge, { backgroundColor: "#FF950020" }]}>
              <Feather name="alert-triangle" size={12} color="#FF9500" />
              <ThemedText type="caption" style={{ marginLeft: 4, color: "#FF9500", fontSize: 11 }}>
                Expiring Soon
              </ThemedText>
            </View>
          )}
        </View>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <ThemedText type="h3" style={{ color: theme.primary, fontWeight: "700" }}>
            ₦{Math.round(finalPrice).toLocaleString()}
          </ThemedText>
          {product.discount ? (
            <ThemedText type="caption" style={[styles.strike, { color: theme.textSecondary }]}>
              ₦{Math.round(product.price).toLocaleString()}
            </ThemedText>
          ) : null}
        </View>

        {/* Stock + Cart Icon */}
        <View style={styles.footer}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Feather
              name="package"
              size={14}
              color={product.stock > 0 ? theme.success : theme.error}
            />
            <ThemedText
              type="caption"
              style={{
                marginLeft: 4,
                color: product.stock > 0 ? theme.success : theme.error,
              }}
            >
              {product.stock > 0 ? `${product.stock} left` : "Unavailable"}
            </ThemedText>
          </View>

          <Feather name="shopping-cart" size={18} color={theme.primary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  imageWrapper: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 180,
    backgroundColor: "#f5f5f5",
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    padding: Spacing.md,
  },
  name: {
    marginBottom: 6,
    minHeight: 48,
  },
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 6,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  smallBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  strike: {
    textDecorationLine: "line-through",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
});