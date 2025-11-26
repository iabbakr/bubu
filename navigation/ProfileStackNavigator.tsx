// navigation/ProfileStackNavigator.tsx

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import EditProductScreen from "@/screens/editProductScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import AuthScreen from "@/screens/AuthScreen";
import AccountInfoScreen from "@/screens/AccountInfoScreen";
import WalletScreen from "@/screens/WalletScreen";
import SellerDashboardScreen from "@/screens/SellerDashboardScreen";
import AdminPanelScreen from "@/screens/AdminPanelScreen";
import AddProductScreen from "@/screens/AddProductScreen";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import MyOrdersScreen from "@/screens/MyOrdersScreen";
import MyProductsScreen from "@/screens/MyProductsScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import ThemeSettingsScreen from "@/screens/ThemeSettingsScreen";
import SupportChatScreen from "@/screens/SupportChatScreen";
import AdminSupportDashboard from "@/screens/AdminSupportDashboard";
import AdminSupportChatScreen from "@/screens/AdminSupportChatScreen";
import { Product } from "../services/firebaseService";
import AdminDisputesScreen from "@/screens/AdminDisputeDashboard";
import { useNavigation } from "@react-navigation/native";
import { Pressable } from "react-native";

export type ProfileStackParamList = {
  Profile: undefined;
  Auth: undefined;
  AccountInfo: undefined;
  Wallet: undefined;
  SellerDashboard: undefined;
  AdminPanel: undefined;
  AddProduct: undefined;
  EditProduct: { product: Product };
  MyProducts: undefined;
  MyOrders: undefined;
  Theme: undefined;
  NotificationSetting: undefined;
  AdminDispute: { orderId: string };
  SupportChat: undefined;
  AdminSupportDashboard: undefined;
  AdminSupportChat: { chatId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      {user ? (
        <>
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: "Profile",
              headerRight: () => (
                <Pressable
                  onPress={() => navigation.navigate("SupportChat" as never)}
                  style={{ padding: 8 }}
                >
                  <Feather name="message-circle" size={24} color={theme.primary} />
                </Pressable>
              ),
            }}
          />
          <Stack.Screen
            name="AccountInfo"
            component={AccountInfoScreen}
            options={{
              title: "Account Information",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="Wallet"
            component={WalletScreen}
            options={{
              title: "My Wallet",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="SellerDashboard"
            component={SellerDashboardScreen}
            options={{
              title: "Seller Dashboard",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="AdminPanel"
            component={AdminPanelScreen}
            options={{
              title: "Admin Panel",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="AdminDispute"
            component={AdminDisputesScreen}
            options={{
              title: "Dispute Chat",
              headerBackTitle: "Back",
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
            name="AddProduct"
            component={AddProductScreen}
            options={{
              title: "Add Product",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="EditProduct"
            component={EditProductScreen}
            options={{
              title: "Edit Product",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="NotificationSetting"
            component={NotificationSettingsScreen}
            options={{ title: "Notification Settings", headerBackTitle: "Back" }}
          />
          <Stack.Screen
            name="MyOrders"
            component={MyOrdersScreen}
            options={{
              title: "My Orders",
              headerBackTitle: "Back",
            }}
          />
          <Stack.Screen
            name="Theme"
            component={ThemeSettingsScreen}
            options={{ title: "Theme Settings", headerBackTitle: "Back" }}
          />
          <Stack.Screen
            name="MyProducts"
            component={MyProductsScreen}
            options={{
              title: "My Products",
              headerBackTitle: "Back",
            }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{
            title: "Sign In",
            headerShown: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
}