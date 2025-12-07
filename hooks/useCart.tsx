// hooks/useCart.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product } from "../services/firebaseService";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "./useAuth";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrls: string[];
  sellerId: string;
  discount?: number;
  isPrescriptionRequired?: boolean;
  category?: "supermarket" | "pharmacy";
  stock?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotal: (discount: number) => number;
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // ✅ Load cart from Firebase when user logs in
  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // ✅ Real-time listener for cart updates across devices
    const cartRef = doc(db, "carts", user.uid);
    const unsubscribe = onSnapshot(
      cartRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const cartData = snapshot.data();
          setItems(cartData.items || []);
        } else {
          setItems([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error loading cart:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ✅ Save cart to Firebase whenever items change
  const saveCartToFirebase = async (updatedItems: CartItem[]) => {
    if (!user) return;

    try {
      const cartRef = doc(db, "carts", user.uid);
      await setDoc(cartRef, {
        userId: user.uid,
        items: updatedItems,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error saving cart:", error);
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);

      let updatedItems: CartItem[];

      if (existing) {
        updatedItems = current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          imageUrls: Array.isArray(product.imageUrls)
            ? product.imageUrls
            : [product.imageUrls],
          sellerId: product.sellerId,
          discount: product.discount,
          isPrescriptionRequired: product.isPrescriptionRequired || false,
          category: product.category,
          stock: product.stock,
        };
        updatedItems = [...current, newItem];
      }

      // ✅ Save to Firebase
      saveCartToFirebase(updatedItems);
      return updatedItems;
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((currentItems) => {
      const updatedItems = currentItems.filter((item) => item.id !== productId);
      // ✅ Save to Firebase
      saveCartToFirebase(updatedItems);
      return updatedItems;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems((currentItems) => {
      const updatedItems = currentItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      );
      // ✅ Save to Firebase
      saveCartToFirebase(updatedItems);
      return updatedItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    // ✅ Clear from Firebase
    if (user) {
      saveCartToFirebase([]);
    }
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => {
      const price = item.discount
        ? item.price * (1 - item.discount / 100)
        : item.price;
      return total + price * item.quantity;
    }, 0);
  };

  const getTotal = (discount: number = 0) => {
    return getSubtotal() - discount;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getSubtotal,
        getTotal,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}