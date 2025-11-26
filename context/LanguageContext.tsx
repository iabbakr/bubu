// contexts/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import i18n, { setAppLanguage } from "../lib/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { AppState } from "react-native";  // ← ADD THIS LINE

type LanguageCode = "system" | "en" | "ha" | "yo" | "ig" | "pid";

type LanguageContextType = {
  locale: string;
  setLocale: (code: "system" | "en" | "ha" | "yo" | "ig" | "pid")=> Promise<void>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState(i18n.locale);

  // Inside LanguageProvider – ADD async here
const setLocale = async (code: "system" | "en" | "ha" | "yo" | "ig" | "pid") => {
  await setAppLanguage(code);
  setLocaleState(i18n.locale);
};

  // Optional: sync on app resume
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const saved = await AsyncStorage.getItem("appLanguage");
        const deviceLang = Localization.getLocales()[0]?.languageCode || "en";
        const expected = saved === "system" ? deviceLang : (saved || deviceLang);

        if (i18n.locale !== expected) {
          await setAppLanguage(saved || "system");
          setLocaleState(i18n.locale);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};