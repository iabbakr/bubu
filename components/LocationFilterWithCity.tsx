import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { getAllStates, getCitiesByState } from "../types/location";

interface Props {
  selectedState: string | null;
  selectedCity: string | null;
  onChange: (state: string | null, city: string | null) => void;
}

export function LocationFilterWithCity({
  selectedState,
  selectedCity,
  onChange
}: Props) {
  const { theme } = useTheme();

  const [step, setStep] = useState<"state" | "city" | null>(null);
  const [tempState, setTempState] = useState<string | null>(selectedState);
  const [tempCity, setTempCity] = useState<string | null>(selectedCity);

  const states = ["All States", ...getAllStates()];
  const cities = tempState && tempState !== "All States"
    ? getCitiesByState(tempState)
    : [];

  const openSelector = () => {
    setTempState(selectedState);
    setTempCity(selectedCity);
    setStep("state");
  };

  const confirmSelection = () => {
    const finalState = tempState === "All States" ? null : tempState;
    const finalCity = finalState ? tempCity : null;

    onChange(finalState, finalCity);
    setStep(null);
  };

  const display = selectedState
    ? selectedCity
      ? `${selectedState}, ${selectedCity}`
      : selectedState
    : "All Locations";

  return (
    <>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border
          }
        ]}
        onPress={openSelector}
      >
        <Feather name="map-pin" size={18} color={theme.primary} />
        <ThemedText style={{ marginLeft: Spacing.sm, flex: 1 }}>
          {display}
        </ThemedText>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      {/* STATE SELECT MODAL */}
      <Modal visible={step === "state"} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
              <ThemedText type="h3">Select State</ThemedText>
              <Pressable onPress={() => setStep(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.list}>
              {states.map((state) => {
                const isSelected =
                  state === "All States"
                    ? !tempState
                    : tempState === state;

                return (
                  <Pressable
                    key={state}
                    style={[
                      styles.item,
                      {
                        backgroundColor: isSelected
                          ? theme.primary + "20"
                          : "transparent",
                        borderBottomColor: theme.border
                      }
                    ]}
                    onPress={() => {
                      setTempState(state);
                      if (state === "All States") {
                        onChange(null, null);
                        setStep(null);
                      } else {
                        setStep("city");
                      }
                    }}
                  >
                    <ThemedText
                      style={{
                        color: isSelected ? theme.primary : theme.text,
                        fontWeight: isSelected ? "600" : "400"
                      }}
                    >
                      {state}
                    </ThemedText>
                    {isSelected && (
                      <Feather name="check" size={20} color={theme.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CITY SELECT MODAL */}
      <Modal visible={step === "city"} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
              <ThemedText type="h3">Select City</ThemedText>
              <Pressable onPress={() => setStep(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.list}>
              {cities.map((city) => {
                const isSelected = tempCity === city;
                return (
                  <Pressable
                    key={city}
                    style={[
                      styles.item,
                      {
                        backgroundColor: isSelected
                          ? theme.primary + "20"
                          : "transparent",
                        borderBottomColor: theme.border
                      }
                    ]}
                    onPress={() => setTempCity(city)}
                  >
                    <ThemedText
                      style={{
                        color: isSelected ? theme.primary : theme.text,
                        fontWeight: isSelected ? "600" : "400"
                      }}
                    >
                      {city}
                    </ThemedText>
                    {isSelected && (
                      <Feather name="check" size={20} color={theme.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={[styles.confirm, { backgroundColor: theme.primary }]}
              onPress={confirmSelection}
              disabled={!tempCity}
            >
              <ThemedText style={{ color: "#fff", textAlign: "center" }}>
                Confirm
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: "center"
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modal: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "70%"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.xl,
    borderBottomWidth: 1
  },
  list: {
    padding: Spacing.md
  },
  item: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
    borderRadius: BorderRadius.sm,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  confirm: {
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.md
  }
});
