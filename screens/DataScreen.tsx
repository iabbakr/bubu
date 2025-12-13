import React, { useState, useEffect } from "react";
import { 
  View, 
  TextInput, 
  Alert, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image, // <-- Import Image
  ImageSourcePropType, // <-- Import ImageSourcePropType for typing
} from "react-native";
import { buyData, getDataPlans, DataPlan } from "@/lib/vtpass";
import { firebaseService } from "@/services/firebaseService";
import { ThemedText } from "@/components/ThemedText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

// 1. IMPORT IMAGE ASSETS
import airtel from "@/assets/icons/airtel.png";
import etisalat from "@/assets/icons/etisalat.png";
import glo from "@/assets/icons/glo.png";
import mtn from "@/assets/icons/mtn.png";

// Define a type for the network display data
type NetworkDisplay = {
    serviceID: string;
    name: string;
    icon: ImageSourcePropType;
    color: string;
};

// Define the networks using the imported images
const NETWORKS_DISPLAY: NetworkDisplay[] = [
    { serviceID: "mtn-data", name: "MTN", icon: mtn, color: "#FFCC00" }, 
    { serviceID: "glo-data", name: "Glo", icon: glo, color: "#00A95C" }, 
    { serviceID: "airtel-data", name: "Airtel", icon: airtel, color: "#ED1C24" }, 
    { serviceID: "etisalat-data", name: "9mobile", icon: etisalat, color: "#00A95F" }, 
];


