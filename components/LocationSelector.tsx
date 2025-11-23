import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { getAllStates, getCitiesByState } from "../types/location";
import { Location } from "../types/location";

interface LocationSelectorProps {
  value: Location | null;
  onChange: (location: Location) => void;
  label?: string;
}

export function LocationSelector({ value, onChange, label }: LocationSelectorProps) {
  const { theme } = useTheme();
  const [selectedState, setSelectedState] = useState<string | null>(value?.state || null);
  const [selectedCity, setSelectedCity] = useState<string | null>(value?.city || null);
  const [showModal, setShowModal] = useState<"state" | "city" | null>(null);

  const states = getAllStates();
  const cities = selectedState ? getCitiesByState(selectedState) : [];

  useEffect(() => {
    if (selectedState && !cities.includes(selectedCity || "")) {
      setSelectedCity(null);
    }
  }, [selectedState]);

  const handleConfirmCity = () => {
    if (selectedState && selectedCity) {
      onChange({ state: selectedState, city: selectedCity });
      setShowModal(null);
    }
  };

  return (
    <View style={{ marginBottom: Spacing.md }}>
      {label && <ThemedText style={{ marginBottom: Spacing.sm }}>{label}</ThemedText>}

      <Pressable
        style={[styles.selectorButton, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
        onPress={() => setShowModal("state")}
      >
        <Feather name="map-pin" size={18} color={theme.primary} />
        <ThemedText style={{ marginLeft: Spacing.sm, flex: 1 }}>
          {selectedState && selectedCity ? `${selectedState}, ${selectedCity}` : "Select location"}
        </ThemedText>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      {/* STATE SELECTION */}
      <Modal visible={showModal === "state"} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Select State</ThemedText>
              <Pressable onPress={() => setShowModal(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.list}>
              {states.map((state) => (
                <Pressable
                  key={state}
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: state === selectedState ? theme.primary + "20" : "transparent",
                      borderBottomColor: theme.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedState(state);
                    setShowModal("city");
                  }}
                >
                  <ThemedText style={{ color: state === selectedState ? theme.primary : theme.text, fontWeight: state === selectedState ? "600" : "400" }}>
                    {state}
                  </ThemedText>
                  {state === selectedState && <Feather name="check" size={20} color={theme.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CITY SELECTION */}
      <Modal visible={showModal === "city"} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Select City</ThemedText>
              <Pressable onPress={() => setShowModal(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.list}>
              {cities.map((city) => (
                <Pressable
                  key={city}
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: city === selectedCity ? theme.primary + "20" : "transparent",
                      borderBottomColor: theme.border,
                    },
                  ]}
                  onPress={() => setSelectedCity(city)}
                >
                  <ThemedText style={{ color: city === selectedCity ? theme.primary : theme.text, fontWeight: city === selectedCity ? "600" : "400" }}>
                    {city}
                  </ThemedText>
                  {city === selectedCity && <Feather name="check" size={20} color={theme.primary} />}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: theme.primary }]}
              onPress={handleConfirmCity}
              disabled={!selectedCity}
            >
              <ThemedText style={{ color: "#fff", textAlign: "center" }}>Confirm</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  list: {
    padding: Spacing.md,
  },
  listItem: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmButton: {
    padding: Spacing.md,
    margin: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
