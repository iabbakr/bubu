// components/SupermarketHeader.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./ThemedText";
import { LocationFilterWithCity } from "./LocationFilterWithCity";
import { useTheme } from "../hooks/useTheme";
import { Spacing } from "../constants/theme";

interface Props {
  selectedState: string | null;
  selectedCity: string | null;
  onChange: (state: string | null, city: string | null) => void;
}

export const SupermarketHeader: React.FC<Props> = ({ selectedState, selectedCity, onChange }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="h2">SuperMarket</ThemedText>
      <LocationFilterWithCity
        selectedState={selectedState}
        selectedCity={selectedCity}
        onChange={onChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: Spacing.sm,
  },
});