export default function DataScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [phone, setPhone] = useState("");
  const [serviceID, setServiceID] = useState("mtn-data"); // Default to MTN
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [filterType, setFilterType] = useState<"all" | "daily" | "weekly" | "monthly">("all");

  useEffect(() => {
    loadWallet();
  }, [user]);

  useEffect(() => {
    fetchPlans();
  }, [serviceID]);

  const loadWallet = async () => {
    if (!user) return;
    try {
      const wallet = await firebaseService.getWallet(user.uid);
      setWalletBalance(wallet.balance);
    } catch (error) {
      console.error("Error loading wallet:", error);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    setSelectedPlan(null); // Clear selected plan on network change
    try {
      const res = await getDataPlans(serviceID);
      setPlans(res);
      // Select the first plan in the new list, or keep null if list is empty
      if (res.length) setSelectedPlan(res[0]); 
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to load data plans");
      setPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    return cleaned.slice(0, 11);
  };

  const filterPlans = () => {
    if (filterType === "all") return plans;
    
    return plans.filter(plan => {
      const name = plan.name.toLowerCase();
      
      if (filterType === "daily") {
        return name.includes("daily") || name.includes("day") || name.includes("1 day") || name.includes("24");
      } else if (filterType === "weekly") {
        return name.includes("weekly") || name.includes("week") || name.includes("7 days");
      } else if (filterType === "monthly") {
        return name.includes("monthly") || name.includes("month") || name.includes("30");
      }
      
      return true;
    });
  };

  const filteredPlans = filterPlans();

  const handleBuy = async () => {
    if (!user) {
      Alert.alert("Error", "Please sign in to continue");
      return;
    }

    if (!phone || phone.length !== 11) {
      Alert.alert("Error", "Please enter a valid 11-digit phone number");
      return;
    }

    if (!selectedPlan) {
      Alert.alert("Error", "Please select a data plan");
      return;
    }

    const amount = Number(selectedPlan.variation_amount);

    if (walletBalance < amount) {
      Alert.alert(
        "Insufficient Balance",
        `Your wallet balance is ₦${walletBalance.toFixed(2)}. Please fund your wallet first.`
      );
      return;
    }

    Alert.alert(
      "Confirm Purchase",
      `Buy ${selectedPlan.name} (₦${amount}) for ${phone}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            try {
              // Deduct from wallet first
              await firebaseService.withdrawFromWallet(user.uid, amount);

              // Purchase data
              const res = await buyData({
                serviceID,
                billersCode: phone,
                variation_code: selectedPlan.variation_code,
                amount,
                phone,
              });

              if (
                res?.code === "000" ||
                res?.content?.transactions?.status === "delivered"
              ) {
                Alert.alert(
                  "Success! 🎉",
                  res?.content?.response_description || "Data purchased successfully",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        setPhone("");
                        loadWallet();
                      },
                    },
                  ]
                );
              } else {
                // Refund if failed
                await firebaseService.addMoneyToWallet(user.uid, amount, "Data refund");
                throw new Error(
                  res?.response_description || "Transaction failed"
                );
              }
            } catch (err: any) {
              console.error("Data purchase error:", err);
              Alert.alert("Error", err.message || "Failed to purchase data");

              // Attempt refund on error
              try {
                await firebaseService.addMoneyToWallet(
                  user.uid,
                  amount,
                  "Data refund - Failed transaction"
                );
              } catch (refundErr) {
                console.error("Refund error:", refundErr);
              }
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // RENDER FUNCTION FOR NETWORK CARDS
  const renderNetworkCard = (network: NetworkDisplay) => {
    const isSelected = serviceID === network.serviceID;
    
    return (
      <Pressable
        key={network.serviceID}
        style={[
          styles.networkCard,
          {
            backgroundColor: isSelected ? network.color + "20" : theme.cardBackground,
            borderColor: isSelected ? network.color : theme.border,
          }
        ]}
        onPress={() => setServiceID(network.serviceID)}
      >
        {/* Replace ThemedText with Image */}
        <Image 
          source={network.icon} 
          style={styles.networkIcon} // Use the new style
          resizeMode="contain" 
        />
        <ThemedText weight="medium" style={{ fontSize: 14, marginTop: 4 }}>
            {network.name}
        </ThemedText>
        {isSelected && (
          <View style={[styles.checkBadge, { backgroundColor: network.color }]}>
            <Feather name="check" size={10} color="#fff" />
          </View>
        )}
      </Pressable>
    );
  };


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Wallet Balance Card */}
      <View style={[styles.walletCard, { backgroundColor: theme.primary }]}>
        <View style={styles.walletRow}>
          <View>
            <ThemedText style={styles.walletLabel}>Wallet Balance</ThemedText>
            <ThemedText type="h2" style={styles.walletAmount}>
              ₦{walletBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </ThemedText>
          </View>
          <Feather name="wifi" size={32} color="#fff" style={{ opacity: 0.8 }} />
        </View>
      </View>

      <ThemedText type="h2" style={{ marginBottom: Spacing.lg }}>
        Buy Data
      </ThemedText>

      {/* Network Selection */}
      <View style={styles.inputGroup}>
        <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
          Select Network
        </ThemedText>
        <View style={styles.networkGrid}>
          {NETWORKS_DISPLAY.map(renderNetworkCard)}
        </View>
      </View>

      {/* Phone Number Input */}
      <View style={styles.inputGroup}>
        <ThemedText weight="medium" style={{ marginBottom: Spacing.xs }}>
          Phone Number
        </ThemedText>
        <View style={[styles.inputContainer, { borderColor: theme.border }]}>
          <Feather name="phone" size={20} color={theme.textSecondary} />
          <TextInput
            placeholder="08012345678"
            placeholderTextColor={theme.textSecondary}
            value={phone}
            onChangeText={(text) => setPhone(formatPhoneNumber(text))}
            keyboardType="phone-pad"
            maxLength={11}
            style={[styles.input, { color: theme.text }]}
          />
        </View>
      </View>

      {/* Data Plans */}
      <View style={styles.inputGroup}>
        <ThemedText weight="medium" style={{ marginBottom: Spacing.sm }}>
          Select Data Plan
        </ThemedText>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <Pressable
            style={[
              styles.filterChip,
              {
                backgroundColor: filterType === "all" ? theme.primary : theme.cardBackground,
                borderColor: filterType === "all" ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setFilterType("all")}
          >
            <ThemedText
              weight="medium"
              style={{
                color: filterType === "all" ? "#fff" : theme.text,
                fontSize: 13,
              }}
            >
              All Plans
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              {
                backgroundColor: filterType === "daily" ? theme.primary : theme.cardBackground,
                borderColor: filterType === "daily" ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setFilterType("daily")}
          >
            <ThemedText
              weight="medium"
              style={{
                color: filterType === "daily" ? "#fff" : theme.text,
                fontSize: 13,
              }}
            >
              Daily
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              {
                backgroundColor: filterType === "weekly" ? theme.primary : theme.cardBackground,
                borderColor: filterType === "weekly" ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setFilterType("weekly")}
          >
            <ThemedText
              weight="medium"
              style={{
                color: filterType === "weekly" ? "#fff" : theme.text,
                fontSize: 13,
              }}
            >
              Weekly
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              {
                backgroundColor: filterType === "monthly" ? theme.primary : theme.cardBackground,
                borderColor: filterType === "monthly" ? theme.primary : theme.border,
              }
            ]}
            onPress={() => setFilterType("monthly")}
          >
            <ThemedText
              weight="medium"
              style={{
                color: filterType === "monthly" ? "#fff" : theme.text,
                fontSize: 13,
              }}
            >
              Monthly
            </ThemedText>
          </Pressable>
        </View>
        
        {loadingPlans ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText
              type="caption"
              style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}
            >
              Loading plans...
            </ThemedText>
          </View>
        ) : filteredPlans.length > 0 ? (
          <ScrollView 
            style={styles.plansScrollView}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {filteredPlans.map((plan) => (
              <Pressable
                // FIX APPLIED HERE: Combine variation_code with plan name for guaranteed uniqueness
                key={`${plan.variation_code}-${plan.name.replace(/\s/g, '_')}`} 
                style={[
                  styles.planOption,
                  {
                    backgroundColor: selectedPlan?.variation_code === plan.variation_code
                      ? theme.primary + "15"
                      : theme.cardBackground,
                    borderColor: selectedPlan?.variation_code === plan.variation_code
                      ? theme.primary
                      : theme.border,
                  }
                ]}
                onPress={() => setSelectedPlan(plan)}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText weight="medium" style={{ fontSize: 15 }}>
                    {plan.name}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 2 }}
                  >
                    Validity: Check with provider
                  </ThemedText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <ThemedText weight="medium" style={{ color: theme.primary, fontSize: 16 }}>
                    ₦{Number(plan.variation_amount).toLocaleString("en-NG")}
                  </ThemedText>
                  {selectedPlan?.variation_code === plan.variation_code && (
                    <View style={[styles.selectedBadge, { backgroundColor: theme.primary }]}>
                      <Feather name="check" size={12} color="#fff" />
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyState, { borderColor: theme.border }]}>
            <Feather name="alert-circle" size={32} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              {filterType === "all" 
                ? "No plans available for this network" 
                : `No ${filterType} plans available`}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Selected Plan Display */}
      {selectedPlan && (
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.primary + "10", borderColor: theme.primary },
          ]}
        >
          <Feather name="check-circle" size={24} color={theme.primary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <ThemedText weight="medium" style={{ fontSize: 15 }}>
              Selected: {selectedPlan.name}
            </ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary, marginTop: 4 }}>
              ₦{Number(selectedPlan.variation_amount).toLocaleString("en-NG")}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Purchase Button */}
      <PrimaryButton
        title={loading ? "Processing..." : "Buy Data"}
        onPress={handleBuy}
        disabled={loading || !phone || !selectedPlan || loadingPlans}
        style={{ marginTop: Spacing.xl }}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
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
  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: {
    color: "#fff",
    opacity: 0.9,
    fontSize: 14,
  },
  walletAmount: {
    color: "#fff",
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
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
  pickerContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  networkGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  networkCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    position: "relative",
  },
  // NEW STYLE FOR NETWORK IMAGE
  networkIcon: {
    width: 32, // Adjust size as needed
    height: 32, // Adjust size as needed
    marginBottom: 4,
  },
  checkBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  plansScrollView: {
    maxHeight: 300,
  },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    borderStyle: "dashed",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  filterContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
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