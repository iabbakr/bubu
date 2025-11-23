import React, { useState, useEffect } from "react";
import { View, TextInput, Button, Alert, StyleSheet } from "react-native";
import { buyData, getDataPlans, DataPlan } from "@/lib/vtpass";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { Picker } from "@react-native-picker/picker";


export default function DataScreen() {
  const { theme } = useTheme();
  const [phone, setPhone] = useState("");
  const [serviceID, setServiceID] = useState("data"); // adjust if needed
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await getDataPlans(serviceID);
      setPlans(res);
      if (res.length) setSelectedPlan(res[0]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handleBuy = async () => {
    if (!phone || !selectedPlan) return Alert.alert("Error", "Enter phone and select a plan");
    setLoading(true);
    try {
      const res = await buyData({
        serviceID,
        billersCode: phone,
        variation_code: selectedPlan.variation_code,
        amount: Number(selectedPlan.variation_amount),
        phone,
      });
      Alert.alert("Success", res?.content?.response_description || "Data purchased successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedText type="h2">Buy Data</ThemedText>
      <TextInput
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />
      {plans.length > 0 && (
        <Picker
          selectedValue={selectedPlan?.variation_code}
          onValueChange={(value) => setSelectedPlan(plans.find(p => p.variation_code === value) || null)}
          style={{ color: theme.text }}
        >
          {plans.map(plan => (
            <Picker.Item
              key={plan.variation_code}
              label={`${plan.name} - ${plan.variation_amount}`}
              value={plan.variation_code}
            />
          ))}
        </Picker>
      )}
      <Button title={loading ? "Processing..." : "Buy Data"} onPress={handleBuy} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg },
  input: { borderWidth: 1, borderRadius: 8, padding: Spacing.md, marginVertical: Spacing.sm },
});
