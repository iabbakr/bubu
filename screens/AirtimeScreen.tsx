// screens/AirtimeScreen.tsx
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
import { buyAirtime } from "@/lib/vtpass";
import { firebaseService } from "@/services/firebaseService";
import { ThemedText } from "@/components/ThemedText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Spacing, BorderRadius } from "@/constants/theme";

type Network = {
  id: string;
  name: string;
  serviceID: string;
  icon: string;
  color: string;
};

const NETWORKS: Network[] = [
  { id: "mtn", name: "MTN", serviceID: "mtn", icon: "📱", color: "#FFCC00" },
  { id: "glo", name: "Glo", serviceID: "glo", icon: "📱", color: "#00A95C" },
  { id: "airtel", name: "Airtel", serviceID: "airtel", icon: "📱", color: "#ED1C24" },
  { id: "9mobile", name: "9mobile", serviceID: "etisalat", icon: "📱", color: "#00A95F" },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
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

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    return cleaned.slice(0, 11);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhone(formatted);
    
    // Auto-detect network from phone prefix
    if (formatted.length >= 4) {
      const prefix = formatted.slice(0, 4);
      if (["0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906"].includes(prefix)) {
        setSelectedNetwork(NETWORKS[0]); // MTN
      } else if (["0805", "0807", "0811", "0815", "0905", "0907"].includes(prefix)) {
        setSelectedNetwork(NETWORKS[1]); // Glo
      } else if (["0802", "0808", "0812", "0901", "0902", "0904", "0907"].includes(prefix)) {
        setSelectedNetwork(NETWORKS[2]); // Airtel
      } else if (["0809", "0817", "0818", "0909"].includes(prefix)) {
        setSelectedNetwork(NETWORKS[3]); // 9mobile
      }
    }
  };

  const handleBuy = async () => {
    if (!user) {
      Alert.alert("Error", "Please sign in to continue");
      return;
    }

    if (!selectedNetwork) {
      Alert.alert("Error", "Please select a network");
      return;
    }

    if (!phone || phone.length !== 11) {
      Alert.alert("Error", "Please enter a valid 11-digit phone number");
      return;
    }

    const numAmount = Number(amount);
    if (!amount || numAmount < 50) {
      Alert.alert("Error", "Minimum amount is ₦50");
      return;
    }

    if (numAmount > 50000) {
      Alert.alert("Error", "Maximum amount is ₦50,000");
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
      `Buy ₦${numAmount} ${selectedNetwork.name} airtime for ${phone}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            try {
              // Deduct from wallet first
              await firebaseService.withdrawFromWallet(user.uid, numAmount);

              // Purchase airtime
              const res = await buyAirtime({
                serviceID: selectedNetwork.serviceID,
                phone,
                amount: numAmount,
              });

              if (res?.code === "000" || res?.content?.transactions?.status === "delivered") {
                Alert.alert(
                  "Success! 🎉",
                  `₦${numAmount} ${selectedNetwork.name} airtime sent to ${phone}`,
                  [{ text: "OK", onPress: () => {
                    setPhone("");
                    setAmount("");
                    loadWallet();
                  }}]
                );
              } else {
                // Refund if failed
                await firebaseService.addMoneyToWallet(
                  user.uid,
                  numAmount,
                  "Airtime refund"
                );
                throw new Error(res?.response_description || "Transaction failed");
              }
            } catch (err: any) {
              console.error("Airtime purchase error:", err);
              Alert.alert("Error", err.message || "Failed to purchase airtime. Please try again.");
              
              // Attempt refund on error
              try {
                await firebaseService.addMoneyToWallet(
                  user.uid,
                  numAmount,
                  "Airtime refund - Failed transaction"
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

  const renderNetworkCard = (network: Network) => {
    const isSelected = selectedNetwork?.id === network.id;
    
    return (
      <Pressable
        key={network.id}
        style={[
          styles.networkCard,
          {
            backgroundColor: isSelected ? network.color + "20" : theme.cardBackground,
            borderColor: isSelected ? network.color : theme.border,
            borderWidth: 2,
          }
        ]}
        onPress={() => setSelectedNetwork(network)}
      >
        <ThemedText style={{ fontSize: 32, marginBottom: 4 }}>
          {network.icon}
        </ThemedText>
        <ThemedText weight="medium" style={{ fontSize: 12 }}>
          {network.name}
        </ThemedText>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: network.color }]}>
            <Feather name="check" size={12} color="#fff" />
          </View>
        )}
      </Pressable>
    );
  };

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
        ₦{value}
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
          <Feather name="credit-card" size={32} color="#fff" style={{ opacity: 0.8 }} />
        </View>
      </View>

      {/* Network Selection */}
      <View style={styles.section}>
        <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
          Select Network
        </ThemedText>
        <View style={styles.networksGrid}>
          {NETWORKS.map(renderNetworkCard)}
        </View>
      </View>

      {/* Phone Number */}
      <View style={styles.section}>
        <ThemedText type="h3" style={{ marginBottom: Spacing.sm }}>
          Phone Number
        </ThemedText>
        <View style={[styles.inputContainer, { borderColor: theme.border }]}>
          <Feather name="phone" size={20} color={theme.textSecondary} />
          <TextInput
            placeholder="08012345678"
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={11}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
      </View>

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
          Minimum: ₦50 | Maximum: ₦50,000
        </ThemedText>
      </View>

      {/* Purchase Button */}
      <PrimaryButton
        title={loading ? "Processing..." : "Buy Airtime"}
        onPress={handleBuy}
        disabled={loading || !selectedNetwork || !phone || !amount}
        style={{ marginTop: Spacing.xl }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={{ marginTop: Spacing.md, color: theme.text }}>
            Processing your purchase...
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
     paddingTop: 100,

    flex: 1,
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
  networksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  networkCard: {
    width: "22%",
    aspectRatio: 1,
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