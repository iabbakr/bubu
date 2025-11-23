import React, { useState } from "react";
import { View, TextInput, Button, Alert, StyleSheet } from "react-native";
import { buyElectricity, verifyMeterNumber } from "@/lib/vtpass";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { Picker } from "@react-native-picker/picker";


export default function ElectricityScreen() {
  const { theme } = useTheme();
  const [meter, setMeter] = useState("");
  const [serviceID, setServiceID] = useState("electricity"); // adjust if needed
  const [customer, setCustomer] = useState<{ Customer_Name: string; Address: string } | null>(null);
  const [variation, setVariation] = useState<"prepaid" | "postpaid">("prepaid");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!meter) return Alert.alert("Error", "Enter meter number");
    try {
      const res = await verifyMeterNumber({ serviceID, billersCode: meter });
      setCustomer(res);
    } catch (err: any) {
      Alert.alert("Error", err.message);
      setCustomer(null);
    }
  };

  const handleBuy = async () => {
    if (!meter || !amount) return Alert.alert("Error", "Enter meter and amount");
    setLoading(true);
    try {
      const res = await buyElectricity({
        serviceID,
        billersCode: meter,
        variation_code: variation,
        amount: Number(amount),
        phone: meter, // sometimes phone is required, adjust if needed
      });
      Alert.alert("Success", res?.content?.response_description || "Electricity purchased successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText type="h2">Buy Electricity</ThemedText>
      <TextInput
        placeholder="Meter Number"
        value={meter}
        onChangeText={setMeter}
        keyboardType="numeric"
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />
      <Button title="Verify Meter" onPress={handleVerify} />
      {customer && (
        <View style={{ marginVertical: Spacing.md }}>
          <ThemedText type="body">Customer: {customer.Customer_Name}</ThemedText>
          <ThemedText type="body">Address: {customer.Address}</ThemedText>
        </View>
      )}
      <Picker selectedValue={variation} onValueChange={v => setVariation(v)} style={{ color: theme.text }}>
        <Picker.Item label="Prepaid" value="prepaid" />
        <Picker.Item label="Postpaid" value="postpaid" />
      </Picker>
      <TextInput
        placeholder="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />
      <Button title={loading ? "Processing..." : "Buy Electricity"} onPress={handleBuy} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  input: { borderWidth: 1, borderRadius: 8, padding: Spacing.md, marginVertical: Spacing.sm },
});
