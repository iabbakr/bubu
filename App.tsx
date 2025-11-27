import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { pushNotificationService } from "@/services/pushNotificationService";
import { LanguageProvider } from "./context/LanguageContext";
import { soundManager } from "./lib/soundManager";  // Correct path
import { initI18n } from "./lib/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // We use our own sounds
    shouldSetBadge: true,
  }),
});

function NavigationWithNotifications() {
  const { user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (user) {
      pushNotificationService.registerForPushNotifications(user.uid);
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      soundManager.play('signin'); // Optional: play sound when notification arrives
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (navigationRef.current) {
        pushNotificationService.handleNotificationTap(data, navigationRef.current);
      }
    });

    return () => {
      notificationListener.current && Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current && Notifications.removeNotificationSubscription(responseListener.current);
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

  // Initialize and cleanup sounds
  useEffect(() => {
    soundManager.init();

    return () => {
      soundManager.unload();
    };
  }, []);

  if (!isI18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0066CC" />
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
                  <StatusBar style="dark" />
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
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
});


