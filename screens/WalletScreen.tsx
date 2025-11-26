// screens/WalletScreen.tsx
import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, TextInput, Modal, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { Wallet, Transaction, firebaseService } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { initializePayment, verifyPayment, withdrawToBank } from "../lib/paystack";
import { WebView } from "react-native-webview";

export default function WalletScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [showBalance, setShowBalance] = useState(true);
  const [showPaystack, setShowPaystack] = useState(false);
  const [paystackData, setPaystackData] = useState<{ authorization_url: string; reference: string } | null>(null);

  useEffect(() => {
    loadWallet();
  }, [user]);

  const loadWallet = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await firebaseService.getWallet(user.uid);
      setWallet(data);
    } catch (error) {
      console.error("Error loading wallet:", error);
      Alert.alert("Error", "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Add Money ----------
  const handleAddMoney = async () => {
    if (!user) return;
    
    const amountNum = parseFloat(amount);
    
    if (isProcessing) return;
    
    if (isNaN(amountNum) || amountNum < 100) {
      Alert.alert("Invalid Amount", "Minimum deposit is ₦100");
      return;
    }

    setIsProcessing(true);
    
    try {
      const payment = await initializePayment(user.email, amountNum);
      setPaystackData({ authorization_url: payment.authorization_url, reference: payment.reference });
      setShowPaystack(true);
    } catch (err: any) {
      console.error("Payment initialization error:", err);
      Alert.alert("Error", err.message || "Payment initialization failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaystackNavigation = async (navState: any) => {
    const url = navState.url;
    
    if (!paystackData || !user) return;

    const isSuccess = url.includes("status=success") || 
                      url.includes("trxref=") || 
                      url.includes("payment-callback");
    
    if (isSuccess) {
      setShowPaystack(false);
      setIsProcessing(true);
      
      try {
        const verification = await verifyPayment(paystackData.reference, user.uid);
        if (verification.success) {
          Alert.alert("Success", `₦${parseFloat(amount).toFixed(2)} added to wallet`);
          setShowAddMoney(false);
          setAmount("");
          loadWallet();
        } else {
          Alert.alert("Failed", verification.message);
        }
      } catch (err: any) {
        console.error("Payment verification error:", err);
        Alert.alert("Error", err.message || "Payment verification failed");
      } finally {
        setIsProcessing(false);
      }
    } else if (url.includes("status=cancelled") || url.includes("status=failed")) {
      setShowPaystack(false);
      Alert.alert("Payment Cancelled", "The payment was not completed.");
    }
  };

  // ---------- Withdraw ----------
  const handleWithdraw = async () => {
    if (!user || !wallet) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1000) {
      Alert.alert("Invalid Amount", "Minimum withdrawal is ₦1,000");
      return;
    }
    if (amountNum > wallet.balance) {
      Alert.alert("Insufficient Funds", "You don't have enough balance");
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw ₦${amountNum.toFixed(2)} to your bank account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await withdrawToBank(user.uid, amountNum);
              Alert.alert("Success", `₦${amountNum.toFixed(2)} withdrawn successfully`);
              setShowWithdraw(false);
              setAmount("");
              loadWallet();
            } catch (err: any) {
              console.error("Withdrawal error:", err);
              Alert.alert("Error", err.message || "Withdrawal failed");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  // ---------- Render Transaction ----------
  const renderTransaction = (transaction: Transaction) => {
    let color = theme.text;
    let bgColor = theme.cardBackground + "20";
    let label = "";

    if (transaction.type === "credit") {
      if (transaction.status === "pending") {
        color = "#facc15"; // yellow
        bgColor = "#facc1520";
        label = "Pending Deposit";
      } else {
        color = "#10b981"; // green
        bgColor = "#10b98120";
        label = "Money Added";
      }
    } else if (transaction.type === "debit") {
      if (transaction.status === "pending") {
        color = "#facc15"; // yellow
        bgColor = "#facc1520";
        label = "Pending Withdrawal";
      } else {
        color = "#ef4444"; // red
        bgColor = "#ef444420";
        label = "Money Withdrawn";
      }
    }

    return (
      <View
        key={transaction.id}
        style={[
          styles.transactionItem,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <View style={styles.transactionLeft}>
          <View
            style={[
              styles.transactionIcon,
              { backgroundColor: bgColor },
            ]}
          >
            <Feather
              name={transaction.type === "credit" ? "arrow-down-left" : "arrow-up-right"}
              size={20}
              color={color}
            />
          </View>
          <View style={styles.transactionDetails}>
            <ThemedText style={{ fontWeight: "600" }}>{label}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {transaction.description}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {new Date(transaction.timestamp).toLocaleString()}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          style={{
            color,
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toFixed(2)}
        </ThemedText>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenScrollView>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={{ marginTop: Spacing.md }}>Loading wallet...</ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  if (!user || !wallet) {
    return (
      <ScreenScrollView>
        <View style={styles.container}>
          <ThemedText>Please sign in to view your wallet</ThemedText>
        </View>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Wallet Balance */}
        <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
          <View style={styles.balanceHeader}>
            <ThemedText type="h4" lightColor="#fff" darkColor="#fff">
              Available Balance
            </ThemedText>
            <Feather
              name={showBalance ? "eye" : "eye-off"}
              size={20}
              color="#fff"
              onPress={() => setShowBalance(!showBalance)}
            />
          </View>
          <ThemedText type="h1" lightColor="#fff" darkColor="#fff" style={{ marginTop: Spacing.md, fontSize: 36 }}>
            {showBalance ? `₦${wallet.balance.toFixed(2)}` : "****"}
          </ThemedText>
          <View style={{ marginTop: 10 }}>
            <ThemedText lightColor="#fff" darkColor="#fff" style={{ opacity: 0.8 }}>
              Pending Balance
            </ThemedText>
            <ThemedText
              lightColor="#fff"
              darkColor="#fff"
              style={{ fontSize: 15, fontWeight: "600", marginTop: 4 }}
            >
              {showBalance ? `₦${wallet.pendingBalance.toFixed(2)}` : "****"}
            </ThemedText>
          </View>

          <View style={styles.actionButtons}>
            <Pressable 
              style={[styles.actionButton, { backgroundColor: "#fff" }]} 
              onPress={() => setShowAddMoney(true)}
              disabled={isProcessing}
            >
              <Feather name="plus" size={20} color={theme.primary} />
              <ThemedText style={{ marginTop: Spacing.xs, color: theme.primary }}>Add Money</ThemedText>
            </Pressable>
            {user.role === "seller" && (
              <Pressable 
                style={[styles.actionButton, { backgroundColor: "#fff" }]} 
                onPress={() => setShowWithdraw(true)}
                disabled={isProcessing}
              >
                <Feather name="download" size={20} color={theme.primary} />
                <ThemedText style={{ marginTop: Spacing.xs, color: theme.primary }}>Withdraw</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>Transaction History</ThemedText>
          {wallet.transactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="inbox" size={48} color={theme.textSecondary} />
              <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>No transactions yet</ThemedText>
            </View>
          ) : (
            wallet.transactions
              .sort((a, b) => b.timestamp - a.timestamp)
              .map(renderTransaction)
          )}
        </View>

        {/* Add Money, Paystack WebView, and Withdraw Modals remain unchanged */}
        {/* ...keep your existing modal code here */}
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: { padding: Spacing.xl, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl },
  balanceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actionButtons: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xl },
  actionButton: { flex: 1, alignItems: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  transactionsSection: { marginBottom: Spacing.xl },
  transactionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
  transactionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  transactionIcon: { width: 40, height: 40, borderRadius: BorderRadius.sm, justifyContent: "center", alignItems: "center" },
  transactionDetails: { marginLeft: Spacing.md, flex: 1 },
  emptyState: { alignItems: "center", padding: Spacing["3xl"], borderRadius: BorderRadius.md },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.xl, minHeight: 300 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "700", marginLeft: Spacing.sm },
  webViewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1 },
});
