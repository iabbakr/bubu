// screens/EditProductScreen.tsx

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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { Button } from "../components/Button"; // ← Using new Button
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { firebaseService, Product } from "../services/firebaseService";
import { SellerStackParamList } from "../types/type";
import { uploadImageToCloudinary } from "../lib/cloudinary";

type EditProductRouteProp = RouteProp<SellerStackParamList, "EditProduct">;

export default function EditProductScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<EditProductRouteProp>();
  const product: Product = route.params.product;

  const isPharmacy = product.category === "pharmacy";

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [brand, setBrand] = useState(product.brand || "");
  const [weight, setWeight] = useState(product.weight || "");
  const [discount, setDiscount] = useState(product.discount?.toString() || "");
  const [expiryDate, setExpiryDate] = useState(product.expiryDate || "");
  const [requiresPrescription, setRequiresPrescription] = useState(
    product.isPrescriptionRequired || false
  );
  const [subcategory, setSubcategory] = useState(product.subcategory || "");
  const [image, setImage] = useState<string | null>(product.imageUrl);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

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

  const handleUpdate = async () => {
    const priceNum = Number(price);
    const stockNum = Number(stock);
    const discountNum = discount ? Number(discount) : 0;

    if (!name.trim() || !description.trim() || priceNum <= 0 || stockNum < 0 || !image || !subcategory) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }

    if (discountNum < 0 || discountNum > 90) {
      Alert.alert("Invalid Discount", "Discount must be between 0 and 90%.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = product.imageUrl;
      if (image && image !== product.imageUrl) {
        imageUrl = await uploadImageToCloudinary(image, "products");
      }

      await firebaseService.updateProduct(product.id, {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        stock: stockNum,
        brand: brand.trim() || undefined,
        weight: weight.trim() || undefined,
        discount: discountNum || undefined,
        expiryDate: expiryDate.trim() || undefined,
        isPrescriptionRequired: isPharmacy ? requiresPrescription : undefined,
        subcategory,
        imageUrl,
      });

      Alert.alert("Success", "Product updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("Update failed:", error);
      Alert.alert("Error", "Failed to update product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      "This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firebaseService.deleteProduct(product.id);
              Alert.alert("Deleted", "Product removed successfully");
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "Failed to delete product");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }}>
      <View style={styles.container}>
        <ThemedText type="h2" style={styles.title}>Edit Product</ThemedText>

        {/* Image Picker */}
        <Pressable onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <View style={styles.placeholder}>
              <Feather name="image" size={48} color={theme.textSecondary} />
              <ThemedText type="caption">Change Image</ThemedText>
            </View>
          )}
        </Pressable>

        <ThemedText type="h4" style={styles.section}>Basic Info</ThemedText>

        <TextInput placeholder="Product Name *" value={name} onChangeText={setName} style={styles.input} />
        <TextInput
          placeholder="Description *"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiline]}
          multiline
        />

        <View style={styles.row}>
          <TextInput
            placeholder="Price (₦) *"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            style={[styles.input, styles.half]}
          />
          <TextInput
            placeholder="Stock *"
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
            style={[styles.input, styles.half]}
          />
        </View>

        <ThemedText type="h4" style={styles.section}>Details</ThemedText>

        <TextInput placeholder="Brand (e.g. Panadol)" value={brand} onChangeText={setBrand} style={styles.input} />
        <TextInput placeholder="Size/Weight (e.g. 500g, 30 tablets)" value={weight} onChangeText={setWeight} style={styles.input} />
        <TextInput placeholder="Discount % (optional)" value={discount} onChangeText={setDiscount} keyboardType="numeric" style={styles.input} />

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
              <ThemedText style={styles.checkboxLabel}>Requires Prescription</ThemedText>
            </View>
          </>
        )}

        <ThemedText type="h4" style={styles.section}>Subcategory</ThemedText>
        <Pressable style={styles.subcategoryBtn} onPress={() => setPickerVisible(true)}>
          <ThemedText style={{ color: subcategory ? theme.primary : theme.textSecondary, fontWeight: "600" }}>
            {subcategory || "Select subcategory"}
          </ThemedText>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </Pressable>

        <Modal visible={pickerVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <ThemedText type="h3" style={{ marginBottom: 16, textAlign: "center" }}>
                Select Subcategory
              </ThemedText>
              <ScrollView>
                {subcategories[product.category].map((cat) => (
                  <Pressable
                    key={cat}
                    style={styles.modalItem}
                    onPress={() => {
                      setSubcategory(cat);
                      setPickerVisible(false);
                    }}
                  >
                    <ThemedText style={{ paddingVertical: 12 }}>{cat}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Buttons */}
        <Button
          onPress={handleUpdate}
          disabled={loading}
          style={{ marginTop: 30 }}
        >
          {loading ? "Updating..." : "Update Product"}
        </Button>

        <Button
          variant="danger"
          onPress={handleDelete}
          style={{ marginTop: 12 }}
        >
          Delete Product
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.xl },
  title: { marginBottom: Spacing.xl, textAlign: "center" },
  section: { marginTop: Spacing.xl, marginBottom: Spacing.md, fontWeight: "600" },
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
  half: { flex: 1 },
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
    backgroundColor: "#fafafa",
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