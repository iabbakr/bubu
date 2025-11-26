// App.tsx
import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import  {pushNotificationService}  from "@/services/pushNotificationService";
import { LanguageProvider } from "./context/LanguageContext";
// App.tsx or root


// App.tsx ← Add these imports at the top


import { StyleSheet, AppState, View, ActivityIndicator } from "react-native";     // ← AppState + View + ActivityIndicator
import * as Localization from "expo-localization";                                 // ← Localization
import AsyncStorage from "@react-native-async-storage/async-storage";               // ← AsyncStorage
import i18n, { setAppLanguage, initI18n } from "./lib/i18n";                         // ← i18n (default export) + named exports


// Configure how notifications should behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function NavigationWithNotifications() {
  const { user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Properly typed refs with undefined as initial value
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (user) {
      pushNotificationService.registerForPushNotifications(user.uid);
    }

    // Listen for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
      // Optional: show in-app toast/banner here later
    });

    // Listen when user taps a notification (even when app is closed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (navigationRef.current) {
        pushNotificationService.handleNotificationTap(data, navigationRef.current);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  return (
    <NavigationContainer ref={navigationRef}>
      <MainTabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  if (!isI18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <KeyboardProvider>
            <AuthProvider>
              <CartProvider>
                <LanguageProvider>
                <NavigationWithNotifications />
                <StatusBar style="auto" />
                </LanguageProvider>
              </CartProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});