// App.tsx - FINAL FIXED VERSION
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
import { soundManager } from "./lib/soundManager";
import { initI18n } from "./lib/i18n";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import { notificationService, IncomingCallData } from './services/notificationService';
import { IncomingCallModal } from './components/IncomingCallModal';
import { professionalService } from "@/services/professionalService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// ✅ NEW: Separate component that uses auth and theme contexts
function NavigationWithIncomingCalls() {
  const { user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);

  // Setup push notifications
  useEffect(() => {
    if (user) {
      pushNotificationService.registerForPushNotifications(user.uid);
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      soundManager.play('signin');
    });

    // 🎯 Fix 2 Applied Here: Explicitly typing the response for responseListener
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data: any = response.notification.request.content.data; // Explicitly type data as 'any'
        if (navigationRef.current) {
          pushNotificationService.handleNotificationTap(data, navigationRef.current);
        }
      }
    );

    return () => {
      notificationListener.current && Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current && Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [user]);

  // ✅ Listen for incoming video calls
  useEffect(() => {
    if (!user) return;

    console.log('👂 Setting up incoming call listener for:', user.uid);

    // 🎯 Fix 1 Applied Here: Renamed to 'listenForIncomingCalls'
    const unsubscribe = notificationService.listenForIncomingCalls(user.uid, (data) => {
        if (data) {
            setIncomingCallData(data); // Show the modal
        } else {
            setIncomingCallData(null); // Hide the modal
        }
    });

    return () => unsubscribe();
}, [user?.uid]);


  // ✅ Register push token
  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        await notificationService.savePushToken(user.uid, token);
        console.log('✅ Push notifications registered for user:', user.uid);
      }
    };

    setupNotifications();
  }, [user]);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <MainTabNavigator />
      </NavigationContainer>
      
      {/* ✅ Incoming Call Modal - Now inside all providers */}
      {incomingCallData && (
        <IncomingCallModal
          callData={incomingCallData}
          onAccept={() => {
            console.log('✅ Call accepted');
            setIncomingCallData(null);
          }}
          onReject={() => {
            console.log('❌ Call rejected');
            setIncomingCallData(null);
          }}
        />
      )}
    </>
  );
}

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <NavigationWithIncomingCalls />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  // Background tasks: emergency expiry, reminders, ready bookings
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await professionalService.runBackgroundTasks();
      } catch (error) {
        console.warn("Background task failed:", error);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

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
                  <ThemeProvider>
                    <AppContent />
                  </ThemeProvider>
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
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});