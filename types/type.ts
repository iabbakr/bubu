
export type SellerStackParamList = {
  SellerDashboard: undefined;
  AddProduct: undefined;
  EditProduct: { product: Product };
  MyProducts: undefined;  // <-- add this
  MyOrders: undefined;    // <-- add this
  OrderDetail: { orderId: string };      // <-- add this
};




export interface Location {
  state: string;
  city: string;
}




export type UserRole = "admin" | "seller" | "buyer";

export interface Location { state: string; city: string; }

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
  imageUrls: string | string[];
  sellerId: string;
  stock: number;
  discount?: number;
  location: Location;
  brand?: string;
  weight?: string;
  expiryDate?: string;
  isPrescriptionRequired?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  createdAt: number;
}

export interface OrderItem { productId: string; productName: string; quantity: number; price: number; }

export interface TrackingEvent {
  status: "acknowledged" | "enroute" | "ready_for_pickup" | "delivered";
  timestamp: number;
  message: string;
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
  location?: Location;
  trackingStatus?: "acknowledged" | "enroute" | "ready_for_pickup" | null;
  trackingHistory?: TrackingEvent[];
  createdAt: number;
  updatedAt: number;
  resolvedByAdmin?: boolean;
  adminResolution?: "delivered" | "cancelled";
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


