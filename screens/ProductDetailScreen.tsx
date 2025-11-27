// screens/ProductDetailScreen.tsx

import { View, StyleSheet, Image, Pressable, Alert, ScrollView } from "react-native";
import { useState, useEffect, useRef } from "react";
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

type RouteParams = { productId: string };

export default function ProductDetailScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ params: RouteParams }, "params">>();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadProduct();
  }, [route.params?.productId]);

  const loadProduct = async () => {
    try {
      const products = await firebaseService.getProducts();
      const found = products.find((p) => p.id === route.params?.productId);
      setProduct(found || null);
    } catch (error) {
      console.error("Error loading product:", error);
      Alert.alert("Error", "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const getImageUrls = (product: Product | null): string[] => {
    if (!product) return [];

    const imageUrls = product.imageUrls as string | string[] | undefined;

    if (Array.isArray(imageUrls)) {
      return imageUrls.filter(url => url && url.trim() !== '');
    }

    if (typeof imageUrls === 'string' && imageUrls.trim() !== '') {
      return [imageUrls];
    }

    return [];
  };

  if (loading) {
    return (
      <ScreenScrollView contentContainerStyle={styles.center}>
        <ThemedText type="h4" style={{ color: theme.textSecondary }}>
          Loading product...
        </ThemedText>
      </ScreenScrollView>
    );
  }

  if (!product) {
    return (
      <ScreenScrollView contentContainerStyle={styles.center}>
        <Feather name="alert-circle" size={80} color={theme.textSecondary} />
        <ThemedText type="h3" style={{ marginTop: 20, color: theme.textSecondary }}>
          Product not found
        </ThemedText>
      </ScreenScrollView>
    );
  }

  const imageUrls = getImageUrls(product);
  const finalPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const totalPrice = finalPrice * quantity;

  const isNearExpiry = product.expiryDate
    ? new Date(product.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    : false;

  const isExpired = product.expiryDate
    ? new Date(product.expiryDate) < new Date()
    : false;

  const handleAddToCart = () => {
    if (!user) {
      Alert.alert("Login Required", "Please sign in to add items to cart");
      return;
    }

    if (isExpired) {
      Alert.alert("Expired Product", "This medicine has expired and cannot be purchased.");
      return;
    }

    if (product.isPrescriptionRequired) {
      Alert.alert(
        "Prescription Required",
        "This is a prescription medicine. You'll need to upload a prescription during checkout.",
        [{ text: "OK" }]
      );
    }

    addToCart(product, quantity);
    Alert.alert("Added to Cart!", `${quantity} × ${product.name} added to your cart`, [
      { text: "Continue Shopping", style: "cancel" },
      { text: "Go to Cart", onPress: () => navigation.navigate("Cart") },
    ]);
  };
  // Add this section after the Title section in ProductDetailScreen

{/* Business Name - NEW */}
{product.sellerBusinessName && (
  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
    <Feather name="briefcase" size={14} color={theme.primary} />
    <ThemedText
      type="body"
      style={{ marginLeft: 6, color: theme.primary, fontSize: 14, fontWeight: "600" }}
    >
      Sold by: {product.sellerBusinessName}
    </ThemedText>
  </View>
)}

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const width = event.nativeEvent.layoutMeasurement.width || 1;
    const index = Math.round(contentOffsetX / width);
    
    if (index >= 0 && index < imageUrls.length) {
      setCurrentImageIndex(index);
    }
  };

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Image Gallery */}
        <View style={styles.imageGalleryContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            style={styles.imageGallery}
          >
            {imageUrls.length > 0 ? (
              imageUrls.map((url, index) => (
                <Image
                  key={index}
                  source={{ uri: url }}
                  style={styles.image}
                  resizeMode="cover"
                  onError={(e) => {
                    console.log("Image load error:", url, e.nativeEvent.error);
                  }}
                />
              ))
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <Feather name="image" size={60} color="#ccc" />
                <ThemedText type="caption" style={{ marginTop: 12, color: "#999" }}>
                  No image available
                </ThemedText>
              </View>
            )}
          </ScrollView>

          {imageUrls.length > 1 && (
            <View style={styles.indicatorContainer}>
              {imageUrls.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === currentImageIndex ? theme.primary : theme.textSecondary + "50",
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {product.discount ? (
            <View style={[styles.discountBadge, { backgroundColor: theme.error }]}>
              <ThemedText style={styles.badgeText}>SAVE {product.discount}%</ThemedText>
            </View>
          ) : null}

          {product.stock === 0 && (
            <View style={styles.outOfStockOverlay}>
              <ThemedText style={styles.outOfStockText}>Out of Stock</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title */}
          <ThemedText type="h2" style={styles.title}>
            {product.name}
          </ThemedText>

          {/* Brand & Weight */}
          {(product.brand || product.weight) && (
            <ThemedText type="body" style={{ color: theme.primary, marginBottom: Spacing.sm }}>
              {product.brand} {product.weight ? `• ${product.weight}` : ""}
            </ThemedText>
          )}

          {/* Location Row */}
          {product.location?.city && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
              <Feather name="map-pin" size={14} color={theme.textSecondary} />
              <ThemedText
                type="body"
                style={{ marginLeft: 6, color: theme.textSecondary, fontSize: 13 }}
                numberOfLines={1}
              >
                {product.location.city}
                {product.location.area ? `, ${product.location.area}` : ""}
              </ThemedText>
            </View>
          )}

          {/* Price Row */}
          <View style={styles.priceRow}>
            <ThemedText type="h1" style={{ color: theme.primary }}>
              ₦{finalPrice.toFixed(0)}
            </ThemedText>
            {product.discount ? (
              <ThemedText type="h4" style={[styles.strikethrough, { color: theme.textSecondary }]}>
                ₦{product.price.toFixed(0)}
              </ThemedText>
            ) : null}
          </View>

          {/* Info Chips */}
          <View style={styles.chips}>
            {product.subcategory && (
              <View style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="caption">{product.subcategory}</ThemedText>
              </View>
            )}

            {product.stock > 0 ? (
              <View style={[styles.chip, { backgroundColor: theme.success + "20" }]}>
                <Feather name="check-circle" size={14} color={theme.success} />
                <ThemedText type="caption" style={{ marginLeft: 4, color: theme.success }}>
                  {product.stock} in stock
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.chip, { backgroundColor: theme.error + "20" }]}>
                <Feather name="x-circle" size={14} color={theme.error} />
                <ThemedText type="caption" style={{ marginLeft: 4, color: theme.error }}>
                  Out of stock
                </ThemedText>
              </View>
            )}

            {product.isPrescriptionRequired && (
              <View style={[styles.chip, { backgroundColor: "#007AFF20" }]}>
                <Feather name="file-text" size={14} color="#007AFF" />
                <ThemedText type="caption" style={{ marginLeft: 4, color: "#007AFF" }}>
                  Prescription Required
                </ThemedText>
              </View>
            )}

            {/* Location Chip */}
            {product.location?.city && (
              <View style={[styles.chip, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="map-pin" size={14} color={theme.primary} />
                <ThemedText type="caption" style={{ marginLeft: 4 }}>
                  {product.location.city}
                  {product.location.area ? `, ${product.location.area}` : ""}
                </ThemedText>
              </View>
            )}

            {isNearExpiry && !isExpired && (
              <View style={[styles.chip, { backgroundColor: "#FF950020" }]}>
                <Feather name="alert-triangle" size={14} color="#FF9500" />
                <ThemedText type="caption" style={{ marginLeft: 4, color: "#FF9500" }}>
                  Expiring Soon
                </ThemedText>
              </View>
            )}

            {isExpired && (
              <View style={[styles.chip, { backgroundColor: theme.error + "30" }]}>
                <Feather name="alert-octagon" size={14} color={theme.error} />
                <ThemedText type="caption" style={{ marginLeft: 4, color: theme.error }}>
                  Expired
                </ThemedText>
              </View>
            )}
          </View>

          {/* Expiry Date */}
          {product.expiryDate && (
            <View style={styles.infoRow}>
              <Feather name="calendar" size={18} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: 8, color: theme.textSecondary }}>
                Expires: {new Date(product.expiryDate).toDateString()}
              </ThemedText>
            </View>
          )}

          {/* Description */}
          <ThemedText type="h4" style={styles.sectionTitle}>Description</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            {product.description || "No description available."}
          </ThemedText>

          {/* Quantity Selector */}
          <View style={styles.quantitySection}>
            <ThemedText type="h4">Quantity</ThemedText>
            <View style={styles.quantityControls}>
              <Pressable onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
                <Feather name="minus" size={20} color={theme.text} />
              </Pressable>
              <ThemedText type="h3" style={styles.qtyText}>{quantity}</ThemedText>
              <Pressable
                onPress={() => setQuantity(Math.min(product.stock || 1, quantity + 1))}
                style={styles.qtyBtn}
                disabled={product.stock === 0}
              >
                <Feather name="plus" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          {/* Total Price */}
          <View style={styles.totalRow}>
            <ThemedText type="h4">Total:</ThemedText>
            <ThemedText type="h2" style={{ color: theme.primary }}>
              ₦{totalPrice.toFixed(0)}
            </ThemedText>
          </View>

          {/* Add to Cart Button */}
          <PrimaryButton
            title={
              product.stock === 0
                ? "Out of Stock"
                : isExpired
                ? "Expired – Cannot Buy"
                : `Add to Cart • ₦${totalPrice.toFixed(0)}`
            }
            onPress={handleAddToCart}
            disabled={product.stock === 0 || isExpired}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageGalleryContainer: { position: "relative" },
  imageGallery: { height: 340 },
  image: { width: 390, height: 340, backgroundColor: "#f0f0f0" },
  placeholderImage: { justifyContent: "center", alignItems: "center" },
  indicatorContainer: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  discountBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  badgeText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  outOfStockText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  content: { padding: Spacing.xl },
  title: { marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: Spacing.md },
  strikethrough: { textDecorationLine: "line-through" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: Spacing.md },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.sm },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  quantitySection: { marginVertical: Spacing.xl },
  quantityControls: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: { marginHorizontal: Spacing.xl, minWidth: 50, textAlign: "center" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: Spacing.lg,
  },
});
