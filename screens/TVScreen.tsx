// screens/TVScreen.tsx
import React, { useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  // Add Spacing and BorderRadius imports if they are needed for styles
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import {
  getTVBouquets,
  verifySmartCard,
  buyTVSubscription,
  TVBouquet, // Import the TVBouquet type for better typing
} from "@/lib/vtpass"; // Make sure this path matches your file location
import { Spacing, BorderRadius } from "@/constants/theme"; // Assuming these are defined here

const providers = [
  { id: "dstv", name: "DSTV", color: "#E50914" },
  { id: "gotv", name: "GOTV", color: "#00A859" },
  { id: "startimes", name: "STARTIMES", color: "#FF6B00" },
] as const;

export default function TVScreen() {
  const { theme } = useTheme(); // Use destructuring to get theme

  const [serviceID, setServiceID] = useState<string>("dstv");
  const [smartCard, setSmartCard] = useState<string>("");
  // Use the imported TVBouquet type
  const [plans, setPlans] = useState<TVBouquet[]>([]); 
  const [selectedPlan, setSelectedPlan] = useState<TVBouquet | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [buying, setBuying] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");

  // Load Bouquets
  const loadPlans = async () => {
    // Only load if smartCard is provided
    if (!smartCard.trim()) {
        return Alert.alert("Input Required", "Please enter a Smartcard/IUC number before loading plans.");
    }
    
    // Check if plans are already loaded for the current serviceID
    // Note: The logic `serviceID === serviceID` in the original commented code was always true, 
    // so I removed the redundant `if (plans.length > 0 && serviceID === serviceID) return;` check here
    
    try {
      setLoadingPlans(true);
      const bouquets = await getTVBouquets(serviceID);
      setPlans(bouquets);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load bouquets");
    } finally {
      setLoadingPlans(false);
    }
  };

  // Verify Smartcard
  const handleVerify = async () => {
    if (!smartCard.trim()) {
      return Alert.alert("Invalid Input", "Enter Smartcard/IUC number");
    }

    try {
      setVerifying(true);
      setCustomerName(""); // Clear previous verification result
      const result = await verifySmartCard(serviceID, smartCard.trim());
      // VTpass returns either Customer_Name (PascalCase) or customer_name (snake_case)
      const name = result.Customer_Name || result.customer_name || "Verified User";
      setCustomerName(name);
      Alert.alert("Verified", `Customer: ${name}`);
    } catch (err: any) {
      setCustomerName("");
      Alert.alert("Verification Failed", err.message || "Invalid Smartcard");
    } finally {
      setVerifying(false);
    }
  };

  // Purchase Subscription
  const handlePurchase = async () => {
    if (!selectedPlan) return Alert.alert("Error", "Select a bouquet");
    if (!customerName) return Alert.alert("Verify First", "Please verify Smartcard");

    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Confirm Payment",
        `${selectedPlan.name}\n₦${Number(selectedPlan.variation_amount).toLocaleString()}\nSmartcard: ${smartCard}`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Pay Now", onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirm) return;

    try {
      setBuying(true);
      // NOTE: Assuming wallet deduction/transaction logic is handled outside this screen, 
      // as seen in Airtime/Data screen patterns. If this screen needs to handle wallet 
      // interaction like other screens, that logic needs to be added here.
      
      const res = await buyTVSubscription({
        serviceID,
        billersCode: smartCard.trim(),
        variation_code: selectedPlan.variation_code,
        amount: Number(selectedPlan.variation_amount),
        phone: "08000000000", // Placeholder phone number
      });

      if (res.code === "000" || res?.content?.transactions?.status === "delivered") {
        Alert.alert("Success! 🎉", "Subscription purchased successfully!");
        setSelectedPlan(null);
        setSmartCard("");
        setCustomerName("");
        // setPlans([]); // Keep plans loaded, just clear selections
      } else if (res.code === "021") {
        Alert.alert("Pending", "Processing... Check status later");
      } else {
        Alert.alert("Failed", res.response_description || "Transaction failed");
        // Refund logic (if applicable) should be implemented here
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Purchase failed. Try again.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ThemedText type="h1" style={styles.title}>
        TV Subscription
      </ThemedText>

      {/* Provider Selection */}
      <ThemedText type="h3" style={styles.label}>Select Provider</ThemedText>
      <View style={styles.providerRow}>
        {providers.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => {
              setServiceID(p.id);
              setPlans([]);
              setSelectedPlan(null);
              setCustomerName("");
            }}
            style={[
              styles.providerBtn,
              { borderColor: p.color + "50" }, // Use color for border for all states
              serviceID === p.id && { 
                backgroundColor: p.color, 
                borderColor: p.color
              },
            ]}
          >
            <ThemedText
              style={{
                color: serviceID === p.id ? "#fff" : theme.text,
                fontWeight: "bold",
              }}
            >
              {p.name}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Smartcard Input */}
      <ThemedText type="h3" style={styles.label}>Smartcard / IUC Number</ThemedText>
      <TextInput
        value={smartCard}
        onChangeText={setSmartCard}
        placeholder="e.g. 1234567890"
        keyboardType="numeric"
        style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
      />

      {/* Verify Button */}
      <Pressable
        style={[styles.verifyBtn, verifying && styles.disabledBtn]}
        onPress={handleVerify}
        disabled={verifying || smartCard.trim().length < 5}
      >
        {verifying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name="shield-check" size={22} color="#fff" />
            <ThemedText style={styles.btnText}>Verify Smartcard</ThemedText>
          </>
        )}
      </Pressable>

      {/* Verified Customer */}
      {customerName ? (
        <View style={[styles.verifiedBox, { backgroundColor: theme.primary + "10", borderColor: theme.primary }]}>
          <Feather name="check-circle" size={24} color={theme.primary} />
          <ThemedText style={{ marginLeft: 10, color: theme.primary, fontWeight: "600" }}>
            Verified: {customerName}
          </ThemedText>
        </View>
      ) : null}

      {/* Load Bouquets */}
      <Pressable
        style={[styles.loadBtn, loadingPlans && styles.disabledBtn, { backgroundColor: theme.accent }]}
        onPress={loadPlans}
        disabled={loadingPlans || !smartCard.trim() || !customerName}
      >
        {loadingPlans ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.btnText}>Load Bouquets</ThemedText>
        )}
      </Pressable>

      {/* Bouquets List */}
      {plans.length > 0 && (
        <>
          <ThemedText type="h3" style={styles.label}>Select Bouquet</ThemedText>
          {plans.map((plan) => (
            <Pressable
              // Use variation_code and name for a robust unique key
              key={`${plan.variation_code}-${plan.name.replace(/\s/g, '_')}`} 
              onPress={() => setSelectedPlan(plan)}
              style={[
                styles.planCard,
                { borderColor: theme.border, backgroundColor: theme.cardBackground },
                selectedPlan?.variation_code === plan.variation_code && {
                  borderColor: theme.primary,
                  borderWidth: 3,
                  backgroundColor: theme.primary + "15",
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText weight="bold" style={{ fontSize: 16 }}>{plan.name}</ThemedText>
                <ThemedText style={{ color: theme.textSecondary, marginTop: 4 }}>
                  Valid for {plan.validity || "30 days"}
                </ThemedText>
              </View>
              <ThemedText weight="bold" style={{ color: theme.primary, fontSize: 18 }}>
                ₦{Number(plan.variation_amount).toLocaleString()}
              </ThemedText>
            </Pressable>
          ))}
        </>
      )}
      
      {plans.length === 0 && !loadingPlans && customerName && (
          <View style={styles.emptyState}>
            <ThemedText style={{ color: theme.textSecondary }}>
                No bouquets loaded. Tap "Load Bouquets" above.
            </ThemedText>
          </View>
      )}


      {/* Buy Button */}
      {selectedPlan && customerName && (
        <Pressable
          style={[styles.buyBtn, buying && styles.disabledBtn, { backgroundColor: theme.primary }]}
          onPress={handlePurchase}
          disabled={buying}
        >
          {buying ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <ThemedText style={styles.buyText}>
              Pay ₦{Number(selectedPlan.variation_amount).toLocaleString()}
            </ThemedText>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop:100 },
  title: { marginBottom: 16 },
  label: { marginTop: Spacing.lg, marginBottom: Spacing.sm, fontWeight: "600" },
  providerRow: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" },
  providerBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    minWidth: 100,
    alignItems: "center",
  },
  input: {
    borderWidth: 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    fontSize: 16,
  },
  verifyBtn: {
    backgroundColor: "#10b981",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  loadBtn: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  disabledBtn: { opacity: 0.7 },
  verifiedBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    borderWidth: 1,
  },
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginBottom: Spacing.sm,
  },
  buyBtn: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    marginTop: Spacing.xl * 1.5,
  },
  buyText: { color: "#fff", fontWeight: "bold", fontSize: 20 },
  emptyState: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    borderStyle: "dashed",
    marginTop: Spacing.lg,
    alignItems: "center",
  }
});