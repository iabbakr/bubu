import { View, StyleSheet, TextInput, Alert, Image, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { PrimaryButton } from "../components/PrimaryButton";
import { ThemedText } from "../components/ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { firebaseService } from "../services/firebaseService";
import { SellerStackParamList } from "../types/type";
import { uploadImageToCloudinary } from "../lib/cloudinary";

type EditProductRouteProp = RouteProp<SellerStackParamList, "EditProduct">;

export default function EditProductScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<EditProductRouteProp>();
  const product = route.params.product;

  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price.toString());
  const [stock, setStock] = useState(product.stock.toString());
  const [image, setImage] = useState<string | null>(product.imageUrl);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleUpdateProduct = async () => {
    if (!name || !price || !stock || !image) {
      Alert.alert("Error", "Please fill all fields and select an image");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = product.imageUrl;

      if (image !== product.imageUrl) {
        // Upload new image to Cloudinary
        imageUrl = await uploadImageToCloudinary(image, "products");
      }

      await firebaseService.updateProduct(product.id, {
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        imageUrl,
      });

      Alert.alert("Success", "Product updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await firebaseService.deleteProduct(product.id);
            Alert.alert("Deleted", "Product deleted successfully");
            navigation.goBack();
          } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to delete product");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.inner}>
        <ThemedText type="h2">Edit Product</ThemedText>

        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={name}
          onChangeText={setName}
          placeholder="Name"
        />

        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text, height: 80 }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
        />

        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={price}
          onChangeText={setPrice}
          placeholder="Price"
          keyboardType="numeric"
        />

        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          value={stock}
          onChangeText={setStock}
          placeholder="Stock"
          keyboardType="numeric"
        />

        <Pressable style={[styles.imagePicker, { borderColor: theme.border }]} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.imagePreview} />
          ) : (
            <ThemedText style={{ color: theme.textSecondary }}>Select Image</ThemedText>
          )}
        </Pressable>

        <PrimaryButton title="Update Product" onPress={handleUpdateProduct} loading={loading} />
        <PrimaryButton title="Delete Product" onPress={handleDeleteProduct} loading={loading} variant="secondary" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: Spacing.lg },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  imagePicker: { borderWidth: 1, borderRadius: BorderRadius.md, height: 150, justifyContent: "center", alignItems: "center", marginBottom: Spacing.md, overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
});
