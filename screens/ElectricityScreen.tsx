// screens/ElectricityScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { buyElectricity, verifyMeterNumber } from "@/lib/vtpass";
import { firebaseService } from "@/services/firebaseService";
import { ThemedText } from "@/components/ThemedText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Spacing, BorderRadius } from "@/constants/theme";

type Disco = {
  id: string;
  name: string;
  serviceID: string;
  icon: string;
  color: string;
};

const DISCOS: Disco[] = [
  { id: "ikeja", name: "Ikeja Electric", serviceID: "ikeja-electric", icon: "⚡", color: "#FF6B00" },
  { id: "eko", name: "Eko Electric", serviceID: "eko-electric", icon: "⚡", color: "#0066CC" },
  { id: "abuja", name: "Abuja Electric", serviceID: "abuja-electric", icon: "⚡", color: "#FFD700" },
  { id: "kano", name: "Kano Electric", serviceID: "kano-electric", icon: "⚡", color: "#00A86B" },
  { id: "portharcourt", name: "PH Electric", serviceID: "portharcourt-electric", icon: "⚡", color: "#8B4513" },
  { id: "ibadan", name: "Ibadan Electric", serviceID: "ibadan-electric", icon: "⚡", color: "#4B0082" },
  { id: "kaduna", name: "Kaduna Electric", serviceID: "kaduna-electric", icon: "⚡", color: "#DC143C" },
  { id: "jos", name: "Jos Electric", serviceID: "jos-electric", icon: "⚡", color: "#228B22" },
];

const QUICK_AMOUNTS = [1000, 2000, 3000, 5000, 10000, 20000];

