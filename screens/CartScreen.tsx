import { View, StyleSheet, Pressable, Image, Alert, Modal, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextInputField } from "../components/TextInputField";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { firebaseService } from "../services/firebaseService";
import { Spacing, BorderRadius } from "../constants/theme";
import { pickDocument, uploadPrescription } from "../services/storageService";


export default function CartScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { items, removeFromCart, updateQuantity, clearCart, getSubtotal, getTotal, loading: cartLoading } = useCart();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Prescription uploads: productId -> { uri, fileName, uploading }
  const [prescriptions, setPrescriptions] = useState<Record<string, { uri: string; fileName: string; uploading: boolean }>>({});
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  if (cartLoading) {
    return (
      <View style={[styles.empty, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
          Loading your cart...
        </ThemedText>
      </View>
    );
  }

  const handleApplyCoupon = async () => {
    if (!couponCode || !user) return;

    const coupon = await firebaseService.validateCoupon(couponCode, user.uid);
    if (coupon) {
      const discountAmount = coupon.type === "percentage"
        ? getSubtotal() * (coupon.discount / 100)
        : coupon.discount;
      setDiscount(discountAmount);
      Alert.alert("Success", `Coupon applied! You saved ₦${discountAmount.toFixed(2)}`);
    } else {
      Alert.alert("Error", "Invalid or expired coupon code");
    }
  };

  const handleUploadPrescription = (productId: string) => {
    setSelectedProductId(productId);
    setShowPrescriptionModal(true);
  };

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Camera permission is needed to take prescription photos");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && selectedProductId) {
      await uploadPrescriptionFile(result.assets[0].uri, `prescription_${Date.now()}.jpg`, selectedProductId);
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Gallery permission is needed to select prescription images");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && selectedProductId) {
      await uploadPrescriptionFile(result.assets[0].uri, `prescription_${Date.now()}.jpg`, selectedProductId);
    }
  };

  const uploadPrescriptionFile = async (uri: string, fileName: string, productId: string) => {
    try {
      setPrescriptions(prev => ({
        ...prev,
        [productId]: { uri, fileName, uploading: true }
      }));

      const downloadUrl = await uploadPrescription(uri, fileName, user!.uid, productId);

      setPrescriptions(prev => ({
        ...prev,
        [productId]: { uri: downloadUrl, fileName, uploading: false }
      }));

      setShowPrescriptionModal(false);
      setSelectedProductId(null);
      Alert.alert("Success", "Prescription uploaded successfully!");
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message || "Failed to upload prescription");
      setPrescriptions(prev => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
    }
  };

  const removePrescription = (productId: string) => {
    Alert.alert(
      "Remove Prescription",
      "Are you sure you want to remove this prescription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setPrescriptions(prev => {
              const updated = { ...prev };
              delete updated[productId];
              return updated;
            });
          }
        }
      ]
    );
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

    // Check if all prescription-required items have prescriptions uploaded
    const prescriptionRequired = items.filter(item => item.isPrescriptionRequired);
    const missingPrescriptions = prescriptionRequired.filter(
      item => !prescriptions[item.id] || prescriptions[item.id].uploading
    );

    if (missingPrescriptions.length > 0) {
      Alert.alert(
        "Prescription Required",
        `Please upload prescriptions for: ${missingPrescriptions.map(p => p.name).join(", ")}`,
        [{ text: "OK" }]
      );
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
          prescriptionUrl: prescriptions[item.id]?.uri || null,
          prescriptionFileName: prescriptions[item.id]?.fileName || null,
        }));

        // Create order for this seller with prescription URLs
        const order = await firebaseService.createOrder(
          user.uid,
          sellerId,
          orderItems,
          deliveryAddress,
          0,
          phoneNumber
        );

        createdOrderIds.push(order.id);
      }

      // Handle coupon
      if (couponCode && discount > 0) {
        await firebaseService.applyCoupon(couponCode, user.uid);
      }

      clearCart();
      setPrescriptions({});
      
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

    const hasPrescription = prescriptions[item.id];
    const needsPrescription = item.isPrescriptionRequired;

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
          
          {needsPrescription && (
            <View style={[styles.prescriptionBadge, { 
              backgroundColor: hasPrescription ? theme.success + "20" : theme.warning + "20" 
            }]}>
              <Feather 
                name={hasPrescription ? "check-circle" : "alert-circle"} 
                size={12} 
                color={hasPrescription ? theme.success : theme.warning} 
              />
              <ThemedText type="caption" style={{ 
                marginLeft: 4, 
                color: hasPrescription ? theme.success : theme.warning,
                fontSize: 11
              }}>
                Prescription {hasPrescription ? "Uploaded" : "Required"}
              </ThemedText>
            </View>
          )}

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

          {needsPrescription && (
            <View style={styles.prescriptionActions}>
              {hasPrescription ? (
                <>
                  <Pressable
                    style={[styles.prescriptionBtn, { borderColor: theme.success }]}
                    onPress={() => Alert.alert("Prescription", `File: ${hasPrescription.fileName}`)}
                  >
                    <Feather name="file-text" size={14} color={theme.success} />
                    <ThemedText type="caption" style={{ marginLeft: 4, color: theme.success }}>
                      View
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.prescriptionBtn, { borderColor: theme.error }]}
                    onPress={() => removePrescription(item.id)}
                  >
                    <Feather name="trash-2" size={14} color={theme.error} />
                    <ThemedText type="caption" style={{ marginLeft: 4, color: theme.error }}>
                      Remove
                    </ThemedText>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.uploadPrescriptionBtn, { backgroundColor: theme.warning }]}
                  onPress={() => handleUploadPrescription(item.id)}
                >
                  <Feather name="upload" size={14} color="#fff" />
                  <ThemedText type="caption" style={{ marginLeft: 4, color: "#fff", fontWeight: "600" }}>
                    Upload Prescription
                  </ThemedText>
                </Pressable>
              )}
            </View>
          )}
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

  const prescriptionRequiredCount = items.filter(item => item.isPrescriptionRequired).length;
  const prescriptionUploadedCount = items.filter(item => 
    item.isPrescriptionRequired && prescriptions[item.id]
  ).length;

  return (
    <>
      <ScreenScrollView>
        <View style={styles.container}>
          <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>
            Shopping Cart
          </ThemedText>

          {prescriptionRequiredCount > 0 && (
            <View style={[
              styles.prescriptionNotice,
              { 
                backgroundColor: prescriptionUploadedCount === prescriptionRequiredCount 
                  ? theme.success + "15" 
                  : theme.warning + "15",
                borderColor: prescriptionUploadedCount === prescriptionRequiredCount 
                  ? theme.success 
                  : theme.warning
              }
            ]}>
              <Feather 
                name={prescriptionUploadedCount === prescriptionRequiredCount ? "check-circle" : "alert-circle"} 
                size={18} 
                color={prescriptionUploadedCount === prescriptionRequiredCount ? theme.success : theme.warning} 
              />
              <ThemedText type="caption" style={{ 
                marginLeft: Spacing.sm, 
                flex: 1,
                color: prescriptionUploadedCount === prescriptionRequiredCount ? theme.success : theme.warning
              }}>
                {prescriptionUploadedCount === prescriptionRequiredCount
                  ? "All prescriptions uploaded! You can proceed to checkout."
                  : `${prescriptionUploadedCount}/${prescriptionRequiredCount} prescriptions uploaded. Upload all to continue.`
                }
              </ThemedText>
            </View>
          )}

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

      {/* Prescription Upload Modal - SIMPLIFIED (Camera & Gallery Only) */}
     // Update the prescription modal JSX (replace the existing modal):
<Modal
  visible={showPrescriptionModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowPrescriptionModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
      <View style={styles.modalHeader}>
        <ThemedText type="h3">Upload Prescription</ThemedText>
        <Pressable onPress={() => setShowPrescriptionModal(false)}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
      </View>

      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
        Choose how you'd like to upload your prescription:
      </ThemedText>

      <Pressable
        style={[styles.uploadOption, { backgroundColor: theme.backgroundSecondary }]}
        onPress={pickImageFromCamera}
      >
        <Feather name="camera" size={24} color={theme.primary} />
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <ThemedText type="h4">Take Photo</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Use your camera to capture prescription
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        style={[styles.uploadOption, { backgroundColor: theme.backgroundSecondary }]}
        onPress={pickImageFromGallery}
      >
        <Feather name="image" size={24} color={theme.primary} />
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <ThemedText type="h4">Choose from Gallery</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Select an existing image from your device
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        style={[styles.uploadOption, { backgroundColor: theme.backgroundSecondary }]}
        onPress={pickDocument}
      >
        <Feather name="file-text" size={24} color={theme.primary} />
        <View style={{ marginLeft: Spacing.md, flex: 1 }}>
          <ThemedText type="h4">Upload Document</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Select a PDF or image file from your files
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
    </View>
  </View>
</Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing["5xl"] },
  prescriptionNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  cartItem: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  itemImage: { width: 80, height: 80, borderRadius: BorderRadius.sm, marginRight: Spacing.md },
  itemDetails: { flex: 1 },
  prescriptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  quantityControls: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md },
  quantityButton: { width: 32, height: 32, borderRadius: BorderRadius.xs, justifyContent: "center", alignItems: "center" },
  quantity: { marginHorizontal: Spacing.lg, minWidth: 30, textAlign: "center" },
  prescriptionActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  prescriptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  uploadPrescriptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  removeButton: { padding: Spacing.sm },
  couponSection: { marginBottom: Spacing.lg },
  summary: { padding: Spacing.lg, borderRadius: BorderRadius.md, marginBottom: Spacing.xl },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
  totalRow: { borderTopWidth: 1, borderTopColor: "#00000020", paddingTop: Spacing.md, marginTop: Spacing.xs },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.xl },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  uploadOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
});