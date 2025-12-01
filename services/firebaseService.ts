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
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { soundManager } from '../lib/soundManager';
import { emailService } from "../lib/resend";


export type UserRole = 
  | "admin" 
  | "seller" 
  | "buyer"
  | "state_manager_1"
  | "state_manager_2"
  | "support_agent"
  | "professional";

export type ProfessionalType = 
  | "doctor" 
  | "pharmacist" 
  | "dentist" 
  | "lawyer";

export interface Location {
  state: string;
  city: string;
  area: string;
}

export interface Location {
  state: string;
  city: string;
  area: string;
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  referralCode?: string; // code used to sign up
  myReferralCode?: string; // user's unique code
  referredBy?: string; // UID of user who referred this person
  hasCompletedFirstPurchase?: boolean; // NEW: track if user made first purchase
  location?: Location;
  sellerCategory?: "supermarket" | "pharmacy";
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  hasCompletedBusinessProfile?: boolean;
  createdAt: number;
  referralBonus?: number;
  assignedState?: string;              // For state managers
  managerLevel?: 1 | 2;               // Manager level (I or II)
  professionalType?: ProfessionalType; // For professionals
  professionalLicense?: string;        // Professional license number
  specialization?: string;             // For doctors/dentists
  yearsOfExperience?: number;         // For professionals
  consultationFee?: number;           // For professionals
  availability?: string[];            // Available days for professionals
  isVerified?: boolean;               // Verification status for professionals
  isActive?: boolean;                 // Account active status
  assignedBy?: string;                // UID of admin who assigned role
  assignedAt?: number;                // Timestamp of role assignment
  permissions?: string[];             // Specific permissions array

}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "supermarket" | "pharmacy";
  subcategory?: string;
  imageUrls: string | string[];
  sellerId: string;
  sellerBusinessName?: string;
  stock: number;
  discount?: number;
  location: Location
  brand?: string;
  weight?: string;
  expiryDate?: string;
  isPrescriptionRequired?: boolean;
  isFeatured?: boolean;
  tags?: string[];
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
  phoneNumber?: string;
  location?: Location,
  trackingStatus?: "acknowledged" | "enroute" | "ready_for_pickup" | null;
  trackingHistory?: TrackingEvent[];
  createdAt: number;
  updatedAt: number;
  resolvedByAdmin?: boolean;
  adminResolution?: "delivered" | "cancelled";
}

export interface TrackingEvent {
  status: "acknowledged" | "enroute" | "ready_for_pickup" | "delivered";
  timestamp: number;
  message: string;
}

export interface DisputeMessage {
  id: string;
  senderId: string;
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
  status?: "pending" | "completed";
}

export interface Coupon {
  code: string;
  discount: number;
  type: "percentage" | "fixed";
  expiresAt: number;
  usedBy: string[];
}

const COMMISSION_RATE = 0.10;

