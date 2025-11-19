import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { firebaseService, User } from "@/utils/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, role: "admin" | "seller" | "buyer", name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await firebaseService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await firebaseService.signIn(email, password);
      if (user) {
        setUser(user);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error signing in:", error);
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: "admin" | "seller" | "buyer",
    name: string
  ): Promise<boolean> => {
    try {
      const user = await firebaseService.signUp(email, password, role, name);
      setUser(user);
      return true;
    } catch (error) {
      console.error("Error signing up:", error);
      return false;
    }
  };

  const signOut = async () => {
    try {
      await firebaseService.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
