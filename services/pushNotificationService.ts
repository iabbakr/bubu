// services/pushNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Constants from 'expo-constants'; // ← THIS IS CRITICAL

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  userId: string;
  token: string;
  platform: string;
  createdAt: number;
}

export const pushNotificationService = {
  async registerForPushNotifications(userId: string): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission required', 'Please enable notifications in settings');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;

      await setDoc(doc(db, 'pushTokens', userId), {
        userId,
        token,
        platform: Platform.OS,
        createdAt: Date.now(),
      }, { merge: true });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#667eea',
        });

        await Notifications.setNotificationChannelAsync('disputes', {
          name: 'Dispute Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9500',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  },

  async sendLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: null,
    });
  },

  async sendOrderTrackingNotification(
    userId: string,
    orderId: string,
    status: string,
    message: string
  ) {
    const tokenDoc = await getDoc(doc(db, 'pushTokens', userId));
    if (!tokenDoc.exists()) return;

    const { token } = tokenDoc.data();

    const statusEmoji = {
      acknowledged: 'Processing',
      enroute: 'In Transit',
      ready_for_pickup: 'Ready for Pickup',
      delivered: 'Delivered',
    }[status] || 'Update';

    const notification = {
      to: token,
      sound: 'default',
      title: `${statusEmoji} Order Update`,
      body: message,
      data: {
        screen: 'OrderDetailScreen',
        params: { orderId },
      },
      priority: 'high',
    };

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });
    } catch (error) {
      console.error('Error sending push:', error);
    }
  },

  async sendDisputeNotification(userId: string, orderId: string, message: string) {
    const tokenDoc = await getDoc(doc(db, 'pushTokens', userId));
    if (!tokenDoc.exists()) return;

    const { token } = tokenDoc.data();

    const notification = {
      to: token,
      sound: 'default',
      title: 'Dispute Update',
      body: message,
      data: {
        screen: 'DisputeChatScreen',
        params: { orderId },
      },
      priority: 'high',
    };

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });
    } catch (error) {
      console.error('Error sending dispute push:', error);
    }
  },

  // ADD THIS METHOD — THIS IS WHAT WAS MISSING!
  handleNotificationTap(data: any, navigation: any) {
    if (!navigation || !data?.screen) return;

    try {
      navigation.navigate(data.screen, data.params || {});
    } catch (error) {
      console.warn('Navigation failed:', error);
      navigation.navigate('HomeTab'); // fallback
    }
  },

  // Optional: keep old method for backward compatibility
  setupNotificationResponseListener(navigation: any) {
    return Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data, navigation);
    });
  },
};