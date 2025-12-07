import { View, TextInput, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import React from "react";
// --- ASSUMED I18N IMPORT ---
import i18n from '@/lib/i18n'; 
// ---------------------------

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  // Use the translated placeholder text
  const placeholderText = i18n.t("search_products_placeholder");

  return (
    <View style={styles.container}>
      <Feather name="search" size={18} color="#555" />
      <TextInput
        style={styles.input}
        placeholder={placeholderText} // Translated string
        placeholderTextColor="#777"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  input: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
});