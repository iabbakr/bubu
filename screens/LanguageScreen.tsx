import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, Platform, UIManager } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../lib/i18n"; // ← Your global i18n
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { setAppLanguage } from "../lib/i18n";


if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LANGUAGES = [
  { code: "system", label:"system", icon: "globe" },
  { code: "en", label:"english", flag: "gb" },
  { code: "ha", label: "hausa", flag: "ng" },
  { code: "yo", label:"yoruba", flag: "ng" },
  { code: "ig", label:"igbo", flag: "ng" },
  { code: "pid", label:"pidgin", flag: "ng" },
];

export default function LanguageScreen() {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<string>("system");

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    const saved = await AsyncStorage.getItem("appLanguage");
    setSelected(saved || "system");
  };

const changeLanguage = async (code: string) => {
  await setAppLanguage(code); // ← This updates i18n.locale globally
  setSelected(code);
  Alert.alert("Success", "saved");
};

  const t = (key: string) => i18n.t(key);

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="h2">{t("title")}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Select your preferred language
          </ThemedText>
        </View>

        <View style={styles.list}>
          {LANGUAGES.map((lang) => {
            const isSelected = selected === lang.code;
            const displayLabel = (lang.label);

            return (
              <Pressable
                key={lang.code}
                style={[
                  styles.item,
                  {
                    backgroundColor: theme.cardBackground,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => changeLanguage(lang.code)}
              >
                <View style={styles.left}>
                  {lang.code === "system" ? (
                    <View style={[styles.icon, { backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="globe" size={24} color={theme.primary} />
                    </View>
                  ) : (
                    <View style={[styles.flag, { backgroundColor: theme.backgroundSecondary }]}>
                      <ThemedText style={styles.flagText}>
                        {lang.flag?.toUpperCase() || ""}
                      </ThemedText>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <ThemedText weight="medium">{displayLabel}</ThemedText>
                    {lang.code !== "system" && (
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {i18n.t(lang.label, { locale: lang.code }) || displayLabel}
                      </ThemedText>
                    )}
                  </View>
                </View>

                {isSelected && <Feather name="check-circle" size={28} color={theme.primary} />}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.backgroundSecondary }]}>
  <Feather name="info" size={20} color={theme.textSecondary} />
  <ThemedText type="caption" style={{ marginLeft: Spacing.md, flex: 1, color: theme.textSecondary }}>
    {selected === "system"
      ? `Using device language: ${Localization.getLocales()[0]?.languageCode?.toUpperCase() || "EN"}`
      : `App language: ${
          {
            en: "English",
            ha: "Hausa",
            yo: "Yorùbá",
            ig: "Igbo",
            pid: "Pidgin English",
          }[selected as "en" | "ha" | "yo" | "ig" | "pid"] || selected.toUpperCase()
        }`}
  </ThemedText>
</View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  header: { marginBottom: Spacing.xl },
  list: { gap: Spacing.md, marginBottom: Spacing.xl },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1 },
  icon: { width: 48, height: 48, borderRadius: BorderRadius.sm, justifyContent: "center", alignItems: "center", marginRight: Spacing.md },
  flag: { width: 48, height: 48, borderRadius: BorderRadius.sm, justifyContent: "center", alignItems: "center", marginRight: Spacing.md },
  flagText: { fontSize: 14, fontWeight: "bold" },
  infoCard: { flexDirection: "row", padding: Spacing.lg, borderRadius: BorderRadius.md, alignItems: "center" },
});
