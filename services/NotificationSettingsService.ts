// services/notificationSettingsService.ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export const notificationSettingsService = {
  async getUserSettings(userId: string) {
    const ref = doc(db, "notificationSettings", userId);
    const snap = await getDoc(ref);

    // Default settings if none exists
    return snap.exists()
      ? snap.data()
      : { notificationsEnabled: true };
  },

  async updateUserSettings(userId: string, settings: any) {
    const ref = doc(db, "notificationSettings", userId);
    await setDoc(ref, settings, { merge: true });
  },

  async clearPushToken(userId: string) {
    const ref = doc(db, "pushTokens", userId);
    await setDoc(ref, { token: null }, { merge: true });
  },
};
