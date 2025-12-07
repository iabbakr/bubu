import { View, StyleSheet, Pressable, Image, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Product } from "../services/firebaseService";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { soundManager } from '../lib/soundManager';
import { useAuth } from "../hooks/useAuth";
import { doc, onSnapshot, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useState, useEffect } from "react";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  viewMode?: "grid" | "list";
  onAddToCart?: () => void;
}

export function ProductCard({
  product,
  onPress,
  viewMode = "grid",
  onAddToCart,
}: ProductCardProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

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

  // Realtime wishlist status
  useEffect(() => {
    if (!user) {
      setIsWishlisted(false);
      return;
    }

    const wishlistRef = doc(db, "users", user.uid, "wishlist", product.id);

    const unsubscribe = onSnapshot(wishlistRef, (snap) => {
      setIsWishlisted(snap.exists());
    });

    return () => unsubscribe();
  }, [user, product.id]);

  const toggleWishlist = async (e: any) => {
    e.stopPropagation();

    if (!user) {
      // You can show login alert here if you want
      return;
    }

    if (loadingWishlist) return;
    setLoadingWishlist(true);

    try {
      const wishlistRef = doc(db, "users", user.uid, "wishlist", product.id);

      if (isWishlisted) {
        await deleteDoc(wishlistRef);
        //await soundManager.play?.("removeFromWishlist");
      } else {
        await setDoc(wishlistRef, { addedAt: Date.now() });
       // await soundManager.play?.("addToWishlist");
      }
    } catch (err) {
      console.error("Wishlist error:", err);
    } finally {
      setLoadingWishlist(false);
    }
  };

  // Shared wishlist button (used in both views)
  const WishlistButton = () => (
    <Pressable
      onPress={toggleWishlist}
      style={[
        styles.wishlistButton,
        {
          backgroundColor: theme.cardBackground + "E6", // semi-transparent
          borderColor: theme.border,
        },
        loadingWishlist && { opacity: 0.6 },
      ]}
      disabled={loadingWishlist}
    >
      <Feather
        name={isWishlisted ? "heart" : "heart"}
        size={18}
        color={isWishlisted ? theme.error : theme.textSecondary}
        style={isWishlisted && styles.filledHeart}
      />
    </Pressable>
  );

  // ================= LIST VIEW =================
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
        <View style={styles.listImageWrapper}>
          <Image
            source={{ uri: product.imageUrls?.[0] || "https://via.placeholder.com/300" }}
            style={styles.listImage}
            resizeMode="cover"
          />

          {/* Discount Badge */}
          {product.discount ? (
            <View style={[styles.listDiscountBadge, { backgroundColor: theme.error }]}>
              <ThemedText style={styles.listDiscountText}>-{product.discount}%</ThemedText>
            </View>
          ) : null}

          {/* Wishlist Heart - Top Left */}
          <WishlistButton />

          {/* Out of Stock Overlay */}
          {isUnavailable && (
            <View style={styles.listOverlay}>
              <ThemedText style={styles.listOverlayText}>
                {isExpired ? "EXPIRED" : "OUT"}
              </ThemedText>
            </View>
          )}
        </View>

        {/* ... rest of list content (unchanged) */}
        <View style={styles.listContent}>
          <View style={styles.roww}>
            <View>
              {product.brand && (
                <ThemedText type="caption" style={{ color: theme.primary, marginBottom: 4 }} numberOfLines={1}>
                  {product.brand}
                </ThemedText>
              )}
            </View>
            <View>
              {product.location.area && (
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 6, fontSize: 11 }} numberOfLines={1}>
                  {product.location.city}{product.location.area ? `, ${product.location.area}` : ""}
                </ThemedText>
              )}
            </View>
          </View>

          <ThemedText type="h4" numberOfLines={2} style={{ marginBottom: 8 }}>
            {product.name}
          </ThemedText>

          {product.subcategory && (
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 8 }} numberOfLines={1}>
              {product.subcategory}
            </ThemedText>
          )}

          <View style={styles.listFooter}>
            <View>
              <ThemedText type="h3" style={{ color: theme.primary, fontWeight: "700" }}>
                ₦{Math.round(finalPrice).toLocaleString()}
              </ThemedText>
              {product.discount && (
                <ThemedText type="caption" style={[styles.strike, { color: theme.textSecondary }]}>
                  ₦{Math.round(product.price).toLocaleString()}
                </ThemedText>
              )}
            </View>

            {onAddToCart && (
              <Pressable
                style={[styles.listCartButton, { backgroundColor: isUnavailable ? theme.border : theme.primary }]}
                onPress={async (e) => {
                  e.stopPropagation();
                  if (!isUnavailable) {
                    onAddToCart();
                    await soundManager.play?.('addToCart');
                  }
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

  // ================= GRID VIEW =================
  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridContainer,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.imageSection}>
        <Image
          source={{ uri: product.imageUrls?.[0] || "https://via.placeholder.com/300" }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Discount Badge */}
        {product.discount ? (
          <View style={[styles.discountBadge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.badgeText}>-{product.discount}%</ThemedText>
          </View>
        ) : null}

        {/* Wishlist Heart - Top Left */}
        <WishlistButton />

        {/* Out of Stock Overlay */}
        {isUnavailable && (
          <View style={styles.overlay}>
            <ThemedText style={styles.overlayText}>
              {isExpired ? "EXPIRED" : "OUT OF STOCK"}
            </ThemedText>
          </View>
        )}
      </View>

      {/* ... rest of grid content (unchanged) */}
      <View style={styles.contentSection}>
        {/* ... your existing grid content */}
        <View style={styles.roww}>
          <View style={{ flexShrink: 1 }}>
            {(product.brand || product.weight) && (
              <ThemedText type="caption" style={{ color: theme.primary, marginBottom: 4 }} numberOfLines={1}>
                {product.brand} {product.weight ? `• ${product.weight}` : ""}
              </ThemedText>
            )}
          </View>
          <View style={{ flexShrink: 0 }}>
            {product.location.area && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="map-pin" size={11} color={theme.textSecondary} />
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4, fontSize: 10 }} numberOfLines={1}>
                  {product.location.area}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <ThemedText type="h4" numberOfLines={2} style={styles.productName}>
          {product.name}
        </ThemedText>

        <View style={styles.priceRow}>
          <ThemedText type="h3" style={{ color: theme.primary, fontWeight: "700" }}>
            ₦{Math.round(finalPrice).toLocaleString()}
          </ThemedText>
          {product.discount && (
            <ThemedText type="caption" style={[styles.strike, { color: theme.textSecondary }]} numberOfLines={1}>
              ₦{Math.round(product.price).toLocaleString()}
            </ThemedText>
          )}
        </View>

        <View style={styles.footer}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Feather name="package" size={14} color={product.stock > 0 ? theme.success : theme.error} />
            <ThemedText type="caption" style={{ marginLeft: 4, color: product.stock > 0 ? theme.success : theme.error, fontSize: 12 }} numberOfLines={1}>
              {product.stock > 0 ? `${product.stock} left` : "Unavailable"}
            </ThemedText>
          </View>

          {onAddToCart && (
            <Pressable
              style={[styles.cartButton, { backgroundColor: isUnavailable ? theme.border : theme.primary }]}
              onPress={async (e) => {
                e.stopPropagation();
                if (!isUnavailable) {
                  onAddToCart();
                  await soundManager.play?.('addToCart');
                }
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

// ================= STYLES =================

const styles = StyleSheet.create({
  // Wishlist Button (used in both views)
  wishlistButton: {
    position: "absolute",
    top: 3,
    left: 3,   // ← Top-left, just like discount is top-right
    width: 26,
    height: 26,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    zIndex: 10,
  },
  filledHeart: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  gridContainer: {
    height: 210,
    width: "100%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },

  imageSection: {
    height: "55%",
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },

  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },

  overlayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },

  // **UPDATED**: Prevent content from expanding height
  contentSection: {
    height: "45%",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    justifyContent: "space-between",
    minHeight: 80,
    maxHeight: 90,
  },

  productName: {
    fontWeight: "600",
    fontSize: 12.3,
    lineHeight: 16,
    marginBottom: 2,
    flexShrink: 1,
  },

  roww: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  strike: {
    textDecorationLine: "line-through",
    fontSize: 11,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  listContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    height: 110,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },

  listImageWrapper: {
    position: "relative",
    width: 120,
    height: "100%",
  },

  listImage: {
    width: "100%",
    height: "100%",
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
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
