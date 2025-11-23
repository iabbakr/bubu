import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import SupermarketStackNavigator from "@/navigation/SupermarketStackNavigator";
import PharmacyStackNavigator from "@/navigation/PharmacyStackNavigator";
import ServicesStackNavigator from "@/navigation/ServicesStackNavigator";
import OrdersStackNavigator from "@/navigation/OrdersStackNavigator";


import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";

export type MainTabParamList = {
  SupermarketTab: undefined;
  PharmacyTab: undefined;
  ServicesTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="SupermarketTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="SupermarketTab"
        component={SupermarketStackNavigator}
        options={{
          title: "Supermarket",
          tabBarIcon: ({ color, size }) => (
            <Feather name="shopping-cart" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PharmacyTab"
        component={PharmacyStackNavigator}
        options={{
          title: "Pharmacy",
          tabBarIcon: ({ color, size }) => (
            <Feather name="heart" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesStackNavigator}
        options={{
          title: "Services",
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackNavigator}
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Feather name="package" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
