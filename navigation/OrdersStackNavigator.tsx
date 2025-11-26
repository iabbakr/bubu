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
import { useAuth } from "@/hooks/useAuth";
import SupportChatScreen from "@/screens/SupportChatScreen";
import AdminSupportDashboard from "@/screens/AdminSupportDashboard";
import AdminSupportChatScreen from "@/screens/AdminSupportChatScreen";


export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetailScreen: { orderId: string };
  DisputeChatScreen: { orderId: string };
  AdminDisputeScreen: { orderId: string };
  SupportChat: undefined;
  AdminSupportDashboard: undefined;
  AdminSupportChat: { chatId: string };
};

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export default function OrdersStackNavigator() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const {user} = useAuth();

  const openSupportChat = () => {
    // Navigate to support chat in Profile tab
    if (user.role === "admin") {
                navigation.navigate("AdminSupportDashboard");
                } else {
                navigation.navigate("SupportChat");
                }
  }

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
      {/* Support Chat Screens */}
                <Stack.Screen
                  name="SupportChat"
                  component={SupportChatScreen}
                  options={{
                    title: "Support Chat",
                    headerBackTitle: "Back",
                  }}
                />
               
                <Stack.Screen
                  name="AdminSupportDashboard"
                  component={AdminSupportDashboard}
                  options={{
                    title: "Support Dashboard",
                    headerBackTitle: "Back",
                  }}
                />
                
                <Stack.Screen
                  name="AdminSupportChat"
                  component={AdminSupportChatScreen}
                  options={{
                    title: "Support Chat",
                    headerBackTitle: "Back",
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