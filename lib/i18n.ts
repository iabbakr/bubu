// lib/i18n.ts (UPDATED)

import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 1. Import all language files
// Assuming your language files are in a directory called 'locales' next to this file.
import { en } from "../locales/en";
import { ha } from "../locales/ha";
import { yo } from "../locales/yo";
import { ig } from "../locales/ig";
import { pid } from "../locales/pid";

// 2. Assemble the translations object
export const translations = {
  en: en,
  ha: ha,
  yo: yo,
  ig: ig,
  pid: pid,
};

// 3. Initialize I18n with the assembled object
const i18n = new I18n(translations);

// Enable fallbacks (to English)
i18n.enableFallback = true;

//i18n.missingTranslation = () => ""; // Optional: hide warnings

// Global function to change language (used app-wide)
export const setAppLanguage = async (code: string) => {
  const deviceLang = Localization.getLocales()[0]?.languageCode || "en";
  const locale = code === "system" ? deviceLang : code;

  i18n.locale = locale;
  await AsyncStorage.setItem("appLanguage", code);
};

// Load saved language on startup
export const initI18n = async () => {
  try {
    const saved = await AsyncStorage.getItem("appLanguage");
    const deviceLang = Localization.getLocales()[0]?.languageCode || "en";

    if (saved && saved !== "system") {
      i18n.locale = saved;
    } else {
      i18n.locale = deviceLang;
    }
  } catch (e) {
    i18n.locale = "en";
  }
};

// Optional: Listen for real-time changes (e.g. from settings)
export const setupLanguageListener = (callback: () => void) => {
  // You can call this from App.tsx if needed
  // Or just rely on setAppLanguage
};

export default i18n;