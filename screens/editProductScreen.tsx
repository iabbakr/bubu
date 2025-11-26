// screens/EditProductScreen.tsx - FIXED
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
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Product } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { uploadImageToCloudinary } from "../lib/cloudinary";
import { Spacing, BorderRadius } from "../constants/theme";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";



type EditProductRouteProp = RouteProp<ProfileStackParamList, "EditProduct">;


export default function EditProductScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<EditProductRouteProp>();
  const product = route.params.product;

  const isPharmacy = product.category === "pharmacy";

  // ✅ FIXED: Normalize imageUrls to always be an array
  const getInitialImages = (product: Product): string[] => {
  if (Array.isArray(product.imageUrls)) {
    return (product.imageUrls as string[]).filter(
      (url) => url && url.trim() !== ''
    );
  }

  if (typeof product.imageUrls === 'string' && product.imageUrls.trim() !== '') {
    return [product.imageUrls];
  }

  return [];
};


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
  const [images, setImages] = useState<string[]>(getInitialImages(product)); // ✅ FIXED
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

const subcategories: Record<"pharmacy" | "supermarket", string[]> = {
  pharmacy: ["Tablet", "Syrup", "Capsule", "Ointment", "Drops", "Injection", "Cream", "Powder"],
  supermarket: ["Beverages", "Snacks", "Vegetables", "Fruits", "Dairy", "Frozen Foods", "Canned Goods", "Condiments"],
};

