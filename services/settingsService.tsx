import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export const settingsService = {
  // Get user settings
  getUserSettings: async (uid: string) => {
    const ref = doc(db, "userSettings", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : {};
  },

  // Update user settings
  updateUserSettings: async (uid: string, settings: Record<string, any>) => {
    const ref = doc(db, "userSettings", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, settings);
    } else {
      await setDoc(ref, settings);
    }
  },
};
