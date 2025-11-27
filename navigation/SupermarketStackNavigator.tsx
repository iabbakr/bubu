import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SupermarketScreen from "@/screens/SupermarketScreen";
import ProductDetailScreen from "@/screens/ProductDetailScreen";
import CartScreen from "@/screens/CartScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";

export type SupermarketStackParamList = {
  Supermarket: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
};

const Stack = createNativeStackNavigator<SupermarketStackParamList>();

export default function SupermarketStackNavigator() {
  const { theme, isDark } = useTheme();
  

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        
        name="Supermarket"
        component={SupermarketScreen}
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
    </Stack.Navigator>
  );
}
