import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { emailService } from "../lib/resend";

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
};
