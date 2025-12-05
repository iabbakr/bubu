// hooks/useCart.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "@/services/firebaseService";

// ✅ Updated CartItem interface with prescription flag
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrls: string[];
  sellerId: string;
  discount?: number;
  isPrescriptionRequired?: boolean;  // NEW: Flag for prescription requirement
  // Keep other Product fields that might be needed
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // ✅ Updated addToCart to include prescription info
  const addToCart = (product: Product, quantity: number = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

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
        isPrescriptionRequired: product.isPrescriptionRequired || false,  // NEW
        category: product.category,
        stock: product.stock,
      };

      return [...current, newItem];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
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