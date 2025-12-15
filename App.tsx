// App.tsx - CORRECT VERSION
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

// ✅ This component now has access to BOTH useAuth AND useTheme
function NavigationWithIncomingCalls() {
  const { user } = useAuth();
  const { isDark } = useTheme(); // ✅ Now works!
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<IncomingCallData | null>(null);

  useEffect(() => {
    if (!user) {
      setIncomingCallData(null);
      soundManager.stop?.('ringtone');
      return;
    }

    notificationService.registerForPushNotifications().then(token => {
      if (token) notificationService.savePushToken(user.uid, token);
    });

    const unsubscribeFirestore = notificationService.listenForIncomingCalls(user.uid, async (data) => {
      if (data) {
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
          trigger: null,
        });
        setIncomingCallData(data);
      } else {
        soundManager.stop?.('ringtone');
        setIncomingCallData(null);
      }
    });

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
          onAccept={async (bookingId) => {
            soundManager.stop?.('ringtone');
            setIncomingCallData(null);
            await notificationService.clearIncomingCall(user.uid); 
          }}
          onReject={async (bookingId) => {
            soundManager.stop?.('ringtone');
            setIncomingCallData(null);
            await notificationService.clearIncomingCall(user.uid); 
          }}
        />
      )}
      
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setIsI18nReady(true));
  }, []);

  useEffect(() => {
    soundManager.init();
    return () => {
      soundManager.unload();
    };
  }, []);

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
            <LanguageProvider>
              <AuthProvider>
                <CartProvider>
                  <ThemeProvider>
                    {/* ✅ NavigationWithIncomingCalls has access to ALL providers */}
                    <NavigationWithIncomingCalls />
                  </ThemeProvider>
                </CartProvider>
              </AuthProvider>
            </LanguageProvider>
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
