// screens/AddProductScreen.tsx

import { useState } from "react";
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
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [brand, setBrand] = useState("");
  const [weight, setWeight] = useState("");
  const [discount, setDiscount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const isPharmacy = user?.sellerCategory === "pharmacy";
  const isSupermarket = user?.sellerCategory === "supermarket";

  // Subcategories
  const subcategories = {
    pharmacy: ["Tablet", "Syrup", "Capsule", "Ointment", "Drops", "Injection", "Cream", "Powder"],
    supermarket: ["Beverages", "Snacks", "Vegetables", "Fruits", "Dairy", "Frozen Foods", "Canned Goods", "Condiments"],
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const uploadImage = async (): Promise<string> => {
    if (!image) return "";
    try {
      return await uploadImageToCloudinary(image, "products");
    } catch (err) {
      Alert.alert("Upload Failed", "Could not upload image. Try again.");
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!user?.sellerCategory || !user.location) {
      Alert.alert("Error", "Please complete your profile with location and seller type first.");
      return;
    }

    const trimmedName = name.trim();
    const priceNum = Number(price);
    const stockNum = Number(stock);
    const discountNum = discount ? Number(discount) : 0;

    if (!trimmedName || !description.trim() || !price || !stock || !image || !subcategory) {
      Alert.alert("Missing Fields", "Please fill all required fields and upload an image.");
      return;
    }

    if (priceNum <= 0 || stockNum < 0 || discountNum < 0 || discountNum > 90) {
      Alert.alert("Invalid Input", "Check price, stock, and discount values.");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadImage();

      await firebaseService.createProduct({
        name: trimmedName,
        description: description.trim(),
        price: priceNum,
        stock: stockNum,
        category: user.sellerCategory,
        subcategory,
        imageUrl,
        sellerId: user.uid,
        location: user.location,

        // Rich fields
        brand: brand.trim() || undefined,
        weight: weight.trim() || undefined,
        discount: discountNum || undefined,
        expiryDate: expiryDate.trim() || undefined,
        isPrescriptionRequired: isPharmacy ? requiresPrescription : undefined,
        isFeatured: false,
        tags: [],
      });

      Alert.alert("Success!", "Product added successfully", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to add product. Please try again.");
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
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={styles.title}>
          Add New Product
        </ThemedText>

        {/* Image Picker */}
        <Pressable onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <View style={styles.placeholder}>
              <Feather name="image" size={48} color={theme.textSecondary} />
              <ThemedText type="caption" style={styles.placeholderText}>
                Tap to upload product image
              </ThemedText>
            </View>
          )}
        </Pressable>

        {/* Common Fields */}
        <ThemedText type="h4" style={styles.sectionTitle}>Basic Info</ThemedText>

        <TextInput
          placeholder="Product Name *"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          placeholder="Description *"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={3}
        />

        <View style={styles.row}>
          <TextInput
            placeholder="Price (₦) *"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            style={[styles.input, styles.halfInput]}
          />
          <TextInput
            placeholder="Stock *"
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
            style={[styles.input, styles.halfInput]}
          />
        </View>

        {/* Brand & Weight */}
        <ThemedText type="h4" style={styles.sectionTitle}>Details</ThemedText>

        <TextInput
          placeholder="Brand (e.g., Panadol, Coca-Cola)"
          value={brand}
          onChangeText={setBrand}
          style={styles.input}
        />

        <TextInput
          placeholder="Size / Weight (e.g., 500g, 1L, 30 tablets)"
          value={weight}
          onChangeText={setWeight}
          style={styles.input}
        />

        <TextInput
          placeholder="Discount % (optional)"
          value={discount}
          onChangeText={setDiscount}
          keyboardType="numeric"
          style={styles.input}
        />

        {/* Pharmacy Only Fields */}
        {isPharmacy && (
          <>
            <TextInput
              placeholder="Expiry Date (YYYY-MM-DD)"
              value={expiryDate}
              onChangeText={setExpiryDate}
              style={styles.input}
            />

            <View style={styles.checkboxRow}>
              <Pressable
                style={[styles.checkbox, requiresPrescription && styles.checkboxChecked]}
                onPress={() => setRequiresPrescription(!requiresPrescription)}
              >
                {requiresPrescription && <Feather name="check" size={18} color="#fff" />}
              </Pressable>
              <ThemedText style={styles.checkboxLabel}>
                Requires Prescription
              </ThemedText>
            </View>
          </>
        )}

        {/* Subcategory */}
        <ThemedText type="h4" style={styles.sectionTitle}>Category</ThemedText>

        <Pressable
          style={[styles.subcategoryBtn, { backgroundColor: subcategory ? theme.primary + "20" : theme.cardBackground }]}
          onPress={openPicker}
        >
          <ThemedText style={{ color: subcategory ? theme.primary : theme.textSecondary, fontWeight: "600" }}>
            {subcategory || "Select subcategory..."}
          </ThemedText>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </Pressable>

        {/* Subcategory Picker Modal */}
        <Modal visible={pickerVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText type="h3" style={{ marginBottom: 16, textAlign: "center" }}>
                Select Subcategory
              </ThemedText>
              <ScrollView showsVerticalScrollIndicator={false}>
                {subcategories[user?.sellerCategory || "supermarket"].map((cat) => (
                  <Pressable
                    key={cat}
                    style={styles.modalItem}
                    onPress={() => selectSubcategory(cat)}
                  >
                    <ThemedText style={{ fontSize: 16, paddingVertical: 8 }}>{cat}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <PrimaryButton
          title={loading ? "Adding Product..." : "Add Product"}
          onPress={handleSubmit}
          disabled={loading}
          style={{ marginTop: 30 }}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl },
  title: { marginBottom: Spacing.xl, textAlign: "center" },
  sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md, fontWeight: "600" },
  imagePicker: {
    height: 200,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%", borderRadius: BorderRadius.lg },
  placeholder: { alignItems: "center" },
  placeholderText: { marginTop: Spacing.sm, color: "#888" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: "#fafafa",
  },
  multiline: { height: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: Spacing.md },
  halfInput: { flex: 1 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
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
  modalItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});