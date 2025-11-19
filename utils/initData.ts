import AsyncStorage from "@react-native-async-storage/async-storage";
import { firebaseService } from "./firebase";

export async function initializeSampleData() {
  const hasInitialized = await AsyncStorage.getItem("sample_data_initialized");
  
  if (hasInitialized) {
    return;
  }

  const demoSeller = await firebaseService.signUp(
    "seller@demo.com",
    "password123",
    "seller",
    "Demo Seller"
  );

  const sampleProducts = [
    {
      name: "Fresh Organic Apples",
      description: "Crisp and juicy organic apples, perfect for snacking",
      price: 4.99,
      category: "supermarket" as const,
      imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
      sellerId: demoSeller.uid,
      stock: 50,
      discount: 10,
    },
    {
      name: "Whole Wheat Bread",
      description: "Freshly baked whole wheat bread",
      price: 3.49,
      category: "supermarket" as const,
      imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
      sellerId: demoSeller.uid,
      stock: 30,
    },
    {
      name: "Fresh Milk 1L",
      description: "Farm-fresh whole milk",
      price: 2.99,
      category: "supermarket" as const,
      imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
      sellerId: demoSeller.uid,
      stock: 40,
    },
    {
      name: "Organic Eggs (12 pack)",
      description: "Free-range organic eggs",
      price: 5.99,
      category: "supermarket" as const,
      imageUrl: "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=400",
      sellerId: demoSeller.uid,
      stock: 25,
      discount: 5,
    },
    {
      name: "Vitamin C Tablets",
      description: "1000mg Vitamin C supplement",
      price: 12.99,
      category: "pharmacy" as const,
      imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400",
      sellerId: demoSeller.uid,
      stock: 100,
    },
    {
      name: "Pain Relief Tablets",
      description: "Fast-acting pain relief medication",
      price: 8.99,
      category: "pharmacy" as const,
      imageUrl: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400",
      sellerId: demoSeller.uid,
      stock: 75,
      discount: 15,
    },
    {
      name: "Hand Sanitizer",
      description: "Antibacterial hand sanitizer 500ml",
      price: 4.49,
      category: "pharmacy" as const,
      imageUrl: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400",
      sellerId: demoSeller.uid,
      stock: 120,
    },
    {
      name: "Digital Thermometer",
      description: "Accurate digital thermometer",
      price: 15.99,
      category: "pharmacy" as const,
      imageUrl: "https://images.unsplash.com/photo-1584467735867-4f118c093a50?w=400",
      sellerId: demoSeller.uid,
      stock: 45,
    },
  ];

  for (const product of sampleProducts) {
    await firebaseService.createProduct(product);
  }

  await AsyncStorage.setItem("sample_data_initialized", "true");
}
