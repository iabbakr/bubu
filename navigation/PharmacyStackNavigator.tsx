import { createNativeStackNavigator } from "@react-navigation/native-stack";
import PharmacyScreen from "@/screens/PharmacyScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import CartScreen from "@/screens/CartScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import VideoCallScreen from "@/screens/VideoCallScreen";


export type PharmacyStackParamList = {
  Pharmacy: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  VideoCall: {
    streamUserId: string;
    streamUserName: string;
    streamUserImage?: string;
    callId: string;
    bookingId: string;
  };
};

const Stack = createNativeStackNavigator<PharmacyStackParamList>();

export default function PharmacyStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Pharmacy"
        component={PharmacyScreen}
        options={{
          headerShown: false
        }}
        
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{
          title: "Product Details",
        }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: "Shopping Cart",
        }}
      />
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