// Utility to generate a unique referral code
const generateReferralCode = (length = 6) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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
  ): Promise<User> {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const uid = res.user.uid;

    const myReferralCode = generateReferralCode();

    const user: User = {
      uid,
      email,
      role,
      name,
      myReferralCode,
      referralBonus: 0,
      hasCompletedFirstPurchase: false, // NEW: initialize as false
      createdAt: Date.now(),
    };

    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (referralCode?.trim()) user.referralCode = referralCode.trim();
    if (location) user.location = location;
    if (sellerCategory && role === "seller") user.sellerCategory = sellerCategory;

    // Create wallet first
    await setDoc(doc(db, "wallets", uid), {
      userId: uid,
      balance: 0,
      pendingBalance: 0,
      transactions: [],
    });

    // Handle referral bonus - NEW: Goes to PENDING balance
    let referrerId: string | null = null;
    if (referralCode && referralCode.trim()) {
      const usersSnap = await getDocs(collection(db, "users"));
      const referrer = usersSnap.docs
        .map((d) => d.data() as User)
        .find((u) => u.myReferralCode === referralCode.trim());

      if (referrer) {
        referrerId = referrer.uid;
        user.referredBy = referrerId; // NEW: store who referred this user

        // Add to PENDING balance instead of main balance
        const refWalletSnap = await getDoc(doc(db, "wallets", referrer.uid));
        if (refWalletSnap.exists()) {
          const wallet = refWalletSnap.data();
          const amount = 500;
          const transactions = wallet.transactions || [];
          transactions.unshift({
            id: Date.now().toString(),
            type: "credit",
            amount,
            description: `Pending referral bonus from ${name} (Released after first purchase)`,
            timestamp: Date.now(),
            status: "pending", // NEW: mark as pending
          });

          await updateDoc(doc(db, "wallets", referrer.uid), {
            pendingBalance: (wallet.pendingBalance || 0) + amount, // NEW: add to pending
            transactions,
          });

          await soundManager.play('deposit');

          
        }
      }
    }

    // Save user
    await setDoc(doc(db, "users", uid), user);

    // Send welcome email
    try {
      if (role === "seller") {
        await emailService.sendSellerWelcomeEmail(email.trim(), name.trim());
      } else {
        await emailService.sendBuyerWelcomeEmail(email.trim(), name.trim());
      }
    } catch (e) {
      console.error("Email failed:", e);
    }

    await soundManager.play('signup');

    return user;
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
  
  // ✅ Play deposit sound
  await soundManager.play('deposit');
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
  
  // ✅ Play debit sound
  await soundManager.play('debit');
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
      imageUrls: product.imageUrls,
      sellerId: product.sellerId,
      stock: product.stock,
      location: product.location,
      brand: product.brand?.trim() || null,
      weight: product.weight?.trim() || null,
      expiryDate: product.expiryDate || null,
      isPrescriptionRequired: product.isPrescriptionRequired ?? null,
      discount: product.discount ?? 0,
      isFeatured: product.isFeatured ?? false,
      tags: product.tags || [],
      createdAt: Date.now(),
    };

    if (product.subcategory) productData.subcategory = product.subcategory;
    if (product.discount !== undefined) productData.discount = product.discount;

    const ref = await addDoc(collection(db, "products"), productData);
    await updateDoc(ref, { id: ref.id });

    const snap = await getDoc(ref);
    await soundManager.play('productAdded');
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

    const allowedFields = [
      "name", "description", "price", "stock", "subcategory",
      "brand", "weight", "expiryDate", "isPrescriptionRequired",
      "discount", "isFeatured", "tags", "imageUrls"
    ];

    allowedFields.forEach((field) => {
      if (data[field as keyof Product] !== undefined) {
        updateData[field] = data[field as keyof Product];
      }
    });

    await updateDoc(productRef, updateData);
  },

  async deleteProduct(productId: string): Promise<void> {
    const productRef = doc(db, "products", productId);
    await deleteDoc(productRef);
  },

  // -----------------------------
  // ORDERS - COMPLETE SYSTEM WITH REFERRAL BONUS RELEASE
  // -----------------------------
  async createOrder(
    buyerId: string,
    sellerId: string,
    products: OrderItem[],
    deliveryAddress: string,
    discount: number = 0,
    phoneNumber?: string
  ) {
    // 1. Validate stock availability and calculate total
    const productRefs = products.map(item =>
      doc(db, "products", item.productId)
    );
    const productSnaps = await Promise.all(productRefs.map(ref => getDoc(ref)));

    let subtotal = 0;
    const stockUpdates: Promise<void>[] = [];

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      const snap = productSnaps[i];

      if (!snap.exists()) {
        throw new Error(`Product ${item.productName} no longer exists`);
      }

      const product = snap.data() as Product;

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} left.`);
      }

      const unitPrice = product.discount
        ? product.price * (1 - product.discount / 100)
        : product.price;

      subtotal += unitPrice * item.quantity;

      const newStock = product.stock - item.quantity;

      if (newStock === 0) {
        stockUpdates.push(deleteDoc(doc(db, "products", item.productId)));
      } else if (newStock > 0) {
        stockUpdates.push(
          updateDoc(doc(db, "products", item.productId), {
            stock: newStock,
          })
        );
      }
      
    }
    

    const totalAmount = subtotal - discount;
    const commission = totalAmount * COMMISSION_RATE;

    // 2. Create the order
    const orderRef = await addDoc(collection(db, "orders"), {
      buyerId,
      sellerId,
      products,
      totalAmount,
      commission,
      status: "running",
      deliveryAddress,
      phoneNumber,
      disputeStatus: "none",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await updateDoc(orderRef, { id: orderRef.id });

    // 3. Update product stocks
    await Promise.all(stockUpdates);

    // 4. Wallet updates
    const sellerWallet = await this.getWallet(sellerId);
    sellerWallet.pendingBalance += totalAmount - commission;
    sellerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "credit",
      amount: totalAmount - commission,
      description: `Pending payment for order #${orderRef.id.slice(-6)}`,
      timestamp: Date.now(),
    });
    await this.updateWallet(sellerWallet);

    await soundManager.play('deposit');

    // Admin commission
    const adminUsers = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
    if (!adminUsers.empty) {
      const adminId = adminUsers.docs[0].id;
      const adminWallet = await this.getWallet(adminId);
      adminWallet.balance += commission;
      adminWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "credit",
        amount: commission,
        description: `Commission from order #${orderRef.id.slice(-6)}`,
        timestamp: Date.now(),
      });
      await this.updateWallet(adminWallet);
      await soundManager.play('deposit');
    }

    // 5. NEW: Check if this is buyer's first purchase and release referral bonus
    const buyerDoc = await getDoc(doc(db, "users", buyerId));
    if (buyerDoc.exists()) {
      const buyer = buyerDoc.data() as User;
      
      // If this is first purchase and buyer was referred
      if (!buyer.hasCompletedFirstPurchase && buyer.referredBy) {
        // Mark buyer as having completed first purchase
        await updateDoc(doc(db, "users", buyerId), {
          hasCompletedFirstPurchase: true,
        });

        // Release referral bonus to referrer's main balance
        const referrerWallet = await this.getWallet(buyer.referredBy);
        const bonusAmount = 500;
        
        // Move from pending to main balance
        referrerWallet.pendingBalance = Math.max(0, referrerWallet.pendingBalance - bonusAmount);
        referrerWallet.balance += bonusAmount;
        
        // Add transaction showing bonus release
        referrerWallet.transactions.unshift({
          id: Date.now().toString(),
          type: "credit",
          amount: bonusAmount,
          description: `Referral bonus released! ${buyer.name} completed their first purchase`,
          timestamp: Date.now(),
          status: "completed",
        });
        
        await this.updateWallet(referrerWallet);

        await soundManager.play('deposit');


        // Update referrer's total referral bonus earned
        const referrerDoc = await getDoc(doc(db, "users", buyer.referredBy));
        if (referrerDoc.exists()) {
          const referrer = referrerDoc.data() as User;
          await updateDoc(doc(db, "users", buyer.referredBy), {
            referralBonus: (referrer.referralBonus || 0) + bonusAmount,
          });
        }
      }

      // Send order confirmation email
      await emailService.sendOrderConfirmation(
        buyer.email,
        buyer.name,
        orderRef.id,
        totalAmount,
        products
      );

    }
   
    // 6. Send seller notification
    const sellerDoc = await getDoc(doc(db, "users", sellerId));
    if (sellerDoc.exists()) {
      const seller = sellerDoc.data();
      await emailService.sendSellerNotification(
        seller.email,
        seller.name,
        orderRef.id,
        totalAmount - commission,
        'new_order'
      );
    }

    await soundManager.play('orderPlaced');

    const snap = await getDoc(orderRef);
    return snap.data() as Order;
  },

  async getOrders(userId: string, role: UserRole): Promise<Order[]> {
  const ordersCol = collection(db, "orders");

  let orders: Order[] = [];

  // Admins see everything
  if (role === "admin") {
    const snapshot = await getDocs(ordersCol);
    orders = snapshot.docs.map(doc => doc.data() as Order);
  } 
  // Everyone else: show orders where they are buyer OR seller
  else {
    const [asBuyerSnap, asSellerSnap] = await Promise.all([
      getDocs(query(ordersCol, where("buyerId", "==", userId))),
      getDocs(query(ordersCol, where("sellerId", "==", userId)))
    ]);

    const asBuyer = asBuyerSnap.docs.map(d => d.data() as Order);
    const asSeller = asSellerSnap.docs.map(d => d.data() as Order);

    // Combine and remove duplicates (in case of weird data)
    const combined = [...asBuyer, ...asSeller];
    const unique = combined.filter((order, index, self) =>
      index === self.findIndex(o => o.id === order.id)
    );

    orders = unique;
  }

  return orders.sort((a, b) => b.createdAt - a.createdAt);
},

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

    await updateDoc(orderRef, {
      status: "delivered",
      buyerConfirmed: true,
      updatedAt: Date.now(),
    });

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

    await soundManager.play('delivered');

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

    await updateDoc(orderRef, {
      status: "cancelled",
      sellerCancelled: true,
      cancelReason: reason,
      updatedAt: Date.now(),
    });

    const sellerWallet = await this.getWallet(order.sellerId);
    const buyerWallet = await this.getWallet(order.buyerId);

    const amount = order.totalAmount - order.commission;
    sellerWallet.pendingBalance = Math.max(0, sellerWallet.pendingBalance - amount);
    sellerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "debit",
      amount,
      description: `Cancelled order #${orderId.slice(-6)} - Refunded to buyer`,
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
    await soundManager.play('deposit');

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
      await soundManager.play('debit');

    }

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

    if (order.trackingStatus) {
      throw new Error("Cannot cancel order after seller has acknowledged it. Please open a dispute if there's an issue.");
    }

    await updateDoc(orderRef, {
      status: "cancelled",
      cancelReason: reason,
      updatedAt: Date.now(),
    });

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
    await soundManager.play('debit');

    buyerWallet.balance += order.totalAmount;
    buyerWallet.transactions.unshift({
      id: Date.now().toString(),
      type: "credit",
      amount: order.totalAmount,
      description: `Refund for cancelled order #${orderId.slice(-6)}`,
      timestamp: Date.now(),
    });

    await this.updateWallet(buyerWallet);
    await soundManager.play('deposit');

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
      await soundManager.play('deposit');
    }

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
  
  // ✅ Play dispute sound
  await soundManager.play('dispute');

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

  async sendDisputeMessage(
    orderId: string,
    senderId: string,
    senderRole: "buyer" | "seller" | "admin",
    message: string
  ): Promise<string> {
    const ref = await addDoc(collection(db, "orders", orderId, "disputeChat"), {
      senderId,
      senderRole,
      message: message.trim(),
      timestamp: Date.now(),
    });

    await updateDoc(doc(db, "orders", orderId), {
      updatedAt: Date.now(),
    });

    return ref.id;
  },

  async resolveDispute(
    orderId: string,
    adminId: string,
    resolution: "refund_buyer" | "release_to_seller",
    adminNotes?: string
  ): Promise<void> {
    const adminDoc = await getDoc(doc(db, "users", adminId));
    if (!adminDoc.exists() || adminDoc.data()?.role !== "admin") {
      throw new Error("Unauthorized: Only admin can resolve disputes");
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error("Order not found");

    const order = orderSnap.data() as Order;
    if (order.disputeStatus !== "open") {
      throw new Error("No open dispute for this order");
    }

    const updates: any = {
      disputeStatus: "resolved",
      adminNotes: adminNotes?.trim() || null,
      resolvedByAdmin: true,
      adminResolution: resolution === "refund_buyer" ? "cancelled" : "delivered",
      updatedAt: Date.now(),
    };

    if (resolution === "refund_buyer") {
      updates.status = "cancelled";

      const buyerWallet = await this.getWallet(order.buyerId);
      const sellerWallet = await this.getWallet(order.sellerId);

      buyerWallet.balance += order.totalAmount;
      buyerWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "credit",
        amount: order.totalAmount,
        description: `Refund: Admin resolved dispute in your favor - Order #${orderId.slice(-6)}`,
        timestamp: Date.now(),
      });
      await this.updateWallet(buyerWallet);
      await soundManager.play('deposit');

      sellerWallet.pendingBalance -= (order.totalAmount - order.commission);
      sellerWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "debit",
        amount: order.totalAmount - order.commission,
        description: `Dispute lost: Refunded to buyer (Admin resolution) - Order #${orderId.slice(-6)}`,
        timestamp: Date.now(),
      });
      await this.updateWallet(sellerWallet);
      await soundManager.play('debit');

      const adminUsers = await getDocs(query(collection(db, "users"), where("role", "==", "admin")));
      if (!adminUsers.empty) {
        const adminWallet = await this.getWallet(adminUsers.docs[0].id);
        adminWallet.balance -= order.commission;
        adminWallet.transactions.unshift({
          id: Date.now().toString(),
          type: "debit",
          amount: order.commission,
          description: `Commission reversed: Dispute resolved for buyer - Order #${orderId.slice(-6)}`,
          timestamp: Date.now(),
        });
        await this.updateWallet(adminWallet);
        await soundManager.play('debit');
      }
    } else {
      updates.status = "delivered";

      const sellerWallet = await this.getWallet(order.sellerId);
      const amountToRelease = order.totalAmount - order.commission;

      sellerWallet.pendingBalance -= amountToRelease;
      sellerWallet.balance += amountToRelease;
      sellerWallet.transactions.unshift({
        id: Date.now().toString(),
        type: "credit",
        amount: amountToRelease,
        description: `Payment released: Admin resolved dispute in your favor - Order #${orderId.slice(-6)}`,
        timestamp: Date.now(),
      });
      await this.updateWallet(sellerWallet);
      await soundManager.play('deposit');
    }

    await updateDoc(orderRef, updates);

    const [buyerDoc, sellerDoc] = await Promise.all([
      getDoc(doc(db, "users", order.buyerId)),
      getDoc(doc(db, "users", order.sellerId)),
    ]);

    if (buyerDoc.exists() && sellerDoc.exists()) {
      const buyer = buyerDoc.data()!;
      const seller = sellerDoc.data()!;

      await emailService.sendDisputeResolved(
        buyer.email,
        buyer.name,
        seller.email,
        seller.name,
        orderId,
        resolution,
        adminNotes || "No additional notes."
      );
    }
  },

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

  // -----------------------------
  // DISPUTE CHAT
  // -----------------------------
  listenToDisputeMessages(orderId: string, callback: (messages: DisputeMessage[]) => void) {
    const chatRef = collection(db, "orders", orderId, "disputeChat");
    const unsub = onSnapshot(chatRef, (snapshot) => {
      const msgs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as DisputeMessage))
        .sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    });
    return unsub;
  },

  async getOrder(orderId: string): Promise<Order | null> {
    const snap = await getDoc(doc(db, "orders", orderId));
    return snap.exists() ? (snap.data() as Order) : null;
  },

  // -----------------------------
  // ORDER TRACKING
  // -----------------------------
  async updateOrderTracking(
  orderId: string,
  status: "acknowledged" | "enroute" | "ready_for_pickup"
): Promise<void> {
  const orderRef = doc(db, "orders", orderId);
  const orderSnap = await getDoc(orderRef);

  if (!orderSnap.exists()) throw new Error("Order not found");

  const order = orderSnap.data() as Order;

  if (order.status !== "running") {
    throw new Error("Can only update tracking for running orders");
  }

  const trackingEvent: TrackingEvent = {
    status,
    timestamp: Date.now(),
    message: this.getTrackingMessage(status),
  };

  const trackingHistory = order.trackingHistory || [];
  trackingHistory.push(trackingEvent);

  await updateDoc(orderRef, {
    trackingStatus: status,
    trackingHistory,
    updatedAt: Date.now(),
  });

  await this.sendTrackingNotification(order.buyerId, orderId, status);

  // ✅ Play appropriate tracking sound
  if (status === 'acknowledged') {
    await soundManager.play('acknowledged');
  } else if (status === 'enroute') {
    await soundManager.play('enroute');
  } else if (status === 'ready_for_pickup') {
    await soundManager.play('ready');
  }

  const buyerDoc = await getDoc(doc(db, "users", order.buyerId));
  if (buyerDoc.exists()) {
    const buyer = buyerDoc.data();
    await emailService.sendOrderTrackingUpdate(
      buyer.email,
      buyer.name,
      orderId,
      status,
      this.getTrackingMessage(status)
    );
  }
},

  getTrackingMessage(status: string): string {
    switch (status) {
      case "acknowledged":
        return "Seller has acknowledged your order and is preparing it for delivery.";
      case "enroute":
        return "Your order is on the way! The delivery is in progress.";
      case "ready_for_pickup":
        return "Your order has arrived and is ready for pickup/delivery confirmation.";
      default:
        return "Order status updated.";
    }
  },

  async sendTrackingNotification(
    userId: string,
    orderId: string,
    status: string
  ): Promise<void> {
    console.log(`Notification sent to user ${userId}: Order ${orderId} is now ${status}`);
  },

  // -----------------------------
  // NOTIFICATION SETTINGS
  // -----------------------------
  async getUserSettings(userId: string) {
    const ref = doc(db, "userSettings", userId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { notificationsEnabled: true };
  },

  async updateUserSettings(userId: string, settings: any) {
    const ref = doc(db, "userSettings", userId);
    return setDoc(ref, settings, { merge: true });
  },

  async clearPushToken(userId: string) {
    const ref = doc(db, "pushTokens", userId);
    return setDoc(ref, { token: null }, { merge: true });
  },

  listenToOrder(orderId: string, callback: (order: Order) => void) {
    return onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Order);
      }
    });
  },

  async updateBusinessProfile(
  userId: string,
  data: {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
  }
): Promise<void> {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    businessName: data.businessName.trim(),
    businessAddress: data.businessAddress.trim(),
    businessPhone: data.businessPhone.trim(),
    hasCompletedBusinessProfile: true,
    updatedAt: Date.now(),
  });

  // Reload the auth context by getting the updated user
  const updatedUserSnap = await getDoc(userRef);
  if (updatedUserSnap.exists()) {
    return updatedUserSnap.data() as any;
  }
},

};