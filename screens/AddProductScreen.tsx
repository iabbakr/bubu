import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { Spacing, BorderRadius } from "../constants/theme";

export default function AddProductScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  // Business Profile Modal State
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [savingBusinessProfile, setSavingBusinessProfile] = useState(false);

  // Product Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [brand, setBrand] = useState("");
  const [weight, setWeight] = useState("");
  const [discount, setDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const isPharmacy = user?.sellerCategory === "pharmacy";

  const subcategories = {
    pharmacy: ["Tablet", "Syrup", "Capsule", "Ointment", "Drops", "Injection", "Cream", "Powder"],
    supermarket: ["Beverages", "Snacks", "Vegetables", "Fruits", "Dairy", "Frozen Foods", "Canned Goods", "Condiments"],
  };

  // Show business modal if profile incomplete
  useEffect(() => {
    if (user && user.role === "seller" && !user.hasCompletedBusinessProfile) {
      setShowBusinessModal(true);
    }
  }, [user]);

  const handleSaveBusinessProfile = async () => {
    if (!businessName.trim()) return Alert.alert("Required", "Please enter your business name");
    if (!businessAddress.trim()) return Alert.alert("Required", "Please enter your business address");
    if (!businessPhone.trim()) return Alert.alert("Required", "Please enter your business phone number");

    const cleanPhone = businessPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return Alert.alert("Invalid Phone", "Please enter a valid phone number (10–15 digits)");
    }

    setSavingBusinessProfile(true);
    try {
      await firebaseService.updateBusinessProfile(user!.uid, {
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        businessPhone: businessPhone.trim(),
      });

      Alert.alert("Success", "Business profile saved successfully!", [
        { text: "OK", onPress: () => setShowBusinessModal(false) },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save business profile");
    } finally {
      setSavingBusinessProfile(false);
    }
  };

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert("Limit Reached", "Maximum 3 images allowed");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!images.length) return [];
    const promises = images.map((uri) => uploadImageToCloudinary(uri, "products"));
    return Promise.all(promises);
  };

  const handleSubmit = async () => {
    if (!user?.sellerCategory || !user.location) {
      return Alert.alert("Error", "Please complete your profile first.");
    }

    if (!user.hasCompletedBusinessProfile) {
      Alert.alert("Required", "Please complete your business profile first.");
      setShowBusinessModal(true);
      return;
    }

    if (images.length === 0) return Alert.alert("Required", "Please upload at least 1 image");
    if (images.length > 3) return Alert.alert("Error", "Maximum 3 images allowed");

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    const discountNum = discount.trim() === "" ? 0 : parseFloat(discount);

    if (!trimmedName || !trimmedDesc || !price || isNaN(priceNum) || priceNum <= 0) {
      return Alert.alert("Invalid Input", "Please fill all required fields correctly");
    }
    if (!stock || isNaN(stockNum) || stockNum < 0) {
      return Alert.alert("Invalid Stock", "Please enter a valid stock amount");
    }
    if (discount && (isNaN(discountNum) || discountNum < 0 || discountNum > 90)) {
      return Alert.alert("Invalid Discount", "Discount must be between 0 and 90%");
    }
    if (!subcategory) return Alert.alert("Required", "Please select a subcategory");

    setLoading(true);
    try {
      const imageUrls = await uploadImages();

      await firebaseService.createProduct({
        name: trimmedName,
        description: trimmedDesc,
        price: priceNum,
        stock: stockNum,
        category: user.sellerCategory,
        subcategory,
        imageUrls,
        sellerId: user.uid,
        sellerBusinessName: user.businessName,
        location: user.location,
        brand: brand.trim() || undefined,
        weight: weight.trim() || undefined,
        discount: discountNum > 0 ? discountNum : undefined,
        expiryDate: expiryDate.trim() || undefined,
        isPrescriptionRequired: isPharmacy ? requiresPrescription : undefined,
        isFeatured: false,
        tags: [],
      });

      Alert.alert("Success!", "Product added successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const openPicker = () => setPickerVisible(true);
  const selectSubcategory = (cat: string) => {
    setSubcategory(cat);
    setPickerVisible(false);
  };

  return (
    <>
      <ScreenScrollView>
        <View style={styles.container}>
          <ThemedText type="h2" style={styles.title}>Add New Product</ThemedText>

          {/* Image Upload */}
          <ThemedText type="h4" style={styles.sectionTitle}>Product Images (1–3 required)</ThemedText>
          <View style={styles.imageGrid}>
            {[0, 1, 2].map((index) => (
              <Pressable
                key={index}
                onPress={pickImage}
                style={[
                  styles.imageSlot,
                  images[index] && styles.imageSlotFilled,
                ]}
              >
                {images[index] ? (
                  <>
                    <Image source={{ uri: images[index] }} style={styles.imagePreview} />
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      style={styles.removeBtn}
                    >
                      <Feather name="x" size={20} color="#fff" />
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.placeholder}>
                    <Feather name="image" size={32} color={theme.textSecondary} />
                    <ThemedText type="caption" style={{ marginTop: 8, color: theme.textSecondary }}>
                      {index === 0 ? "Main Image *" : `Image ${index + 1}`}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 8 }}>
            {images.length}/3 images
          </ThemedText>

          {/* Form Fields */}
          <ThemedText type="h4" style={styles.sectionTitle}>Basic Info</ThemedText>
          <TextInput placeholder="Product Name *" value={name} onChangeText={setName} style={styles.input} placeholderTextColor={theme.textSecondary} />
          <TextInput
            placeholder="Description *"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.multiline]}
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
          />

          <View style={styles.row}>
            <TextInput
              placeholder="Price (₦) *"
              value={price}
              onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
              placeholderTextColor={theme.textSecondary}
            />
            <TextInput
              placeholder="Stock *"
              value={stock}
              onChangeText={(t) => setStock(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <ThemedText type="h4" style={styles.sectionTitle}>Details</ThemedText>
          <TextInput placeholder="Brand" value={brand} onChangeText={setBrand} style={styles.input} placeholderTextColor={theme.textSecondary} />
          <TextInput placeholder="Size / Weight" value={weight} onChangeText={setWeight} style={styles.input} placeholderTextColor={theme.textSecondary} />
          <TextInput
            placeholder="Discount % (optional)"
            value={discount}
            onChangeText={(t) => setDiscount(t.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            style={styles.input}
            placeholderTextColor={theme.textSecondary}
          />

          {isPharmacy && (
            <>
              <TextInput placeholder="Expiry Date (YYYY-MM-DD)" value={expiryDate} onChangeText={setExpiryDate} style={styles.input} placeholderTextColor={theme.textSecondary} />
              <View style={styles.checkboxRow}>
                <Pressable
                  style={[styles.checkbox, requiresPrescription && styles.checkboxChecked]}
                  onPress={() => setRequiresPrescription(!requiresPrescription)}
                >
                  {requiresPrescription && <Feather name="check" size={18} color="#fff" />}
                </Pressable>
                <ThemedText style={styles.checkboxLabel}>Requires Prescription</ThemedText>
              </View>
            </>
          )}

          <ThemedText type="h4" style={styles.sectionTitle}>Category</ThemedText>
          <Pressable style={[styles.subcategoryBtn, { backgroundColor: subcategory ? theme.primary + "20" : theme.cardBackground }]} onPress={openPicker}>
            <ThemedText style={{ color: subcategory ? theme.primary : theme.textSecondary, fontWeight: "600" }}>
              {subcategory || "Select subcategory..."}
            </ThemedText>
            <Feather name="chevron-down" size={20} color={theme.textSecondary} />
          </Pressable>

          <Modal visible={pickerVisible} transparent animationType="fade">
            <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
              <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                <ThemedText type="h3" style={{ marginBottom: 16, textAlign: "center" }}>Select Subcategory</ThemedText>
                <ScrollView>
                  {subcategories[user?.sellerCategory || "supermarket"].map((cat) => (
                    <Pressable key={cat} style={styles.modalItem} onPress={() => selectSubcategory(cat)}>
                      <ThemedText style={{ fontSize: 16, paddingVertical: 12 }}>{cat}</ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>

          <PrimaryButton
            title={loading ? "Adding Product..." : "Add Product"}
            onPress={handleSubmit}
            disabled={loading || images.length === 0}
            style={{ marginTop: 30 }}
          />
        </View>
      </ScreenScrollView>

      {/* FIXED BUSINESS PROFILE MODAL */}
      <Modal visible={showBusinessModal} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={styles.businessModalOverlay}>
          <Pressable
            style={{ flex: 1, width: "100%" }}
            onPress={() => {
              Alert.alert(
                "Complete Profile Required",
                "You must complete your business profile to add products.",
                [{ text: "OK" }]
              );
            }}
          >
            <View style={[styles.businessModalContent, { backgroundColor: theme.background }]}>
              {/* Header with Close Button */}
              <View style={styles.businessModalHeader}>
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Go Back?",
                      "You won't be able to add products until you complete your business profile.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Go Back",
                          style: "destructive",
                          onPress: () => {
                            setShowBusinessModal(false);
                            navigation.goBack();
                          },
                        },
                      ]
                    );
                  }}
                  style={{ position: "absolute", left: 8, top: 8, zIndex: 10 }}
                >
                  <Feather name="x" size={28} color={theme.text} />
                </Pressable>

                <Feather name="briefcase" size={44} color={theme.primary} />
                <ThemedText type="h2" style={{ marginTop: Spacing.md, textAlign: "center" }}>
                  Complete Business Profile
                </ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm, paddingHorizontal: 20 }}>
                  This information helps buyers trust your store
                </ThemedText>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <ThemedText type="h4" style={styles.businessLabel}>Business Name *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary }]}
                  placeholder="e.g. Mama Gold Pharmacy, Shoprite Ikeja"
                  placeholderTextColor={theme.textSecondary}
                  value={businessName}
                  onChangeText={setBusinessName}
                  autoFocus
                />

                <ThemedText type="h4" style={styles.businessLabel}>Business Address *</ThemedText>
                <TextInput
                  style={[styles.input, styles.multiline, { backgroundColor: theme.backgroundSecondary }]}
                  placeholder="e.g. 123 Oba Akran Ave, beside GTBank, Ikeja, Lagos"
                  placeholderTextColor={theme.textSecondary}
                  value={businessAddress}
                  onChangeText={setBusinessAddress}
                  multiline
                  numberOfLines={4}
                />

              

                <ThemedText type="h4" style={styles.businessLabel}>Business Phone *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary }]}
                  placeholder="e.g. 08012345678"
                  placeholderTextColor={theme.textSecondary}
                  value={businessPhone}
                  onChangeText={setBusinessPhone}
                  keyboardType="phone-pad"
                />

                <PrimaryButton
                  title={savingBusinessProfile ? "Saving..." : "Save & Continue"}
                  onPress={handleSaveBusinessProfile}
                  disabled={savingBusinessProfile}
                  style={{ marginVertical: Spacing.xl }}
                />
              </ScrollView>
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl },
  title: { marginBottom: Spacing.xl, textAlign: "center" },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md, fontWeight: "600" },
  imageGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  imageSlot: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageSlotFilled: { borderStyle: "solid", borderColor: "#007AFF" },
  imagePreview: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: { alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  multiline: { height: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: Spacing.md },
  halfInput: { flex: 1 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  checkboxChecked: { backgroundColor: "#007AFF" },
  checkboxLabel: { fontSize: 16 },
  subcategoryBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "70%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    elevation: 10,
  },
  modalItem: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: "#eee" },
  businessModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  businessModalContent: {
    width: "100%",
    maxWidth: 500,
    height: "85%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    elevation: 20,
  },
  businessModalHeader: {
    alignItems: "center",
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
    marginBottom: Spacing.lg,
    position: "relative",
  },
  businessForm: {
    flex: 1,
  },
  businessLabel: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
});