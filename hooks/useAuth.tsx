// hooks/useAuth.tsx (Updated AuthContext)
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { Location } from "../types/location";
import { soundManager } from "@/lib/soundManager";

// ✅ Enhanced UserRole to include all special roles
export type UserRole = 
  | "admin" 
  | "seller" 
  | "buyer"
  | "state_manager_1"
  | "state_manager_2"
  | "support_agent"
  | "professional";

export type ProfessionalType = 
  | "doctor" 
  | "pharmacist" 
  | "dentist" 
  | "lawyer";

// ✅ Enhanced UserData with all role-specific fields
export interface UserData {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  referralCode?: string;
  myReferralCode?: string;
  referredBy?: string;
  hasCompletedFirstPurchase?: boolean;
  hasCompletedBusinessProfile?: boolean;
  location?: Location;
  createdAt: number;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  sellerCategory?: "supermarket" | "pharmacy";
  referralBonus?: number;
  
  // ✅ NEW: Role-specific fields
  assignedState?: string;              // For state managers
  managerLevel?: 1 | 2;               // Manager level (I or II)
  professionalType?: ProfessionalType; // For professionals
  professionalLicense?: string;        // Professional license number
  specialization?: string;             // For doctors/dentists
  yearsOfExperience?: number;         // For professionals
  consultationFee?: number;           // For professionals
  availability?: string[];            // Available days for professionals
  isVerified?: boolean;               // Verification status for professionals
  isActive?: boolean;                 // Account active status
  assignedBy?: string;                // UID of admin who assigned role
  assignedAt?: number;                // Timestamp of role assignment
  permissions?: string[];             // Specific permissions array
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
    role: "admin" | "seller" | "buyer", // Only basic roles can be created via signup
    name: string,
    phone?: string,
    gender?: "male" | "female" | "other",
    referralCode?: string,
    location?: Location,
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
    role: "admin" | "seller" | "buyer",
    name: string,
    phone?: string,
    gender?: "male" | "female" | "other",
    referralCode?: string,
    location?: Location,
    sellerCategory?: "supermarket" | "pharmacy"
  ): Promise<boolean> => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const uid = res.user.uid;
      const myReferralCode = generateReferralCode();

      const newUser: UserData = {
        uid,
        email,
        role,
        name,
        myReferralCode,
        referralBonus: 0,
        hasCompletedFirstPurchase: false,
        hasCompletedBusinessProfile: role === "seller" ? false : true,
        isActive: true, // ✅ All new users are active
        createdAt: Date.now(),
      };

      if (phone && phone.trim()) newUser.phone = phone.trim();
      if (gender) newUser.gender = gender;
      if (referralCode && referralCode.trim()) newUser.referralCode = referralCode.trim();
      if (location) newUser.location = location;
      if (sellerCategory && role === "seller") newUser.sellerCategory = sellerCategory;

      // Referral handling
      let referrerId: string | null = null;
      if (referralCode && referralCode.trim()) {
        const usersSnap = await getDocs(collection(db, "users"));
        const referrer = usersSnap.docs
          .map((d) => d.data() as UserData)
          .find((u) => u.myReferralCode === referralCode.trim());

        if (referrer) {
          referrerId = referrer.uid;
          newUser.referredBy = referrerId;

          const refWalletSnap = await getDoc(doc(db, "wallets", referrer.uid));
          if (refWalletSnap.exists()) {
            const wallet = refWalletSnap.data();
            const amount = 500;
            const transactions = wallet.transactions || [];
            transactions.unshift({
              id: Date.now().toString(),
              type: "credit",
              amount,
              description: `Pending referral bonus from ${name} (Will be released after first purchase)`,
              timestamp: Date.now(),
              status: "pending",
            });

            await updateDoc(doc(db, "wallets", referrer.uid), {
              pendingBalance: (wallet.pendingBalance || 0) + amount,
              transactions,
            });
          }
        }
      }

      // Save user to Firestore
      await setDoc(doc(db, "users", uid), newUser);

      // Create wallet
      await setDoc(doc(db, "wallets", uid), {
        userId: uid,
        balance: 0,
        pendingBalance: 0,
        transactions: [],
      });

      setUser(newUser);
      await soundManager.play('signup');
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
      await soundManager.play('signin');
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

