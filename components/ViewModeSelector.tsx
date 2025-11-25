// components/ViewModeSelector.tsx

import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

export type ViewMode = "grid" | "list" | "category";

interface ViewModeSelectorProps {
  selected: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ selected, onChange }: ViewModeSelectorProps) {
  const { theme } = useTheme();

  const modes: { key: ViewMode; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { key: "grid", icon: "grid", label: "Grid" },
    { key: "list", icon: "list", label: "List" },
    { key: "category", icon: "layers", label: "Category" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {modes.map((mode) => {
        const isSelected = selected === mode.key;
        return (
          <Pressable
            key={mode.key}
            style={[
              styles.button,
              {
                backgroundColor: isSelected ? theme.primary : "transparent",
              },
            ]}
            onPress={() => onChange(mode.key)}
          >
            <Feather
              name={mode.icon}
              size={18}
              color={isSelected ? "#fff" : theme.textSecondary}
            />
            <ThemedText
              type="caption"
              style={{
                marginLeft: 6,
                color: isSelected ? "#fff" : theme.textSecondary,
                fontWeight: isSelected ? "600" : "400",
              }}
            >
              {mode.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});