import { Product } from "../services/firebaseService";

export type SellerStackParamList = {
  SellerDashboard: undefined;
  AddProductScreen: undefined;
  EditProduct: { product: Product };
};



export type UserRole = "buyer" | "seller" | "admin";

export interface Location {
  state: string;
  city: string;
}

