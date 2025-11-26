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


  // Auth Screens
  SignIn: undefined;
  SignUp: undefined;
  
  // Main Tabs
  Home: undefined;
  Explore: undefined;

  OrdersTab: undefined;
  Profile: undefined;
  
  // Order Screens
  Orders: undefined;
  OrderDetailScreen: { orderId: string };

  
  // Product Screens
  
  // Profile Screens
  AccountInfo: undefined;
  Wallet: undefined;
  
  // Seller Screens
  SellerDashboard: undefined;
  AddProduct: undefined;
  EditProduct: { productId: string };
  
  // Admin Screens
  AdminPanel: undefined;
  
  // Other
  Settings: undefined;
  Notifications: undefined;
};

// Example navigation setup in your App.tsx or navigation file:
/*
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen 
          name="OrderDetailScreen" 
          component={OrderDetailScreen}
          options={{ title: 'Order Details' }}
        />
        <Stack.Screen 
          name="DisputeChatScreen" 
          component={DisputeChatScreen}
          options={{ title: 'Dispute Chat' }}
        />
        <Stack.Screen 
          name="AdminDisputeScreen" 
          component={AdminDisputeScreen}
          options={{ title: 'Admin Dispute Chat' }}
        />
        {/* Other screens *\/}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
*/