export default function ElectricityScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [selectedDisco, setSelectedDisco] = useState<Disco | null>(null);
  const [meterNumber, setMeterNumber] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [amount, setAmount] = useState("");
  const [customer, setCustomer] = useState<{ Customer_Name: string; Address: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    loadWallet();
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    try {
      const wallet = await firebaseService.getWallet(user.uid);
      setWalletBalance(wallet.balance);
    } catch (error) {
      console.error("Error loading wallet:", error);
    }
  };

  const handleVerifyMeter = async () => {
    if (!selectedDisco) {
      Alert.alert("Error", "Please select a distribution company");
      return;
    }

    if (!meterNumber || meterNumber.length < 10) {
      Alert.alert("Error", "Please enter a valid meter number");
      return;
    }

    setVerifying(true);
    setCustomer(null);
    
    try {
      const res = await verifyMeterNumber({
        serviceID: selectedDisco.serviceID,
        billersCode: meterNumber,
      });
      
      setCustomer(res);
      Alert.alert("✅ Verified", `Meter belongs to ${res.Customer_Name}`);
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Unable to verify meter number. Please check and try again.");
      setCustomer(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleBuy = async () => {
    if (!user) {
      Alert.alert("Error", "Please sign in to continue");
      return;
    }

    if (!selectedDisco) {
      Alert.alert("Error", "Please select a distribution company");
      return;
    }

    if (!meterNumber) {
      Alert.alert("Error", "Please enter meter number");
      return;
    }

    if (!customer) {
      Alert.alert("Error", "Please verify meter number first");
      return;
    }

    const numAmount = Number(amount);
    if (!amount || numAmount < 500) {
      Alert.alert("Error", "Minimum amount is ₦500");
      return;
    }

    if (numAmount > 100000) {
      Alert.alert("Error", "Maximum amount is ₦100,000");
      return;
    }

    if (walletBalance < numAmount) {
      Alert.alert(
        "Insufficient Balance",
        `Your wallet balance is ₦${walletBalance.toFixed(2)}. Please fund your wallet first.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Fund Wallet", onPress: () => {/* Navigate to wallet */} }
        ]
      );
      return;
    }

    Alert.alert(
      "Confirm Purchase",
      `Buy ₦${numAmount} ${selectedDisco.name} ${meterType} token for meter ${meterNumber}?\n\nCustomer: ${customer.Customer_Name}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            try {
              // Deduct from wallet first
              await firebaseService.withdrawFromWallet(user.uid, numAmount);

              // Purchase electricity
              const res = await buyElectricity({
                serviceID: selectedDisco.serviceID,
                billersCode: meterNumber,
                variation_code: meterType,
                amount: numAmount,
                phone: meterNumber, // Some APIs require phone
              });

              if (res?.code === "000" || res?.content?.transactions?.status === "delivered") {
                const token = res?.purchased_code || res?.token || "N/A";
                const units = res?.units || "N/A";
                
                Alert.alert(
                  "Success! 🎉",
                  `Token: ${token}\nUnits: ${units}\n\nElectricity token has been sent to ${customer.Customer_Name}`,
                  [{ text: "OK", onPress: () => {
                    setMeterNumber("");
                    setAmount("");
                    setCustomer(null);
                    loadWallet();
                  }}]
                );
              } else {
                // Refund if failed
                await firebaseService.addMoneyToWallet(
                  user.uid,
                  numAmount,
                  "Electricity refund"
                );
                throw new Error(res?.response_description || "Transaction failed");
              }
            } catch (err: any) {
              console.error("Electricity purchase error:", err);
              Alert.alert("Error", err.message || "Failed to purchase electricity. Please try again.");
              
              // Attempt refund on error
              try {
                await firebaseService.addMoneyToWallet(
                  user.uid,
                  numAmount,
                  "Electricity refund - Failed transaction"
                );
              } catch (refundErr) {
                console.error("Refund error:", refundErr);
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderDiscoCard = (disco: Disco) => {
    const isSelected = selectedDisco?.id === disco.id;
    
    return (
      <Pressable
        key={disco.id}
        style={[
          styles.discoCard,
          {
            backgroundColor: isSelected ? disco.color + "20" : theme.cardBackground,
            borderColor: isSelected ? disco.color : theme.border,
            borderWidth: 2,
          }
        ]}
        onPress={() => {
          setSelectedDisco(disco);
          setCustomer(null); // Reset customer when changing disco
        }}
      >
        <ThemedText style={{ fontSize: 32, marginBottom: 4 }}>
          {disco.icon}
        </ThemedText>
        <ThemedText weight="medium" style={{ fontSize: 11, textAlign: "center" }}>
          {disco.name}
        </ThemedText>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: disco.color }]}>
            <Feather name="check" size={12} color="#fff" />
          </View>
        )}
      </Pressable>
    );
  };

  const renderMeterTypeOption = (type: "prepaid" | "postpaid", label: string) => (
    <Pressable
      key={type}
      style={[
        styles.meterTypeOption,
        {
          backgroundColor: meterType === type ? theme.primary : theme.cardBackground,
          borderColor: meterType === type ? theme.primary : theme.border,
        }
      ]}
      onPress={() => {
        setMeterType(type);
        setCustomer(null); // Reset customer when changing type
      }}
    >
      <ThemedText
        weight="medium"
        style={{
          color: meterType === type ? "#fff" : theme.text,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  const renderQuickAmount = (value: number) => (
    <Pressable
      key={value}
      style={[
        styles.quickAmount,
        {
          backgroundColor: amount === value.toString() ? theme.primary : theme.cardBackground,
          borderColor: amount === value.toString() ? theme.primary : theme.border,
        }
      ]}
      onPress={() => setAmount(value.toString())}
    >
      <ThemedText
        weight="medium"
        style={{
          color: amount === value.toString() ? "#fff" : theme.text,
          fontSize: 14,
        }}
      >
        ₦{value.toLocaleString()}
      </ThemedText>
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Wallet Balance */}
      <View style={[styles.walletCard, { backgroundColor: theme.primary }]}>
        <View style={styles.walletContent}>
          <View>
            <ThemedText style={{ color: "#fff", opacity: 0.9, fontSize: 14 }}>
              Wallet Balance
            </ThemedText>
            <ThemedText type="h2" style={{ color: "#fff", marginTop: 4 }}>
              ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </ThemedText>
          </View>
          <Feather name="zap" size={32} color="#fff" style={{ opacity: 0.8 }} />
        </View>
      </View>

      {/* Disco Selection */}
      <View style={styles.section}>
        <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
          Select Distribution Company
        </ThemedText>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.discosScroll}
        >
          {DISCOS.map(renderDiscoCard)}
        </ScrollView>
      </View>

      {/* Meter Type */}
      <View style={styles.section}>
        <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
          Meter Type
        </ThemedText>
        <View style={styles.meterTypeContainer}>
          {renderMeterTypeOption("prepaid", "Prepaid")}
          {renderMeterTypeOption("postpaid", "Postpaid")}
        </View>
      </View>

      {/* Meter Number */}
      <View style={styles.section}>
        <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
          Meter Number
        </ThemedText>
        <View style={[styles.inputContainer, { borderColor: theme.border }]}>
          <Feather name="hash" size={20} color={theme.textSecondary} />
          <TextInput
            placeholder="Enter meter number"
            placeholderTextColor={theme.textSecondary}
            value={meterNumber}
            onChangeText={(text) => {
              setMeterNumber(text);
              setCustomer(null);
            }}
            keyboardType="numeric"
            style={[styles.input, { color: theme.text }]}
          />
          <PrimaryButton
            title={verifying ? "..." : "Verify"}
            onPress={handleVerifyMeter}
            disabled={verifying || !selectedDisco || !meterNumber}
            style={styles.verifyButton}
          />
        </View>
      </View>

      {/* Customer Info */}
      {customer && (
        <View style={[styles.customerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.customerIconContainer, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="check-circle" size={24} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText weight="medium" style={{ fontSize: 16 }}>
              {customer.Customer_Name}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {customer.Address}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Amount Selection */}
      <View style={styles.section}>
        <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
          Amount
        </ThemedText>
        
        <View style={styles.quickAmountsGrid}>
          {QUICK_AMOUNTS.map(renderQuickAmount)}
        </View>

        <View style={[styles.inputContainer, { borderColor: theme.border, marginTop: Spacing.md }]}>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 18 }}>₦</ThemedText>
          <TextInput
            placeholder="Enter custom amount"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={[styles.input, { color: theme.text }]}
          />
        </View>
        
        <ThemedText type="caption" style={{ marginTop: Spacing.xs, color: theme.textSecondary }}>
          Minimum: ₦500 | Maximum: ₦100,000
        </ThemedText>
      </View>

      {/* Purchase Button */}
      <PrimaryButton
        title={loading ? "Processing..." : "Buy Electricity"}
        onPress={handleBuy}
        disabled={loading || !selectedDisco || !meterNumber || !customer || !amount}
        style={{ marginTop: Spacing.xl }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={{ marginTop: Spacing.md, color: "#fff" }}>
            Processing your purchase...
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  walletCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  walletContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  discosScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  discoCard: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  checkmark: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  meterTypeContainer: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  meterTypeOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  verifyButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minWidth: 70,
    marginBottom: 0,
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  customerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quickAmountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickAmount: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});