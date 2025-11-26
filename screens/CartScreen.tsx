import { View, StyleSheet, Pressable, Image, Alert } from "react-native";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextInputField } from "../components/TextInputField";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { firebaseService } from "../services/firebaseService";
import { Spacing, BorderRadius } from "../constants/theme";

export default function CartScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { items, removeFromCart, updateQuantity, clearCart, getSubtotal, getTotal } = useCart();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  

  const handleApplyCoupon = async () => {
    if (!couponCode || !user) return;

    const coupon = await firebaseService.validateCoupon(couponCode, user.uid);
    if (coupon) {
      const discountAmount = coupon.type === "percentage"
        ? getSubtotal() * (coupon.discount / 100)
        : coupon.discount;
      setDiscount(discountAmount);
      Alert.alert("Success", `Coupon applied! You saved $${discountAmount.toFixed(2)}`);
    } else {
      Alert.alert("Error", "Invalid or expired coupon code");
    }
  };

  const handleCheckout = async () => {
  if (!user) {
    Alert.alert("Error", "Please sign in to checkout");
    return;
  }

  if (items.length === 0) {
    Alert.alert("Error", "Your cart is empty");
    return;
  }

  if (!deliveryAddress.trim()) {
    Alert.alert("Error", "Please enter a delivery address");
    return;
  }

  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phoneRegex.test(phoneNumber.trim())) {
    Alert.alert("Error", "Please enter a valid phone number");
    return;
  }

  setLoading(true);
  try {
    // Group cart items by sellerId
    const itemsBySeller = items.reduce((acc, item) => {
      const sellerId = item.sellerId;
      if (!acc[sellerId]) {
        acc[sellerId] = [];
      }
      acc[sellerId].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    const createdOrderIds: string[] = [];

    // Create one order per seller
    for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
      const orderItems = sellerItems.map(item => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.discount
          ? item.price * (1 - item.discount / 100)
          : item.price,
      }));

      // Create order for this seller
      const order = await firebaseService.createOrder(
        user.uid,
        sellerId,
        orderItems,
        deliveryAddress,
        0, // We'll handle global coupon separately or per-order
        phoneNumber
      );

      createdOrderIds.push(order.id);
    }

    // Handle coupon (optional strategies below)
    if (couponCode && discount > 0) {
      await firebaseService.applyCoupon(couponCode, user.uid);
      // You may want to distribute discount across orders or apply only once
    }

    clearCart();
    
    Alert.alert(
      "Success!",
      `You have successfully placed ${Object.keys(itemsBySeller).length} order(s)!`,
      [
        {
          text: "View Orders",
          onPress: () => navigation.navigate("OrdersTab" as never),
        },
      ]
    );
  } catch (error: any) {
    console.error("Checkout failed:", error);
    Alert.alert("Checkout Failed", error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};
  const renderCartItem = (item: typeof items[0]) => {
    const itemPrice = item.discount 
      ? item.price * (1 - item.discount / 100)
      : item.price;

    return (
      <View
        key={item.id}
        style={[styles.cartItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      >
        <Image 
          source={{ uri: item.imageUrls[0] || "https://via.placeholder.com/80" }} 
          style={styles.itemImage} 
        />
        <View style={styles.itemDetails}>
          <ThemedText type="h4" numberOfLines={2}>
            {item.name}
          </ThemedText>
          <ThemedText type="h4" style={{ color: theme.primary, marginTop: Spacing.xs }}>
            ₦{itemPrice.toFixed(2)}
          </ThemedText>
          <View style={styles.quantityControls}>
            <Pressable
              style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText style={styles.quantity}>{item.quantity}</ThemedText>
            <Pressable
              style={[styles.quantityButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>
        <Pressable
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Feather name="trash-2" size={20} color={theme.error} />
        </Pressable>
      </View>
    );
  };

  if (items.length === 0) {
    return (
      <ScreenScrollView>
        <View style={styles.empty}>
          <Feather name="shopping-cart" size={64} color={theme.textSecondary} />
          <ThemedText type="h2" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
            Your cart is empty
          </ThemedText>
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, color: theme.textSecondary }}>
            Add items to get started
          </ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>
          Shopping Cart
        </ThemedText>

        {items.map(renderCartItem)}

        <View style={styles.couponSection}>
          <TextInputField
            label="Coupon Code"
            value={couponCode}
            onChangeText={setCouponCode}
            placeholder="Enter coupon code"
          />
          <PrimaryButton
            title="Apply"
            onPress={handleApplyCoupon}
            variant="outlined"
          />
        </View>

        <TextInputField
  label="Phone Number"
  value={phoneNumber}
  onChangeText={setPhoneNumber}
  placeholder="Enter your phone number"
  keyboardType="phone-pad"
/>

        <TextInputField
          label="Delivery Address"
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          placeholder="Enter your delivery address"
          multiline
        />

        <View style={[styles.summary, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.summaryRow}>
            <ThemedText>Subtotal</ThemedText>
            <ThemedText>₦{getSubtotal().toFixed(2)}</ThemedText>
          </View>
          {discount > 0 ? (
            <View style={styles.summaryRow}>
              <ThemedText style={{ color: theme.success }}>Discount</ThemedText>
              <ThemedText style={{ color: theme.success }}>-₦{discount.toFixed(2)}</ThemedText>
            </View>
          ) : null}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <ThemedText type="h3">Total</ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>
              ₦{getTotal(discount).toFixed(2)}
            </ThemedText>
          </View>
        </View>

        <PrimaryButton
          title="Proceed to Checkout"
          onPress={handleCheckout}
          loading={loading}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  cartItem: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: {
    marginHorizontal: Spacing.lg,
    minWidth: 30,
    textAlign: "center",
  },
  removeButton: {
    padding: Spacing.sm,
  },
  couponSection: {
    marginBottom: Spacing.lg,
  },
  summary: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#00000020",
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
});
