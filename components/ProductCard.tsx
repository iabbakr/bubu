// components/ProductCard.tsx (Enhanced with List View Support)

import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Product } from "../services/firebaseService";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  viewMode?: "grid" | "list";
  onAddToCart?: () => void;
}

export function ProductCard({ product, onPress, viewMode = "grid", onAddToCart }: ProductCardProps) {
  const { theme } = useTheme();

  const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const isNearExpiry = product.expiryDate
    ? new Date(product.expiryDate) < new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
    : false;

  const isExpired = product.expiryDate
    ? new Date(product.expiryDate) < new Date()
    : false;

  const isUnavailable = product.stock === 0 || isExpired;

  // LIST VIEW
  if (viewMode === "list") {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.listContainer,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={onPress}
      >
        {/* Left: Image */}
        <View style={styles.listImageWrapper}>
          <Image
            source={{ uri: product.imageUrl || "https://via.placeholder.com/300" }}
            style={styles.listImage}
            resizeMode="cover"
          />
          {product.discount ? (
            <View style={[styles.listDiscountBadge, { backgroundColor: theme.error }]}>
              <ThemedText style={styles.listDiscountText}>-{product.discount}%</ThemedText>
            </View>
          ) : null}
          {isUnavailable && (
            <View style={styles.listOverlay}>
              <ThemedText style={styles.listOverlayText}>
                {isExpired ? "EXPIRED" : "OUT"}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Right: Content */}
        <View style={styles.listContent}>
          {/* Brand/Weight */}
          {product.brand && (
            <ThemedText type="caption" style={{ color: theme.primary, marginBottom: 2 }}>
              {product.brand}
            </ThemedText>
          )}

          {/* Name */}
          <ThemedText type="h4" numberOfLines={2} style={{ marginBottom: 4 }}>
            {product.name}
          </ThemedText>

          {/* Subcategory */}
          {product.subcategory && (
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 8 }}>
              {product.subcategory}
            </ThemedText>
          )}

          {/* Badges Row */}
          <View style={styles.listBadgesRow}>
            {product.isPrescriptionRequired && (
              <View style={[styles.listBadge, { backgroundColor: "#007AFF20" }]}>
                <Feather name="file-text" size={10} color="#007AFF" />
              </View>
            )}
            {isNearExpiry && !isExpired && (
              <View style={[styles.listBadge, { backgroundColor: "#FF950020" }]}>
                <Feather name="alert-triangle" size={10} color="#FF9500" />
              </View>
            )}
            <View style={[styles.listBadge, { backgroundColor: product.stock > 0 ? theme.success + "20" : theme.error + "20" }]}>
              <Feather name="package" size={10} color={product.stock > 0 ? theme.success : theme.error} />
              <ThemedText type="caption" style={{ marginLeft: 4, fontSize: 10, color: product.stock > 0 ? theme.success : theme.error }}>
                {product.stock > 0 ? `${product.stock}` : "0"}
              </ThemedText>
            </View>
          </View>

          {/* Price & Action */}
          <View style={styles.listFooter}>
            <View>
              <ThemedText type="h3" style={{ color: theme.primary, fontWeight: "700" }}>
                ₦{Math.round(finalPrice).toLocaleString()}
              </ThemedText>
              {product.discount ? (
                <ThemedText type="caption" style={[styles.strike, { color: theme.textSecondary }]}>
                  ₦{Math.round(product.price).toLocaleString()}
                </ThemedText>
              ) : null}
            </View>
            {onAddToCart && (
              <Pressable
                style={[styles.listCartButton, { backgroundColor: isUnavailable ? theme.border : theme.primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (!isUnavailable) onAddToCart();
                }}
                disabled={isUnavailable}
              >
                <Feather name="shopping-cart" size={18} color={isUnavailable ? theme.textSecondary : "#fff"} />
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  // GRID VIEW (Default)
  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridContainer,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.85 : 1,
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
        {isUnavailable && (
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
          {product.isPrescriptionRequired && (
            <View style={[styles.smallBadge, { backgroundColor: "#007AFF20" }]}>
              <Feather name="file-text" size={12} color="#007AFF" />
              <ThemedText type="caption" style={{ marginLeft: 4, color: "#007AFF", fontSize: 11 }}>
                Rx
              </ThemedText>
            </View>
          )}
          {isNearExpiry && !isExpired && (
            <View style={[styles.smallBadge, { backgroundColor: "#FF950020" }]}>
              <Feather name="alert-triangle" size={12} color="#FF9500" />
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

          {onAddToCart && (
            <Pressable
              style={[styles.cartButton, { backgroundColor: isUnavailable ? theme.border : theme.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                if (!isUnavailable) onAddToCart();
              }}
              disabled={isUnavailable}
            >
              <Feather name="shopping-cart" size={16} color={isUnavailable ? theme.textSecondary : "#fff"} />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // GRID STYLES
  gridContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
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
    fontSize: 16,
    fontWeight: "bold",
  },
  content: {
    padding: Spacing.md,
  },
  name: {
    marginBottom: 6,
    minHeight: 44,
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
    gap: 6,
    marginVertical: 6,
    minHeight: 24,
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
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // LIST STYLES
  listContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  listImageWrapper: {
    position: "relative",
    width: 120,
    height: 120,
  },
  listImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f5f5f5",
  },
  listDiscountBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  listDiscountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  listOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  listOverlayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  listContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  listBadgesRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 8,
  },
  listBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  listFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listCartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});