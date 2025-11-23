// components/LocationFilter.tsx

import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { getAllStates } from "../types/location";

interface LocationFilterProps {
  selectedState: string | null;
  onStateChange: (state: string | null) => void;
}

export function LocationFilter({ selectedState, onStateChange }: LocationFilterProps) {
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const states = ["All States", ...getAllStates()];

  const handleSelect = (state: string) => {
    onStateChange(state === "All States" ? null : state);
    setShowModal(false);
  };

  const displayText = selectedState || "All States";

  return (
    <>
      <Pressable
        style={[
          styles.filterButton,
          {
            backgroundColor: theme.backgroundSecondary,
            borderColor: theme.border,
          }
        ]}
        onPress={() => setShowModal(true)}
      >
        <Feather name="map-pin" size={18} color={theme.primary} />
        <ThemedText style={{ marginLeft: Spacing.sm, flex: 1 }}>
          {displayText}
        </ThemedText>
        <Feather name="chevron-down" size={18} color={theme.textSecondary} />
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Filter by State</ThemedText>
              <Pressable onPress={() => setShowModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.list}>
              {states.map((state) => {
                const isSelected = state === "All States" 
                  ? !selectedState 
                  : state === selectedState;

                return (
                  <Pressable
                    key={state}
                    style={[
                      styles.listItem,
                      {
                        backgroundColor: isSelected 
                          ? theme.primary + "20" 
                          : "transparent",
                        borderBottomColor: theme.border,
                      }
                    ]}
                    onPress={() => handleSelect(state)}
                  >
                    <ThemedText
                      style={{
                        color: isSelected ? theme.primary : theme.text,
                        fontWeight: isSelected ? "600" : "400",
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
    </>
  );
}

const styles = StyleSheet.create({
  filterButton: {
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
    borderBottomColor: "#e5e5e5",
  },
  list: {
    padding: Spacing.md,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
});