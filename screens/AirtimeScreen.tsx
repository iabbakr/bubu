import React, { useState } from "react";
import { View, TextInput, Button, Alert, StyleSheet } from "react-native";
import { buyAirtime } from "@/lib/vtpass";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export default function AirtimeScreen() {
  const { theme } = useTheme();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    if (!phone || !amount) return Alert.alert("Error", "Please enter phone and amount");
    setLoading(true);
    try {
      const res = await buyAirtime({ serviceID: "airtime", phone, amount: Number(amount) });
      Alert.alert("Success", res?.content?.response_description || "Airtime purchased successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText type="h2">Buy Airtime</ThemedText>
      <TextInput
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />
      <TextInput
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />
      <Button title={loading ? "Processing..." : "Buy Airtime"} onPress={handleBuy} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  input: { borderWidth: 1, borderRadius: 8, padding: Spacing.md, marginVertical: Spacing.sm },
});
