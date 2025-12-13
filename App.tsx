// App.tsx - FINAL 100% WORKING VERSION (Final Corrected Call)
import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { View, ActivityIndicator, StyleSheet } from "react-native";

// Firebase
import { db } from "./lib/firebase";
import { doc, getDoc } from "firebase/firestore";

// Components & Services
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
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
  shouldShowBanner: true, 
  shouldShowList: true,
  }),
});

function NavigationWithIncomingCalls() {
  const { user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    if (!user) {
      setIncomingCallData(null);
      soundManager.stop?.('ringtone');
      return;
    }

    // Register push token
    notificationService.registerForPushNotifications().then(token => {
      if (token) notificationService.savePushToken(user.uid, token);
    });

    // Firestore listener for incoming calls
    const unsubscribeFirestore = notificationService.listenForIncomingCalls(user.uid, async (data) => {
      if (data) {
        // Play sound and schedule local notification (for loud ringtone/alert)
        soundManager.play?.('ringtone', { loop: true }); 
        await Notifications.scheduleNotificationAsync({
          content: {
            title: data.isEmergency ? "EMERGENCY CALL!" : "Incoming Video Call",
            body: `${data.callerName} is calling you...`,
            sound: 'default',           
            vibrate: [0, 250, 250, 250],
            priority: Notifications.AndroidNotificationPriority.MAX,
            categoryIdentifier: 'CALL', 
          },
          trigger: null, // show immediately
        });
        setIncomingCallData(data);
       
      } else {
        // Call ended externally or was accepted/rejected by the system
        soundManager.stop?.('ringtone');
        setIncomingCallData(null);
      }
    });

    // Handle push notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;

      if (data?.type === 'incoming_call' && user) {
        try {
          const snap = await getDoc(doc(db, 'incomingCalls', user.uid));
          if (snap.exists()) {
            const callData = snap.data() as IncomingCallData;
            soundManager.play?.('ringtone', { loop: true });
            setIncomingCallData(callData);
          }
        } catch (err) {
          console.error('Push → incoming call error:', err);
        }
      }
    });

    return () => {
      unsubscribeFirestore();
      if (responseListener.current) {
        responseListener.current.remove();
      }
      soundManager.stop?.('ringtone');
    };
  }, [user]);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <MainTabNavigator />
      </NavigationContainer>

       {incomingCallData && user && (
        <IncomingCallModal
          callData={incomingCallData}
          navigation={navigationRef.current!} 
          userId={user.uid}                   
          // 🌟 FIX: Use the existing and correctly typed method clearIncomingCall
          onAccept={async (bookingId) => {
            soundManager.stop?.('ringtone');
            setIncomingCallData(null);
            // Crucial for RNCallKeep/native cleanup
            await notificationService.clearIncomingCall(user.uid); 
          }}
          // 🌟 FIX: Use the existing and correctly typed method clearIncomingCall
          onReject={async (bookingId) => {
            soundManager.stop?.('ringtone');
            setIncomingCallData(null);
            // Crucial for RNCallKeep/native cleanup
            await notificationService.clearIncomingCall(user.uid); 
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

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  // Initialize sound manager
  useEffect(() => {
    soundManager.init();
    return () => {
      soundManager.unload();
    };
  }, []);

  // Background tasks
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await professionalService.runBackgroundTasks();
      } catch (e) {
        console.warn('Background task failed:', e);
      }
    }, 30000);

    return () => clearInterval(interval);
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