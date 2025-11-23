







import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// User type
export interface UserData {
  uid: string;
  email: string;
  role: "admin" | "seller" | "buyer";
  name: string;
  createdAt: number;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    role: "admin" | "seller" | "buyer",
    name: string
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => false,
  signUp: async () => false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // AUTH LISTENER
  // -------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const snap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (snap.exists()) {
        setUser(snap.data() as UserData);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // -------------------------
  // SIGN UP
  // -------------------------
  const signUp = async (
    email: string,
    password: string,
    role: "admin" | "seller" | "buyer",
    name: string
  ): Promise<boolean> => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      
      const userDoc: UserData = {
        uid: res.user.uid,
        email,
        role,
        name,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, "users", res.user.uid), userDoc);
      setUser(userDoc);

      return true;
    } catch (err) {
      console.log("SignUp error:", err);
      return false;
    }
  };

  // -------------------------
  // SIGN IN
  // -------------------------
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

  // -------------------------
  // SIGN OUT
  // -------------------------
  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  // -------------------------
  // PROVIDER EXPORT
  // -------------------------
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
