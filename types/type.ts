import { Product } from "../services/firebaseService";

export type SellerStackParamList = {
  SellerDashboard: undefined;
  AddProduct: undefined;
  EditProduct: { product: Product };
  MyProducts: undefined;  // <-- add this
  MyOrders: undefined;    // <-- add this
  OrderDetail: { orderId: string };      // <-- add this
};



export type UserRole = "buyer" | "seller" | "admin";

export interface Location {
  state: string;
  city: string;
}

