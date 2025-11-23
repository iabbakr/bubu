import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";

export type UserRole = "admin" | "seller" | "buyer";

export interface Location {
  state: string;
  city: string;
}

export interface UserData {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  referralCode?: string; // code used to sign up
  myReferralCode?: string; // user's unique code
  location?: Location; // added
  createdAt: number;
  sellerCategory?: "supermarket" | "pharmacy";
  referralBonus?: number; // total bonus earned
}

// Utility to generate a unique referral code
const generateReferralCode = (length = 6) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    name: string,
    phone?: string,
    gender?: "male" | "female" | "other",
    referralCode?: string,
    location?: Location, // added
    sellerCategory?: "supermarket" | "pharmacy"
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUser: (userData: UserData) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => false,
  signUp: async () => false,
  signOut: async () => {},
  updateUser: () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) setUser(snap.data() as UserData);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ------------------- SIGN UP -------------------
  const signUp = async (
    email: string,
  password: string,
  role: UserRole,
  name: string,
  phone?: string,
  gender?: "male" | "female" | "other",
  referralCode?: string,
  location?: Location,
  sellerCategory?: "supermarket" | "pharmacy" // new
  ): Promise<boolean> => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;

      const myReferralCode = generateReferralCode();

      // Build user object
      const newUser: UserData = {
  uid,
  email,
  role,
  name,
  myReferralCode,
  referralBonus: 0,
  createdAt: Date.now(),
};

if (phone && phone.trim()) newUser.phone = phone.trim();
if (gender) newUser.gender = gender;
if (referralCode && referralCode.trim()) newUser.referralCode = referralCode.trim();
if (location) newUser.location = location; // handle location

// ✅ Add sellerCategory if role is seller
if (sellerCategory && role === "seller") newUser.sellerCategory = sellerCategory;

// Save user
await setDoc(doc(db, "users", uid), newUser);
      // Create wallet
      await setDoc(doc(db, "wallets", uid), {
        userId: uid,
        balance: 0,
        pendingBalance: 0,
        transactions: [],
      });

      // Handle referral bonus
      if (referralCode && referralCode.trim()) {
        const usersSnap = await getDocs(collection(db, "users"));
        const referrer = usersSnap.docs
          .map((d) => d.data() as UserData)
          .find((u) => u.myReferralCode === referralCode.trim());

        if (referrer) {
          const refWalletSnap = await getDoc(doc(db, "wallets", referrer.uid));
          if (refWalletSnap.exists()) {
            const wallet = refWalletSnap.data();
            const amount = 500;
            const transactions = wallet.transactions || [];
            transactions.unshift({
              id: Date.now().toString(),
              type: "credit",
              amount,
              description: `Referral bonus from ${name}`,
              timestamp: Date.now(),
            });

            await updateDoc(doc(db, "wallets", referrer.uid), {
              balance: (wallet.balance || 0) + amount,
              transactions,
            });

            await updateDoc(doc(db, "users", referrer.uid), {
              referralBonus: (referrer.referralBonus || 0) + amount,
            });
          }
        }
      }

      setUser(newUser);
      return true;
    } catch (err) {
      console.error("SignUp error:", err);
      return false;
    }
  };

  // ------------------- SIGN IN -------------------
  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", res.user.uid));
      if (!snap.exists()) return false;
      setUser(snap.data() as UserData);
      return true;
    } catch (err) {
      console.log("SignIn error:", err);
      return false;
    }
  };

  // ------------------- SIGN OUT -------------------
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  // ------------------- UPDATE USER -------------------
  const updateUser = (userData: UserData) => setUser(userData);

  // ------------------- REFRESH USER -------------------
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (snap.exists()) setUser(snap.data() as UserData);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, updateUser, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
