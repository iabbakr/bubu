import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { emailService } from "../lib/resend";

import { onSnapshot } from "firebase/firestore";




export type UserRole = "admin" | "seller" | "buyer";

export interface Location {
  state: string;
  city: string;
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  referralCode?: string;
  location?: Location;
  sellerCategory?: "supermarket" | "pharmacy";
  createdAt: number;
}



export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "supermarket" | "pharmacy";
  subcategory?: string;
  imageUrl: string;
  sellerId: string;
  stock: number;
  discount?: number;
  location: Location;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
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
  buyerConfirmed?: boolean;
  sellerCancelled?: boolean;
  cancelReason?: string;
  disputeStatus?: "none" | "open" | "resolved";
  disputeDetails?: string;
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
  resolvedByAdmin?: boolean;        // new
  adminResolution?: "delivered" | "cancelled"; // new
}

export interface DisputeMessage {
  id: string;
  senderId: string;     // user or admin
  senderRole: "buyer" | "seller" | "admin";
  message: string;
  timestamp: number;
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

const COMMISSION_RATE = 0.10; // 10% commission

export const firebaseService = {
  // -----------------------------
  // AUTH
  // -----------------------------
  async signUp(
    email: string,
    password: string,
    role: UserRole,
    name: string,
    phone?: string,
    gender?: "male" | "female" | "other",
    referralCode?: string,
    location?: Location,
    sellerCategory?: "supermarket" | "pharmacy" 
  ) {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const uid = res.user.uid;

    const user: User = {
      uid,
      email,
      role,
      name,
      createdAt: Date.now(),
    };

    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (referralCode && referralCode.trim()) user.referralCode = referralCode.trim();
    if (location) user.location = location;

    await setDoc(doc(db, "users", uid), user);

    await setDoc(doc(db, "wallets", uid), {
      userId: uid,
      balance: 0,
      pendingBalance: 0,
      transactions: [],
    });

    return user;
  },

  async signIn(email: string, password: string) {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const uid = res.user.uid;

    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? (docSnap.data() as User) : null;
  },

  async signOut() {
    await signOut(auth);
  },

  async getCurrentUser(): Promise<User | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const snap = await getDoc(doc(db, "users", user.uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  // -----------------------------
  // USERS
  // -----------------------------
  async getAllUsers(): Promise<User[]> {
    const q = await getDocs(collection(db, "users"));
    return q.docs.map((doc) => doc.data() as User);
  },

  async updateUserInfo(
    userId: string,
    data: { name?: string; phone?: string; gender?: string; location?: Location }
  ): Promise<void> {
    const userRef = doc(db, "users", userId);

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.location !== undefined) updateData.location = data.location;

    await updateDoc(userRef, updateData);
  },

  // -----------------------------
  // WALLET
  // -----------------------------
  async getWallet(userId: string): Promise<Wallet> {
    const snap = await getDoc(doc(db, "wallets", userId));
    return snap.exists()
      ? (snap.data() as Wallet)
      : {
          userId,
          balance: 0,
          pendingBalance: 0,
          transactions: [],
        };
  },

  async updateWallet(wallet: Wallet): Promise<void> {
    await setDoc(doc(db, "wallets", wallet.userId), wallet);
  },

  async addMoneyToWallet(userId: string, amount: number, reference: string): Promise<void> {
    const wallet = await this.getWallet(userId);

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: "credit",
      amount,
      description: `Deposit via Paystack - Ref: ${reference}`,
      timestamp: Date.now(),
    };

    wallet.balance += amount;
    wallet.transactions.unshift(transaction);

    await this.updateWallet(wallet);
  },

  async withdrawFromWallet(userId: string, amount: number): Promise<void> {
    const wallet = await this.getWallet(userId);

    if (wallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: "debit",
      amount,
      description: "Withdrawal to bank account",
      timestamp: Date.now(),
    };

    wallet.balance -= amount;
    wallet.transactions.unshift(transaction);

    await this.updateWallet(wallet);
  },

  // -----------------------------
  // PRODUCTS
  // -----------------------------
  async createProduct(product: Omit<Product, "id" | "createdAt">) {
    const productData: any = {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl,
      sellerId: product.sellerId,
      stock: product.stock,
      location: product.location,
      createdAt: Date.now(),
    };

    if (product.subcategory) productData.subcategory = product.subcategory;
    if (product.discount !== undefined) productData.discount = product.discount;

    const ref = await addDoc(collection(db, "products"), productData);
    await updateDoc(ref, { id: ref.id });

    const snap = await getDoc(ref);
    return snap.data() as Product;
  },

  async getProducts(category?: "supermarket" | "pharmacy") {
    const productsCol = collection(db, "products");
    let q: any = productsCol;
    if (category) q = query(productsCol, where("category", "==", category));

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => doc.data() as Product)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getProductsBySeller(sellerId: string): Promise<Product[]> {
    const productsCol = collection(db, "products");
    const q = query(productsCol, where("sellerId", "==", sellerId));

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => doc.data() as Product)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async updateProduct(productId: string, data: Partial<Product>): Promise<void> {
    const productRef = doc(db, "products", productId);

    const updateData: any = { updatedAt: Date.now() };

    Object.keys(data).forEach((key) => {
      if (data[key as keyof Product] !== undefined) {
        updateData[key] = data[key as keyof Product];
      }
    });

    await updateDoc(productRef, updateData);
  },

  async deleteProduct(productId: string): Promise<void> {
    const productRef = doc(db, "products", productId);
    await deleteDoc(productRef);
  },

  // -----------------------------
  // ORDERS - COMPLETE SYSTEM
  // -----------------------------
  async createOrder(
    buyerId: string,
    sellerId: string,
    products: OrderItem[],
    deliveryAddress: string,
    discount: number = 0
  ) {
    const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = subtotal - discount;
    const commission = totalAmount * COMMISSION_RATE;

    const ref = await addDoc(collection(db, "orders"), {
      buyerId,
      sellerId,
      products,
      totalAmount,
      commission,
      status: "running",
      deliveryAddress,
      disputeStatus: "none",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await updateDoc(ref, { id: ref.id });

    // Add to seller's pending balance
    const sellerWallet = await this.getWallet(sellerId);
    sellerWallet.pendingBalance += totalAmount - commission;
    sellerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "credit",
      amount: totalAmount - commission,
      description: `Pending payment for order #${ref.id.slice(-6)}`,
      timestamp: Date.now(),
    });
    await this.updateWallet(sellerWallet);

    // Add commission to admin
    const adminUsers = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
    if (!adminUsers.empty) {
      const adminId = adminUsers.docs[0].id;
      const adminWallet = await this.getWallet(adminId);
      adminWallet.balance += commission;
      adminWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "credit",
        amount: commission,
        description: `Commission from order #${ref.id.slice(-6)}`,
        timestamp: Date.now(),
      });
      await this.updateWallet(adminWallet);
    }

