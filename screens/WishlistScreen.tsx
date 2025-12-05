import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { ProductCard } from "../components/ProductCard";
import { Product, firebaseService } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing } from "../constants/theme";
import i18n from "../lib/i18n";
import {
  collection,
  onSnapshot,
  query,
  doc,
  writeBatch,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { SafeAreaView } from "react-native-safe-area-context"; // ← Add this

export default function WishlistScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const wishlistListener = React.useRef<Unsubscribe | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setWishlist([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const wishlistQuery = query(
        collection(db, "users", user.uid, "wishlist")
      );

      wishlistListener.current = onSnapshot(
        wishlistQuery,
        async (snapshot) => {
          const productIds = snapshot.docs.map((doc) => doc.id);

          if (productIds.length === 0) {
            setWishlist([]);
            setLoading(false);
            return;
          }

          try {
            const allProducts = await firebaseService.getProducts();
            const wishlistProducts = allProducts
              .filter((p) => productIds.includes(p.id))
              .sort((a, b) => b.createdAt - a.createdAt);

            setWishlist(wishlistProducts);
          } catch (err) {
            console.error("Failed to load wishlist:", err);
            Alert.alert("Error", "Could not load your wishlist.");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Wishlist sync error:", error);
          Alert.alert("Sync Failed", "Could not sync wishlist.");
          setLoading(false);
        }
      );

      return () => {
        wishlistListener.current?.();
        wishlistListener.current = null;
      };
    }, [user])
  );

  const handleProductPress = (product: Product) => {
    navigation.navigate("ProductDetailScreen", { productId: product.id });
  };

  const handleAddToCart = (product: Product) => {
    Alert.alert("Added!", `${product.name} added to cart`);
    // Connect to your cart later
  };

  // Empty States
  if (!user) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <Feather name="log-in" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={{ marginTop: Spacing.xl, color: theme.textSecondary }}>
          {i18n.t("sign_in_required")}
        </ThemedText>
        <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 40 }}>
          {i18n.t("sign_in_to_view_wishlist")}
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <ThemedText type="h4" style={{ color: theme.textSecondary }}>
          Loading your wishlist...
        </ThemedText>
      </SafeAreaView>
    );
  }

  if (wishlist.length === 0) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
        <Feather name="heart" size={80} color={theme.textSecondary + "60"} />
        <ThemedText type="h3" style={{ marginTop: Spacing.xl, color: theme.textSecondary }}>
          {i18n.t("your_wishlist_is_empty")}
        </ThemedText>
        <ThemedText style={{ marginTop: Spacing.sm, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 40 }}>
          {i18n.t("start_adding_products")}
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={wishlist}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        // This tells iOS to start content below the header automatically
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => handleProductPress(item)}
            viewMode="list"
            onAddToCart={() => handleAddToCart(item)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,     // Extra breathing room
    paddingBottom: Spacing.xxl, // Space at bottom
  },
});