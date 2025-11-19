import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserRole = "admin" | "seller" | "buyer";

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "supermarket" | "pharmacy";
  imageUrl: string;
  sellerId: string;
  stock: number;
  discount?: number;
  createdAt: number;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  products: OrderItem[];
  totalAmount: number;
  commission: number;
  status: "running" | "delivered" | "cancelled";
  deliveryAddress: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Wallet {
  userId: string;
  balance: number;
  pendingBalance: number;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  timestamp: number;
}

export interface Coupon {
  code: string;
  discount: number;
  type: "percentage" | "fixed";
  expiresAt: number;
  usedBy: string[];
}

const COMMISSION_RATE = 0.05;

export const firebaseService = {
  async signUp(email: string, password: string, role: UserRole, name: string): Promise<User> {
    const uid = Date.now().toString();
    const user: User = {
      uid,
      email,
      role,
      name,
      createdAt: Date.now(),
    };
    
    await AsyncStorage.setItem(`user_${uid}`, JSON.stringify(user));
    await AsyncStorage.setItem("currentUser", JSON.stringify(user));
    
    const wallet: Wallet = {
      userId: uid,
      balance: 0,
      pendingBalance: 0,
      transactions: [],
    };
    await AsyncStorage.setItem(`wallet_${uid}`, JSON.stringify(wallet));
    
    return user;
  },

  async signIn(email: string, password: string): Promise<User | null> {
    const users = await this.getAllUsers();
    const user = users.find(u => u.email === email);
    
    if (user) {
      await AsyncStorage.setItem("currentUser", JSON.stringify(user));
      return user;
    }
    
    return null;
  },

  async signOut(): Promise<void> {
    await AsyncStorage.removeItem("currentUser");
  },

  async getCurrentUser(): Promise<User | null> {
    const userStr = await AsyncStorage.getItem("currentUser");
    return userStr ? JSON.parse(userStr) : null;
  },

  async getAllUsers(): Promise<User[]> {
    const keys = await AsyncStorage.getAllKeys();
    const userKeys = keys.filter((key: string) => key.startsWith("user_"));
    const users = await AsyncStorage.multiGet(userKeys);
    return users.map(([_, value]: [string, string | null]) => value ? JSON.parse(value) : null).filter(Boolean);
  },

  async getWallet(userId: string): Promise<Wallet> {
    const walletStr = await AsyncStorage.getItem(`wallet_${userId}`);
    if (walletStr) {
      return JSON.parse(walletStr);
    }
    
    const wallet: Wallet = {
      userId,
      balance: 0,
      pendingBalance: 0,
      transactions: [],
    };
    await AsyncStorage.setItem(`wallet_${userId}`, JSON.stringify(wallet));
    return wallet;
  },

  async updateWallet(wallet: Wallet): Promise<void> {
    await AsyncStorage.setItem(`wallet_${wallet.userId}`, JSON.stringify(wallet));
  },

  async createOrder(
    buyerId: string,
    sellerId: string,
    products: OrderItem[],
    deliveryAddress: string,
    discount: number = 0
  ): Promise<Order> {
    const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = subtotal - discount;
    const commission = totalAmount * COMMISSION_RATE;

    const order: Order = {
      id: Date.now().toString(),
      buyerId,
      sellerId,
      products,
      totalAmount,
      commission,
      status: "running",
      deliveryAddress,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(`order_${order.id}`, JSON.stringify(order));

    const sellerWallet = await this.getWallet(sellerId);
    sellerWallet.pendingBalance += totalAmount - commission;
    await this.updateWallet(sellerWallet);

    const adminWallet = await this.getWallet("admin");
    adminWallet.balance += commission;
    adminWallet.transactions.push({
      id: Date.now().toString(),
      type: "credit",
      amount: commission,
      description: `Commission from order ${order.id}`,
      timestamp: Date.now(),
    });
    await this.updateWallet(adminWallet);

    return order;
  },

  async updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
    const orderStr = await AsyncStorage.getItem(`order_${orderId}`);
    if (!orderStr) return;

    const order: Order = JSON.parse(orderStr);
    order.status = status;
    order.updatedAt = Date.now();

    if (status === "delivered") {
      const sellerWallet = await this.getWallet(order.sellerId);
      const amount = order.totalAmount - order.commission;
      sellerWallet.balance += amount;
      sellerWallet.pendingBalance -= amount;
      sellerWallet.transactions.push({
        id: Date.now().toString(),
        type: "credit",
        amount,
        description: `Payment for order ${orderId}`,
        timestamp: Date.now(),
      });
      await this.updateWallet(sellerWallet);
    }

    await AsyncStorage.setItem(`order_${orderId}`, JSON.stringify(order));
  },

  async getOrders(userId: string, role: UserRole): Promise<Order[]> {
    const keys = await AsyncStorage.getAllKeys();
    const orderKeys = keys.filter((key: string) => key.startsWith("order_"));
    const orders = await AsyncStorage.multiGet(orderKeys);
    
    return orders
      .map(([_, value]: [string, string | null]) => value ? JSON.parse(value) as Order : null)
      .filter((order: Order | null): order is Order => {
        if (!order) return false;
        if (role === "admin") return true;
        if (role === "buyer") return order.buyerId === userId;
        if (role === "seller") return order.sellerId === userId;
        return false;
      })
      .sort((a: Order, b: Order) => b.createdAt - a.createdAt);
  },

  async getProducts(category?: "supermarket" | "pharmacy"): Promise<Product[]> {
    const keys = await AsyncStorage.getAllKeys();
    const productKeys = keys.filter((key: string) => key.startsWith("product_"));
    const products = await AsyncStorage.multiGet(productKeys);
    
    return products
      .map(([_, value]: [string, string | null]) => value ? JSON.parse(value) as Product : null)
      .filter((product: Product | null): product is Product => product !== null && (!category || product.category === category))
      .sort((a: Product, b: Product) => b.createdAt - a.createdAt);
  },

  async createProduct(product: Omit<Product, "id" | "createdAt">): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    
    await AsyncStorage.setItem(`product_${newProduct.id}`, JSON.stringify(newProduct));
    return newProduct;
  },

  async validateCoupon(code: string, userId: string): Promise<Coupon | null> {
    const couponStr = await AsyncStorage.getItem(`coupon_${code}`);
    if (!couponStr) return null;
    
    const coupon: Coupon = JSON.parse(couponStr);
    
    if (coupon.expiresAt < Date.now()) return null;
    if (coupon.usedBy.includes(userId)) return null;
    
    return coupon;
  },

  async applyCoupon(code: string, userId: string): Promise<void> {
    const couponStr = await AsyncStorage.getItem(`coupon_${code}`);
    if (!couponStr) return;
    
    const coupon: Coupon = JSON.parse(couponStr);
    coupon.usedBy.push(userId);
    await AsyncStorage.setItem(`coupon_${code}`, JSON.stringify(coupon));
  },
};
