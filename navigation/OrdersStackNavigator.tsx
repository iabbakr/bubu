// navigation/OrdersStackNavigator.tsx

import { Pressable, Alert } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import OrdersScreen from "@/screens/OrdersScreen";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import OrderDetailScreen from "@/screens/OrderDetailScreen";
import AdminDisputeScreen from "@/screens/AdminDisputeDashboard";
import DisputeChatScreen from "@/screens/DisputeChatScreen";

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetailScreen:  { orderId: string };
  DisputeChatScreen:  { orderId: string };
  AdminDisputeScreen: { orderId: string };
};

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export default function OrdersStackNavigator() {
  const { theme, isDark } = useTheme();

  const contactSupport = () => {
    Alert.alert(
      "Contact Support",
      "How would you like to reach out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Email Support",
          onPress: () => {
            Alert.alert(
              "Email Support",
              "Send your query to: support@markethub.com",
              [{ text: "OK" }]
            );
          }
        },
        {
          text: "Live Chat",
          onPress: () => {
            Alert.alert("Live Chat", "Chat feature coming soon!");
          }
        }
      ]
    );
  };

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: "Orders",
          headerRight: () => (
            <Pressable
              onPress={contactSupport}
              style={{ padding: 8 }}
            >
              <Feather name="headphones" size={24} color={theme.primary} />
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
            <Pressable
              onPress={contactSupport}
              style={{ padding: 8 }}
            >
              <Feather name="headphones" size={24} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="OrderDetailScreen"
        component={OrderDetailScreen}
        options={{
          title: "Orders Detail",
          headerRight: () => (
            <Pressable
              onPress={contactSupport}
              style={{ padding: 8 }}
            >
              <Feather name="headphones" size={24} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
    </Stack.Navigator>
  );
}