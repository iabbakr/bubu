// types/navigation.ts
export type RootStackParamList = {
  Pharmacy: undefined;
  Supermarket: undefined;
  Cart: undefined;
  ProductDetail: { productId: string };

  OrdersScreen: undefined;
  AdminDisputesDashboard: undefined;
  AdminDisputeScreen: { orderId: string };
   DisputeChatScreen: { orderId: string };
  // Add other screens here if needed
};

  
  
  // other screens...
