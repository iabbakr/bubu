import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SupermarketScreen from "@/screens/SupermarketScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import CartScreen from "@/screens/CartScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import VideoCallScreen from "@/screens/VideoCallScreen";
import type { NativeStackScreenProps } from "@react-navigation/native-stack"; // Import for type safety

export type SupermarketStackParamList = {
  Supermarket: undefined;
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

const Stack = createNativeStackNavigator<SupermarketStackParamList>();

// Define the screen props for VideoCall to ensure correct typing if needed elsewhere
type VideoCallProps = NativeStackScreenProps<SupermarketStackParamList, 'VideoCall'>;

export default function SupermarketStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Supermarket"
        component={SupermarketScreen}
        options={{
          headerShown: false,
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
        // KEY CHANGE HERE: Use a function in options to control the parent Tab Navigator's style
        options={({ route }) => ({
          headerShown: false,
          gestureEnabled: false,
          // This tells the parent Tab Navigator to hide the tab bar
          tabBarStyle: { display: 'none' }, 
        })}
      />
    </Stack.Navigator>
  );
}