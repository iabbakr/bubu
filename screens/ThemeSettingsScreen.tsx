import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { Spacing, BorderRadius } from "../constants/theme";
import { settingsService } from "../services/settingsService";
import i18n from "@/lib/i18n";

const themes = [
  { code: "light", label: i18n.t("light_mode") },
  { code: "dark", label: i18n.t("dark_mode") },
];

export default function ThemeSettingsScreen() {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState(isDark ? "dark" : "light");

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    if (!user) return;
    try {
      const settings = await settingsService.getUserSettings(user.uid);
      if (settings.theme) {
        setSelectedTheme(settings.theme);
        toggleTheme(settings.theme === "dark");
      }
    } catch (err) {
      console.error("Failed to load theme:", err);
    }
  };

  const selectTheme = async (code: string) => {
    if (!user) return;

    setSelectedTheme(code);
    toggleTheme(code === "dark");

    try {
      await settingsService.updateUserSettings(user.uid, { theme: code });
      Alert.alert("Success", `Theme changed to ${themes.find(t => t.code === code)?.label}`);
    } catch (err) {
      console.error("Failed to save theme:", err);
      Alert.alert("Error", "Failed to change theme.");
    }
  };

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.xl }}>
          Select Theme
        </ThemedText>

        {themes.map(t => (
          <Pressable
            key={t.code}
            onPress={() => selectTheme(t.code)}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: pressed ? theme.cardBackground + "80" : theme.cardBackground },
            ]}
          >
            <ThemedText style={{ flex: 1 }}>{t.label}</ThemedText>
            {selectedTheme === t.code && <ThemedText style={{ color: theme.primary }}>✓</ThemedText>}
          </Pressable>
        ))}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: Spacing.sm,
  },
});
