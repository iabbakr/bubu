import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, TextInput, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { firebaseService, Wallet, Transaction } from "../services/firebaseService";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

// --- Custom Paystack WebView Component ---
interface PaystackWebViewCustomProps {
  amount: number;
  email: string;
  onSuccess: (res: any) => void;
  onCancel: () => void;
  paystackKey: string;
}

const PaystackWebViewCustom: React.FC<PaystackWebViewCustomProps> = ({
  amount,
  email,
  onSuccess,
  onCancel,
  paystackKey,
}) => {
  const htmlContent = `
    <html>
      <head>
        <script src="https://js.paystack.co/v1/inline.js"></script>
      </head>
      <body onload="initializePaystack()">
        <script>
          function initializePaystack() {
            const handler = PaystackPop.setup({
              key: '${paystackKey}',
              email: '${email}',
              amount: ${amount},
              onClose: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'cancelled' }));
              },
              callback: function(response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success', reference: response.reference }));
              }
            });
            handler.openIframe();
          }
        </script>
      </body>
    </html>
  `;

  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: htmlContent }}
      onMessage={(event) => {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.status === "success") onSuccess(data);
        else onCancel();
      }}
    />
  );
};

// --- Wallet Screen ---
export default function WalletScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [showPaystack, setShowPaystack] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const PAYSTACK_PUBLIC_KEY = "PK_8237192dacef1e46482a9d295a7acb2231b67ba9a62"; // Replace with your key

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

  const handleAddMoney = () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }
    if (amountNum < 100) {
      Alert.alert("Minimum Amount", "Minimum deposit is ₦100");
      return;
    }
    setShowAddMoney(false);
    setShowPaystack(true);
  };

  const handlePaystackSuccess = async (response: any) => {
    if (!user || !wallet) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return;

    try {
      const updatedWallet: Wallet = {
        ...wallet,
        balance: wallet.balance + amountNum,
        transactions: [
          {
            id: Date.now().toString(),
            type: "credit",
            amount: amountNum,
            description: `Deposit via Paystack - Ref: ${response.reference}`,
            timestamp: Date.now(),
          },
          ...wallet.transactions,
        ],
      };
      await firebaseService.updateWallet(updatedWallet);
      setWallet(updatedWallet);
      setShowPaystack(false);
      setAmount("");
      Alert.alert("Success", `₦${amountNum.toFixed(2)} added to your wallet`);
    } catch (error) {
      console.error("Error updating wallet:", error);
      Alert.alert("Error", "Failed to update wallet balance");
    }
  };

  const handleWithdraw = async () => {
    if (!user || !wallet) return;
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }
    if (amountNum > wallet.balance) {
      Alert.alert("Insufficient Funds", "You don't have enough balance");
      return;
    }
    if (amountNum < 1000) {
      Alert.alert("Minimum Withdrawal", "Minimum withdrawal is ₦1,000");
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
            try {
              const updatedWallet: Wallet = {
                ...wallet,
                balance: wallet.balance - amountNum,
                transactions: [
                  {
                    id: Date.now().toString(),
                    type: "debit",
                    amount: amountNum,
                    description: "Withdrawal to bank account",
                    timestamp: Date.now(),
                  },
                  ...wallet.transactions,
                ],
              };
              await firebaseService.updateWallet(updatedWallet);
              setWallet(updatedWallet);
              setShowWithdraw(false);
              setAmount("");
              Alert.alert(
                "Success",
                `₦${amountNum.toFixed(2)} withdrawal initiated. Funds will be transferred within 24 hours.`
              );
            } catch (error) {
              console.error("Error processing withdrawal:", error);
              Alert.alert("Error", "Failed to process withdrawal");
            }
          },
        },
      ]
    );
  };

  const renderTransaction = (transaction: Transaction) => {
    const isCredit = transaction.type === "credit";
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
              { backgroundColor: isCredit ? "#10b98120" : "#ef444420" },
            ]}
          >
            <Feather
              name={isCredit ? "arrow-down-left" : "arrow-up-right"}
              size={20}
              color={isCredit ? "#10b981" : "#ef4444"}
            />
          </View>
          <View style={styles.transactionDetails}>
            <ThemedText style={{ fontWeight: "600" }}>
              {isCredit ? "Money Added" : "Money Withdrawn"}
            </ThemedText>
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
            color: isCredit ? "#10b981" : "#ef4444",
            fontWeight: "700",
            fontSize: 16,
          }}
        >
          {isCredit ? "+" : "-"}₦{transaction.amount.toFixed(2)}
        </ThemedText>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenScrollView>
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ThemedText>Loading wallet...</ThemedText>
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
          {wallet.pendingBalance > 0 && (
            <View style={styles.pendingBalance}>
              <Feather name="clock" size={16} color="#fff" />
              <ThemedText type="caption" lightColor="#fff" darkColor="#fff" style={{ marginLeft: Spacing.xs, opacity: 0.9 }}>
                Pending: ₦{wallet.pendingBalance.toFixed(2)}
              </ThemedText>
            </View>
          )}
          <View style={styles.actionButtons}>
            <Pressable style={[styles.actionButton, { backgroundColor: "#fff" }]} onPress={() => setShowAddMoney(true)}>
              <Feather name="plus" size={20} color={theme.primary} />
              <ThemedText style={{ marginTop: Spacing.xs, color: theme.primary }}>Add Money</ThemedText>
            </Pressable>
            {user.role === "seller" && (
              <Pressable style={[styles.actionButton, { backgroundColor: "#fff" }]} onPress={() => setShowWithdraw(true)}>
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
            wallet.transactions.map(renderTransaction)
          )}
        </View>

        {/* Add Money Modal */}
        <Modal visible={showAddMoney} transparent animationType="slide" onRequestClose={() => setShowAddMoney(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">Add Money</ThemedText>
                <Pressable onPress={() => setShowAddMoney(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>
              <View style={[styles.inputContainer, { borderColor: theme.border }]}>
                <ThemedText type="h2">₦</ThemedText>
                <TextInput
                  style={[styles.amountInput, { color: theme.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              <PrimaryButton title="Continue to Payment" onPress={handleAddMoney} style={{ marginTop: Spacing.xl }} />
            </View>
          </View>
        </Modal>

        {/* Withdraw Modal */}
        <Modal visible={showWithdraw} transparent animationType="slide" onRequestClose={() => setShowWithdraw(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="h3">Withdraw Money</ThemedText>
                <Pressable onPress={() => setShowWithdraw(false)}>
                  <Feather name="x" size={24} color={theme.text} />
                </Pressable>
              </View>
              <View style={[styles.inputContainer, { borderColor: theme.border }]}>
                <ThemedText type="h2">₦</ThemedText>
                <TextInput
                  style={[styles.amountInput, { color: theme.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              <PrimaryButton title="Withdraw to Bank" onPress={handleWithdraw} style={{ marginTop: Spacing.xl }} />
            </View>
          </View>
        </Modal>

        {/* Paystack WebView Modal */}
        <Modal visible={showPaystack} animationType="slide">
          <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <PaystackWebViewCustom
              paystackKey={PAYSTACK_PUBLIC_KEY}
              amount={parseFloat(amount) * 100}
              email={user.email}
              onCancel={() => {
                setShowPaystack(false);
                Alert.alert("Cancelled", "Payment was cancelled");
              }}
              onSuccess={handlePaystackSuccess}
            />
          </View>
        </Modal>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: { padding: Spacing.xl, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl },
  balanceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pendingBalance: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm },
  actionButtons: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.xl },
  actionButton: { flex: 1, alignItems: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  transactionsSection: { marginBottom: Spacing.xl },
  transactionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
  transactionLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  transactionIcon: { width: 40, height: 40, borderRadius: BorderRadius.sm, justifyContent: "center", alignItems: "center" },
  transactionDetails: { marginLeft: Spacing.md, flex: 1 },
  emptyState: { alignItems: "center", padding: Spacing["3xl"], borderRadius: BorderRadius.md },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.lg, borderTopRightRadius: BorderRadius.lg, padding: Spacing.xl, minHeight: 300 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  inputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "700", marginLeft: Spacing.sm },
});