    // Send confirmation emails
    const buyerDoc = await getDoc(doc(db, "users", buyerId));
    const sellerDoc = await getDoc(doc(db, "users", sellerId));

    if (buyerDoc.exists()) {
      const buyer = buyerDoc.data();
      await emailService.sendOrderConfirmation(
        buyer.email,
        buyer.name,
        ref.id,
        totalAmount,
        products
      );
    }

    if (sellerDoc.exists()) {
      const seller = sellerDoc.data();
      await emailService.sendSellerNotification(
        seller.email,
        seller.name,
        ref.id,
        totalAmount - commission,
        'new_order'
      );
    }

    const snap = await getDoc(ref);
    return snap.data() as Order;
  },

  async getOrders(userId: string, role: UserRole): Promise<Order[]> {
    const ordersCol = collection(db, "orders");
    let q: any;

    if (role === "admin") q = ordersCol;
    else if (role === "buyer") q = query(ordersCol, where("buyerId", "==", userId));
    else q = query(ordersCol, where("sellerId", "==", userId));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Order).sort((a, b) => b.createdAt - a.createdAt);
  },

  // BUYER CONFIRMS RECEIPT - Money moves from pending to available
  async confirmOrderDelivery(orderId: string, buyerId: string): Promise<void> {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) throw new Error("Order not found");

    const order = orderSnap.data() as Order;

    if (order.buyerId !== buyerId) {
      throw new Error("Unauthorized: Only buyer can confirm delivery");
    }

    if (order.status !== "running") {
      throw new Error("Order is not in running status");
    }

    // Update order status
    await updateDoc(orderRef, {
      status: "delivered",
      buyerConfirmed: true,
      updatedAt: Date.now(),
    });

    // Transfer pending balance to seller's available balance
    const amount = order.totalAmount - order.commission;
    const sellerWallet = await this.getWallet(order.sellerId);

    sellerWallet.balance += amount;
    sellerWallet.pendingBalance -= amount;
    sellerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "credit",
      amount,
      description: `Payment received for order #${orderId.slice(-6)} (Buyer confirmed delivery)`,
      timestamp: Date.now(),
    });

    await this.updateWallet(sellerWallet);

    // Send email notifications
    const buyerDoc = await getDoc(doc(db, "users", buyerId));
    const sellerDoc = await getDoc(doc(db, "users", order.sellerId));

    if (buyerDoc.exists() && sellerDoc.exists()) {
      const buyer = buyerDoc.data();
      const seller = sellerDoc.data();

      await emailService.sendOrderDelivered(
        buyer.email,
        buyer.name,
        orderId,
        order.totalAmount
      );

      await emailService.sendSellerNotification(
        seller.email,
        seller.name,
        orderId,
        amount,
        'delivered'
      );
    }
  },

  // SELLER CANCELS ORDER - Full refund to buyer
  async cancelOrderBySeller(
    orderId: string,
    sellerId: string,
    reason: string
  ): Promise<void> {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) throw new Error("Order not found");

    const order = orderSnap.data() as Order;

    if (order.sellerId !== sellerId) {
      throw new Error("Unauthorized: Only seller can cancel this order");
    }

    if (order.status !== "running") {
      throw new Error("Order is not in running status");
    }

    // Update order status
    await updateDoc(orderRef, {
      status: "cancelled",
      sellerCancelled: true,
      cancelReason: reason,
      updatedAt: Date.now(),
    });

    // Process refund
    const sellerWallet = await this.getWallet(order.sellerId);
    const buyerWallet = await this.getWallet(order.buyerId);

    // Remove from seller's pending balance
    const amount = order.totalAmount - order.commission;
    sellerWallet.pendingBalance -= amount;
    sellerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "debit",
      amount,
      description: `Cancelled order #${orderId.slice(-6)} - Refunded to buyer`,
      timestamp: Date.now(),
    });

    await this.updateWallet(sellerWallet);

    // Full refund to buyer's available balance
    buyerWallet.balance += order.totalAmount;
    buyerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "credit",
      amount: order.totalAmount,
      description: `Refund for cancelled order #${orderId.slice(-6)}`,
      timestamp: Date.now(),
    });

    await this.updateWallet(buyerWallet);

    // Refund commission to admin
    const adminUsers = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );
    
    if (!adminUsers.empty) {
      const adminId = adminUsers.docs[0].id;
      const adminWallet = await this.getWallet(adminId);

      adminWallet.balance -= order.commission;
      adminWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "debit",
        amount: order.commission,
        description: `Commission refund for cancelled order #${orderId.slice(-6)}`,
        timestamp: Date.now(),
      });

      await this.updateWallet(adminWallet);
    }

    // Send email notifications
    const buyerDoc = await getDoc(doc(db, "users", order.buyerId));
    const sellerDoc = await getDoc(doc(db, "users", order.sellerId));

    if (buyerDoc.exists()) {
      const buyer = buyerDoc.data();
      await emailService.sendOrderCancelled(
        buyer.email,
        buyer.name,
        orderId,
        order.totalAmount,
        reason
      );
    }

    if (sellerDoc.exists()) {
      const seller = sellerDoc.data();
      await emailService.sendSellerNotification(
        seller.email,
        seller.name,
        orderId,
        order.totalAmount,
        'cancelled_by_seller'
      );
    }
  },

  // BUYER CANCELS ORDER
  async cancelOrderByBuyer(
    orderId: string,
    buyerId: string,
    reason: string
  ): Promise<void> {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) throw new Error("Order not found");

    const order = orderSnap.data() as Order;

    if (order.buyerId !== buyerId) {
      throw new Error("Unauthorized: Only buyer can cancel this order");
    }

    if (order.status !== "running") {
      throw new Error("Order is not in running status");
    }

    // Update order status
    await updateDoc(orderRef, {
      status: "cancelled",
      cancelReason: reason,
      updatedAt: Date.now(),
    });

    // Refund process
    const sellerWallet = await this.getWallet(order.sellerId);
    const buyerWallet = await this.getWallet(order.buyerId);

    const amount = order.totalAmount - order.commission;
    sellerWallet.pendingBalance -= amount;
    sellerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "debit",
      amount,
      description: `Buyer cancelled order #${orderId.slice(-6)}`,
      timestamp: Date.now(),
    });

    await this.updateWallet(sellerWallet);

    buyerWallet.balance += order.totalAmount;
    buyerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "credit",
      amount: order.totalAmount,
      description: `Refund for cancelled order #${orderId.slice(-6)}`,
      timestamp: Date.now(),
    });

    await this.updateWallet(buyerWallet);

    // Refund commission
    const adminUsers = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );
    
    if (!adminUsers.empty) {
      const adminId = adminUsers.docs[0].id;
      const adminWallet = await this.getWallet(adminId);

      adminWallet.balance -= order.commission;
      adminWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "debit",
        amount: order.commission,
        description: `Commission refund for cancelled order #${orderId.slice(-6)}`,
        timestamp: Date.now(),
      });

      await this.updateWallet(adminWallet);
    }

    // Send notifications
    const buyerDoc = await getDoc(doc(db, "users", buyerId));
    const sellerDoc = await getDoc(doc(db, "users", order.sellerId));

    if (buyerDoc.exists()) {
      const buyer = buyerDoc.data();
      await emailService.sendOrderCancelled(
        buyer.email,
        buyer.name,
        orderId,
        order.totalAmount,
        reason
      );
    }

    if (sellerDoc.exists()) {
      const seller = sellerDoc.data();
      await emailService.sendSellerNotification(
        seller.email,
        seller.name,
        orderId,
        order.totalAmount,
        'cancelled_by_buyer'
      );
    }
  },

  // OPEN DISPUTE
  async openDispute(
    orderId: string,
    userId: string,
    disputeDetails: string
  ): Promise<void> {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) throw new Error("Order not found");

    const order = orderSnap.data() as Order;

    if (order.buyerId !== userId && order.sellerId !== userId) {
      throw new Error("Unauthorized: Only buyer or seller can open dispute");
    }

    if (order.status === "cancelled") {
      throw new Error("Cannot open dispute for cancelled orders");
    }

    await updateDoc(orderRef, {
      disputeStatus: "open",
      disputeDetails,
      updatedAt: Date.now(),
    });

    // Notify admin
    const adminUsers = await getDocs(
      query(collection(db, "users"), where("role", "==", "admin"))
    );

    if (!adminUsers.empty) {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const user = userDoc.data();
        const adminData = adminUsers.docs[0].data();
        
        await emailService.sendDisputeOpened(
          adminData.email,
          orderId,
          disputeDetails,
          user.name
        );
      }
    }

    // Notify the other party
    const otherUserId = order.buyerId === userId ? order.sellerId : order.buyerId;
    const otherUserDoc = await getDoc(doc(db, "users", otherUserId));
    
    if (otherUserDoc.exists()) {
      const otherUser = otherUserDoc.data();
      await emailService.sendDisputeNotification(
        otherUser.email,
        otherUser.name,
        orderId
      );
    }
  },

   // ADMIN RESOLVES DISPUTE

  async sendDisputeMessage(orderId: string, senderId: string, senderRole: "buyer" | "seller" | "admin", message: string) {
  const ref = await addDoc(collection(db, "orders", orderId, "disputeChat"), {
    senderId,
    senderRole,
    message,
    timestamp: Date.now(),
  });

  await updateDoc(doc(db, "orders", orderId), {
    updatedAt: Date.now(),
  });
},


  // ADMIN RESOLVES DISPUTE
  async resolveDispute(
    orderId: string,
    adminId: string,
    resolution: "refund_buyer" | "release_to_seller",
    adminNotes?: string
  ): Promise<void> {
    // Verify admin
    const adminDoc = await getDoc(doc(db, "users", adminId));
    if (!adminDoc.exists() || adminDoc.data().role !== "admin") {
      throw new Error("Unauthorized: Only admin can resolve disputes");
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) throw new Error("Order not found");

    const order = orderSnap.data() as Order;

    if (order.disputeStatus !== "open") {
      throw new Error("No open dispute for this order");
    }

    if (resolution === "refund_buyer") {
      // Refund to buyer
      await this.cancelOrderBySeller(
        orderId,
        order.sellerId,
        `Admin resolved dispute in favor of buyer. ${adminNotes || ""}`
      );
    } else {
      // Release to seller
      const amount = order.totalAmount - order.commission;
      const sellerWallet = await this.getWallet(order.sellerId);

      sellerWallet.balance += amount;
      sellerWallet.pendingBalance -= amount;
      sellerWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "credit",
        amount,
        description: `Admin resolved dispute - Payment released for order #${orderId.slice(-6)}`,
        timestamp: Date.now(),
      });

      await this.updateWallet(sellerWallet);

      await updateDoc(orderRef, {
        status: "delivered",
        disputeStatus: "resolved",
        adminNotes,
        updatedAt: Date.now(),
      });
    }

    // Mark dispute as resolved
    await updateDoc(orderRef, {
      disputeStatus: "resolved",
      adminNotes,
      updatedAt: Date.now(),
    });

    // Notify both parties
    const buyerDoc = await getDoc(doc(db, "users", order.buyerId));
    const sellerDoc = await getDoc(doc(db, "users", order.sellerId));

    if (buyerDoc.exists() && sellerDoc.exists()) {
      const buyer = buyerDoc.data();
      const seller = sellerDoc.data();

      await emailService.sendDisputeResolved(
        buyer.email,
        seller.email,
        orderId,
        resolution,
        adminNotes || ""
      );
    }
  },

  // Legacy method for backward compatibility
  async updateOrderStatus(orderId: string, status: Order["status"]) {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) return;

    const order = orderSnap.data() as Order;

    await updateDoc(orderRef, { status, updatedAt: Date.now() });

    if (status === "delivered") {
      const amount = order.totalAmount - order.commission;
      const sellerWallet = await this.getWallet(order.sellerId);

      sellerWallet.balance += amount;
      sellerWallet.pendingBalance -= amount;
      sellerWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "credit",
        amount,
        description: `Payment for order #${orderId.slice(-6)}`,
        timestamp: Date.now(),
      });

      await this.updateWallet(sellerWallet);
    }
  },

  // -----------------------------
  // COUPONS
  // -----------------------------
  async validateCoupon(code: string, userId: string): Promise<Coupon | null> {
    const snap = await getDoc(doc(db, "coupons", code));
    if (!snap.exists()) return null;

    const coupon = snap.data() as Coupon;
    if (coupon.expiresAt < Date.now()) return null;
    if (coupon.usedBy.includes(userId)) return null;

    return coupon;
  },

  async applyCoupon(code: string, userId: string): Promise<void> {
    const ref = doc(db, "coupons", code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const coupon = snap.data() as Coupon;
    coupon.usedBy.push(userId);

    await updateDoc(ref, { usedBy: coupon.usedBy });
  },



//-----------



 // DISPUTE CHAT - FIXED
  // -----------------------------
  listenToDisputeMessages(orderId: string, callback: (messages: DisputeMessage[]) => void) {
    const chatRef = collection(db, "orders", orderId, "disputeChat");
    const unsub = onSnapshot(chatRef, (snapshot) => {
      const msgs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as DisputeMessage))
        .sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    });
    return unsub; // ✅ synchronous cleanup function
  },


  async getOrder(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, "orders", orderId));
  return snap.exists() ? (snap.data() as Order) : null;
}












// ------------------------------------------
// DISPUTE CHAT
// ------------------------------------------

  
};