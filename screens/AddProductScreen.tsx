import { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  Alert,
  Platform,
  Modal,
  Text,
  ScrollView,
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

export default function AddProductScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Subcategories mapping
  const subcategories = {
    pharmacy: ["Tablet", "Syrup", "Capsule", "Ointment", "Drops"],
    supermarket: ["Beverages", "Snacks", "Vegetables", "Fruits", "Dairy", "Frozen Foods"],
  };

  // PICK IMAGE
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // UPLOAD IMAGE TO CLOUDINARY
  const uploadImage = async () => {
    if (!image) return "";
    try {
      return await uploadImageToCloudinary(image, "products");
    } catch (err) {
      console.error(err);
      Alert.alert("Upload Error", "Failed to upload image");
      return "";
    }
  };

  // SUBMIT PRODUCT
  const handleSubmit = async () => {
    if (!user) return;

    const trimmedName = name.trim();
    const trimmedDesc = desc.trim();
    const priceNum = Number(price);
    const stockNum = Number(stock);

    if (!trimmedName || !trimmedDesc || !price || !stock || !image || !subcategory) {
      Alert.alert(
        "Missing Fields",
        "Please fill all fields, upload an image, and select a subcategory."
      );
      return;
    }

    if (priceNum <= 0 || stockNum < 0) {
      Alert.alert("Invalid Input", "Price must be > 0 and stock ≥ 0");
      return;
    }

    if (!user.location) {
      Alert.alert("Error", "Please update your profile with a location first");
      return;
    }

    if (!user.sellerCategory) {
      Alert.alert("Error", "Seller category is not set in your profile.");
      return;
    }

    setLoading(true);
    try {
      const imageUrl = await uploadImage();

      await firebaseService.createProduct({
        name: trimmedName,
        description: trimmedDesc,
        price: priceNum,
        stock: stockNum,
        category: user.sellerCategory,
        subcategory,
        imageUrl,
        sellerId: user.uid,
        location: user.location,
      });

      Alert.alert("Success", "Product added!");
      navigation.goBack();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  // PICKER MODAL HANDLER
  const openPicker = () => setPickerVisible(true);
  const selectSubcategory = (subcat: string) => {
    setSubcategory(subcat);
    setPickerVisible(false);
  };

  return (
    <ScreenScrollView>
      <View style={{ padding: 20 }}>
        <ThemedText type="h2" style={{ marginBottom: 20 }}>
          Add New Product
        </ThemedText>

        <Pressable onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <>
              <Feather name="image" size={36} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ marginTop: 8 }}>
                Upload product image
              </ThemedText>
            </>
          )}
        </Pressable>

        <TextInput
          placeholder="Product Name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={name}
          onChangeText={setName}
        />

        <TextInput
          placeholder="Description"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={desc}
          onChangeText={setDesc}
          multiline
        />

        <TextInput
          placeholder="Price (NGN)"
          keyboardType="numeric"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={price}
          onChangeText={setPrice}
        />

        <TextInput
          placeholder="Stock quantity"
          keyboardType="numeric"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={stock}
          onChangeText={setStock}
        />

        {/* SUBCATEGORY BUTTON */}
        {user?.sellerCategory && (
          <View style={{ marginBottom: 15 }}>
            <ThemedText type="h4" style={{ marginBottom: 8 }}>
              Subcategory
            </ThemedText>

            <Pressable
              style={[
                styles.subcategoryBtn,
                { borderColor: theme.border, backgroundColor: subcategory ? theme.primary : "transparent" },
              ]}
              onPress={openPicker}
            >
              <ThemedText style={{ color: subcategory ? "#fff" : theme.text }}>
                {subcategory || "Select subcategory..."}
              </ThemedText>
            </Pressable>

            <Modal visible={pickerVisible} transparent animationType="slide">
              <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
                <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                  <ScrollView>
                    {subcategories[user.sellerCategory].map((subcat) => (
                      <Pressable
                        key={subcat}
                        style={styles.modalItem}
                        onPress={() => selectSubcategory(subcat)}
                      >
                        <Text style={{ color: theme.text, fontSize: 16 }}>{subcat}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </Pressable>
            </Modal>
          </View>
        )}

        <PrimaryButton
          title={loading ? "Saving..." : "Add Product"}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
  },
  imagePicker: {
    borderWidth: 1,
    borderRadius: 10,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  subcategoryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    maxHeight: 300,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 15,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
});
