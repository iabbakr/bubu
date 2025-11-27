// navigation/OrdersStackNavigator.tsx

import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import OrdersScreen from "@/screens/OrdersScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import OrderDetailScreen from "@/screens/OrderDetailScreen";
import AdminDisputeScreen from "@/screens/AdminDisputeDashboard";
import DisputeChatScreen from "@/screens/DisputeChatScreen";

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetailScreen: { orderId: string };
  DisputeChatScreen: { orderId: string };
  AdminDisputeScreen: { orderId: string };
};

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export default function OrdersStackNavigator() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();

  const openSupportChat = () => {
    // Navigate to support chat in Profile tab
    navigation.navigate("Profile" as never, {
      screen: "SupportChat",
    } as never);
  };

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: "Orders",
          headerRight: () => (
            <Pressable onPress={openSupportChat} style={{ padding: 8 }}>
              <Feather name="message-circle" size={24} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="DisputeChatScreen"
        component={DisputeChatScreen}
        options={{
          title: "Dispute Chat",
          headerRight: () => (
            <Pressable onPress={openSupportChat} style={{ padding: 8 }}>
              <Feather name="headphones" size={24} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="OrderDetailScreen"
        component={OrderDetailScreen}
        options={{
          title: "Order Details",
          headerRight: () => (
            <Pressable onPress={openSupportChat} style={{ padding: 8 }}>
              <Feather name="headphones" size={24} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
    </Stack.Navigator>
  );
}