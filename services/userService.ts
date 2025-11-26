



import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, getDocs, updateDoc, collection, query, where } from "firebase/firestore";
import { emailService } from "../lib/resend";

export type UserRole = "admin" | "seller" | "buyer";

export interface Location {
  state: string;
  city: string;
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  referralCode?: string;
  location?: Location;
  sellerCategory?: "supermarket" | "pharmacy";
  createdAt: number;
}

export const userService = {
  // -----------------------------
  // AUTH
  // -----------------------------
  async signUp(
    email: string,
    password: string,
    role: UserRole,
    name: string,
    phone?: string,
    gender?: "male" | "female" | "other",
    referralCode?: string,
    location?: Location,
    sellerCategory?: "supermarket" | "pharmacy"
  ): Promise<User> {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const uid = res.user.uid;

    const user: User = {
      uid,
      email,
      role,
      name,
      createdAt: Date.now(),
    };

    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (referralCode) user.referralCode = referralCode.trim();
    if (location) user.location = location;

    await setDoc(doc(db, "users", uid), user);

    // Send welcome email
    try {
      if (role === "seller") {
        await emailService.sendSellerWelcomeEmail(email.trim(), name.trim());
      } else {
        await emailService.sendBuyerWelcomeEmail(email.trim(), name.trim());
      }
    } catch (e) {
      console.error("Failed to send welcome email:", e);
    }

    return user;
  },

  async signIn(email: string, password: string): Promise<User | null> {
    const res = await signInWithEmailAndPassword(auth, email, password);
    const uid = res.user.uid;
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  async signOut() {
    await signOut(auth);
  },

  async getCurrentUser(): Promise<User | null> {
    const user = auth.currentUser;
    if (!user) return null;

    const snap = await getDoc(doc(db, "users", user.uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  // -----------------------------
  // USER MANAGEMENT
  // -----------------------------
  async getAllUsers(): Promise<User[]> {
    const q = await getDocs(collection(db, "users"));
    return q.docs.map((doc) => doc.data() as User);
  },

  async updateUserInfo(
    userId: string,
    data: { name?: string; phone?: string; gender?: string; location?: Location }
  ): Promise<void> {
    const userRef = doc(db, "users", userId);
    const updateData: any = { updatedAt: Date.now() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.location !== undefined) updateData.location = data.location;

    await updateDoc(userRef, updateData);
  },

  async getUserSettings(userId: string) {
    const ref = doc(db, "userSettings", userId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : { notificationsEnabled: true };
  },

  async updateUserSettings(userId: string, settings: any) {
    const ref = doc(db, "userSettings", userId);
    return setDoc(ref, settings, { merge: true });
  },
};