// Later, assert that product.category is a key
const categoryKey = product.category as keyof typeof subcategories;


  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert("Limit Reached", "Maximum 3 images allowed.");
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
    // Separate local URIs from already uploaded URLs
    const localUris = images.filter((img) => 
      img.startsWith("file://") || 
      img.startsWith("ph://") || 
      img.startsWith("content://")
    );
    
    const existingUrls = images.filter((img) => 
      img.startsWith("http://") || 
      img.startsWith("https://")
    );

    if (localUris.length === 0) {
      return existingUrls; // No new uploads needed
    }

    // Upload new images
    const uploadPromises = localUris.map((uri) =>
      uploadImageToCloudinary(uri, "products")
    );
    const uploadedUrls = await Promise.all(uploadPromises);

    // Combine existing URLs with newly uploaded ones
    return [...existingUrls, ...uploadedUrls];
  };

  const handleUpdate = async () => {
    const priceNum = parseFloat(price);
    const stockNum = parseInt(stock, 10);
    const discountNum = discount ? parseFloat(discount) : 0;

    if (
      !name.trim() || 
      !description.trim() || 
      isNaN(priceNum) || 
      priceNum <= 0 || 
      isNaN(stockNum) || 
      stockNum < 0 || 
      images.length === 0 || 
      !subcategory
    ) {
      Alert.alert("Missing Fields", "Please fill all required fields and upload at least 1 image.");
      return;
    }

    if (discountNum < 0 || discountNum > 90) {
      Alert.alert("Invalid Discount", "Discount must be 0–90%.");
      return;
    }

    setLoading(true);
    try {
      const imageUrls = await uploadImages();

      await firebaseService.updateProduct(product.id, {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        stock: stockNum,
        brand: brand.trim() || undefined,
        weight: weight.trim() || undefined,
        discount: discountNum > 0 ? discountNum : undefined,
        expiryDate: expiryDate.trim() || undefined,
        isPrescriptionRequired: isPharmacy ? requiresPrescription : undefined,
        subcategory,
        imageUrls,
      });

      Alert.alert("Success!", "Product updated successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      console.error("Update error:", err);
      Alert.alert("Error", err.message || "Failed to update product.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Product", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await firebaseService.deleteProduct(product.id);
            Alert.alert("Deleted", "Product removed successfully");
            navigation.goBack();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete");
          }
        },
      },
    ]);
  };

  const openPicker = () => setPickerVisible(true);
  const selectSubcategory = (cat: string) => {
    setSubcategory(cat);
    setPickerVisible(false);
  };

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={styles.title}>Edit Product</ThemedText>

        {/* Image Grid */}
        <ThemedText type="h4" style={styles.sectionTitle}>
          Product Images (1–3 required)
        </ThemedText>
        <View style={styles.imageGrid}>
          {[0, 1, 2].map((index) => (
            <Pressable 
              key={index} 
              onPress={pickImage} 
              style={[
                styles.imageSlot, 
                images[index] && { borderColor: theme.primary, borderStyle: 'solid' }
              ]}
            >
              {images[index] ? (
                <>
                  <Image 
                    source={{ uri: images[index] }} 
                    style={styles.imagePreview}
                    onError={(e) => {
                      console.log("Image preview error:", images[index], e.nativeEvent.error);
                    }}
                  />
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
                  <ThemedText type="caption" style={{ marginTop: 8 }}>
                    {index === 0 ? "Main Image *" : `Image ${index + 1}`}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          ))}
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 8 }}>
          {images.length}/3 images • {images.filter(img => img.startsWith('http')).length} already uploaded
        </ThemedText>

        {/* Form Fields */}
        <ThemedText type="h4" style={styles.sectionTitle}>Basic Info</ThemedText>
        <TextInput 
          placeholder="Product Name *" 
          value={name} 
          onChangeText={setName} 
          style={styles.input} 
          placeholderTextColor={theme.textSecondary}
        />
        <TextInput
          placeholder="Description *"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={3}
          placeholderTextColor={theme.textSecondary}
        />

        <View style={styles.row}>
          <TextInput
            placeholder="Price (₦) *"
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ""))}
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
        <TextInput 
          placeholder="Brand" 
          value={brand} 
          onChangeText={setBrand} 
          style={styles.input}
          placeholderTextColor={theme.textSecondary}
        />
        <TextInput 
          placeholder="Size / Weight" 
          value={weight} 
          onChangeText={setWeight} 
          style={styles.input}
          placeholderTextColor={theme.textSecondary}
        />
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
            <TextInput 
              placeholder="Expiry Date (YYYY-MM-DD)" 
              value={expiryDate} 
              onChangeText={setExpiryDate} 
              style={styles.input}
              placeholderTextColor={theme.textSecondary}
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

        <ThemedText type="h4" style={styles.sectionTitle}>Subcategory</ThemedText>
        <Pressable 
          style={[
            styles.subcategoryBtn, 
            { backgroundColor: subcategory ? theme.primary + "20" : theme.cardBackground }
          ]} 
          onPress={openPicker}
        >
          <ThemedText style={{ color: subcategory ? theme.primary : theme.textSecondary }}>
            {subcategory || "Select subcategory..."}
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
                {subcategories[categoryKey].map((cat) => (
    <Pressable key={cat} style={styles.modalItem} onPress={() => selectSubcategory(cat)}>
      <ThemedText style={{ paddingVertical: 12, fontSize: 16 }}>{cat}</ThemedText>
    </Pressable>
  ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <PrimaryButton
          title={loading ? "Updating..." : "Update Product"}
          onPress={handleUpdate}
          disabled={loading || images.length === 0}
          style={{ marginTop: 30 }}
        />

        <PrimaryButton
          title="Delete Product"
          onPress={handleDelete}
          variant="outlined"
          style={{ marginTop: 12, borderColor: "#FF3B30", backgroundColor: "transparent" }}
          textStyle={{ color: "#FF3B30" }}
        />
      </View>
    </ScreenScrollView>
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
    backgroundColor: "#fafafa",
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
    alignItems: "center" 
  },
  modalContent: { 
    width: "90%", 
    maxHeight: "70%", 
    borderRadius: BorderRadius.lg, 
    padding: Spacing.xl 
  },
  modalItem: { 
    paddingVertical: Spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: "#eee" 
  },
});