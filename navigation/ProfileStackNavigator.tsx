import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

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

export type ProfileStackParamList = {
  Profile: undefined;
  Auth: undefined;
  AccountInfo: undefined;
  Wallet: undefined;
  SellerDashboard: undefined;
  AdminPanel: undefined;
  AddProduct: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      {user ? (
        <>
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: "Profile",
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
            name="AddProduct"
            component={AddProductScreen}
            options={{ title: "Add Product",
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