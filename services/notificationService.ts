import { db } from "../lib/firebase";
import { emailService } from "../lib/resend";
import * as Notifications from 'expo-notifications';
import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export interface IncomingCallData {
  callId: string;
  bookingId: string;
  callerName: string;
  callerImage?: string;
  callerId: string;
  receiverId: string;
  createdAt: number;
  isEmergency?: boolean;
}

export const notificationService = {
  async clearPushToken(userId: string) {
    const ref = doc(db, "pushTokens", userId);
    return setDoc(ref, { token: null }, { merge: true });
  },

  async sendTrackingNotification(userId: string, orderId: string, status: string) {
    console.log(`Notification sent to user ${userId}: Order ${orderId} is now ${status}`);
    // Implement your push notification logic here
    // e.g., Firebase Cloud Messaging or Expo Push Notifications
  },

  async sendEmailNotification(
    email: string,
    template: "orderUpdate" | "dispute" | "welcome",
    data: any
  ) {
    try {
      switch (template) {
        case "welcome":
          await emailService.sendBuyerWelcomeEmail(email, data.name);
          break;
        case "orderUpdate":
          await emailService.sendOrderTrackingUpdate(email, data.name, data.orderId, data.status, data.message);
          break;
        case "dispute":
          await emailService.sendDisputeNotification(email, data.name, data.orderId);
          break;
      }
    } catch (e) {
      console.error("Email notification failed:", e);
    }
  },

  /**
   * Register for push notifications (call this on app start)
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return null;
      }

      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);
      
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  },

  /**
   * Save user's push token to Firestore
   */
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      await setDoc(doc(db, 'pushTokens', userId), {
        token,
        updatedAt: Date.now(),
      });
      console.log('✅ Push token saved for user:', userId);
    } catch (error) {
      console.error('❌ Failed to save push token:', error);
    }
  },

  /**
   * Send incoming call notification to another user
   * This creates a Firestore document that the other user listens to
   */
  async sendIncomingCallNotification(data: IncomingCallData): Promise<void> {
    try {
      console.log('📞 Sending incoming call notification to:', data.receiverId);
      
      // Store incoming call data in Firestore
      await setDoc(doc(db, 'incomingCalls', data.receiverId), {
        ...data,
        createdAt: Date.now(),
      });

      console.log('✅ Incoming call notification sent');
    } catch (error) {
      console.error('❌ Failed to send incoming call notification:', error);
    }
  },

  /**
   * Listen for incoming calls (call this when user logs in)
   * Returns unsubscribe function
   */
  listenForIncomingCalls(
    userId: string,
    // ✅ FIX: Update callback signature to accept null
    onIncomingCall: (callData: IncomingCallData | null) => void 
  ): () => void {
    console.log('👂 Listening for incoming calls for user:', userId);
    
    const unsubscribe = onSnapshot(
      doc(db, 'incomingCalls', userId),
      (snapshot) => {
        if (snapshot.exists()) {
          const callData = snapshot.data() as IncomingCallData;
          console.log('📞 Incoming call detected:', callData);
          onIncomingCall(callData);
        } else {
          // ✅ CRITICAL FIX: Explicitly send null when document is deleted/cleared
          console.log('🔇 Incoming call cleared from Firestore.');
          onIncomingCall(null);
        }
      },
      (error) => {
        console.error('❌ Error listening for incoming calls:', error);
      }
    );

    return unsubscribe;
  },

  /**
   * Clear incoming call notification (call after user joins or rejects)
   */
  async clearIncomingCall(userId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'incomingCalls', userId));
      console.log('✅ Incoming call cleared for user:', userId);
    } catch (error) {
      console.error('❌ Failed to clear incoming call:', error);
    }
  },

  /**
   * Send local notification (appears in notification tray)
   */
  async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
    }
  },
};