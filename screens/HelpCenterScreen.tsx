// screens/HelpCenterScreen.tsx

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";

// Enable LayoutAnimation on Android
if (Platform.OS === "android") {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function HelpCenterScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  // Track which FAQ is open (-1 = none)
  const [openIndex, setOpenIndex] = useState<number>(-1);

  const faqs = [
    {
      question: "How do I place an order?",
      answer:
        "Browse products → Tap 'Add to Cart' → Go to Cart → Review items → Tap 'Checkout' → Enter delivery address → Confirm payment.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major debit/credit cards, bank transfers, and wallet payments. All transactions are secure.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Delivery typically takes 1–3 hours within the same city/area. You’ll get real-time tracking updates.",
    },
    {
      question: "Can I cancel my order?",
      answer:
        "Yes! You can cancel before the seller acknowledges it. After that, contact support for assistance.",
    },
    {
      question: "How do I contact the seller?",
      answer:
        "Go to your order → Tap 'Contact Seller' → Chat directly or call using the provided number.",
    },
    {
      question: "What if I receive wrong or damaged items?",
      answer:
        "Open a dispute within 24 hours of delivery. Our team will investigate and resolve it quickly.",
    },
  ];

  const quickActions = [
    {
      icon: "message-circle",
      title: "Live Chat Support",
      subtitle: "Chat with us instantly",
      onPress: () => navigation.navigate("SupportChat"),
    },
    {
      icon: "phone",
      title: "Call Support",
      subtitle: "+234 814 000 2708",
      onPress: () => Linking.openURL("tel:+2349012345678"),
    },
    {
      icon: "mail",
      title: "Email Us",
      subtitle: "support@bubu.ng",
      onPress: () => Linking.openURL("mailto:support@bubu.africa"),
    },
    {
      icon: "shield",
      title: "Safety Center",
      subtitle: "Learn how we keep you safe",
      onPress: () =>
        Alert.alert("Safety Center", "Your safety is our priority. All sellers are verified."),
    },
  ];

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === index ? -1 : index);
  };

  const renderFAQ = (item: typeof faqs[0], index: number) => {
    const isOpen = openIndex === index;

    return (
      <Pressable
        key={index}
        onPress={() => toggleFAQ(index)}
        style={[
          styles.faqItem,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            borderBottomWidth: isOpen ? 0 : 1,
          },
        ]}
      >
        <View style={styles.faqQuestion}>
          <Feather name="help-circle" size={20} color={theme.primary} />
          <ThemedText
            weight="medium"
            style={{ marginLeft: Spacing.sm, flex: 1, marginRight: Spacing.sm }}
          >
            {item.question}
          </ThemedText>
          <Feather
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </View>

        {/* Collapsible Answer */}
        {isOpen && (
          <View style={styles.faqAnswer}>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, lineHeight: 22 }}
            >
              {item.answer}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  const renderQuickAction = (action: typeof quickActions[0]) => (
    <Pressable
      key={action.title}
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={action.onPress}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.primary + "15" }]}>
        <Feather name={action.icon as any} size={24} color={theme.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <ThemedText weight="medium">{action.title}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
          {action.subtitle}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h1">Help Center</ThemedText>
          <ThemedText type="h4" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            How can we help you today?
          </ThemedText>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Quick Support
          </ThemedText>
          {quickActions.map(renderQuickAction)}
        </View>

        {/* Search Bar */}
        <Pressable
          style={[
            styles.searchBar,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}
          onPress={() => Alert.alert("Search", "Search help articles coming soon!")}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <ThemedText type="caption" style={{ marginLeft: Spacing.md, color: theme.textSecondary }}>
            Search help articles...
          </ThemedText>
        </Pressable>

        {/* FAQ Section */}
        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            Frequently Asked Questions
          </ThemedText>
          {faqs.map(renderFAQ)}
        </View>

        {/* Still need help? */}
        <View
          style={[
            styles.needHelpCard,
            { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" },
          ]}
        >
          <Feather name="headphones" size={32} color={theme.primary} />
          <View style={{ marginLeft: Spacing.lg, flex: 1 }}>
            <ThemedText type="h4" style={{ color: theme.primary }}>
              Still need help?
            </ThemedText>
            <ThemedText type="caption" style={{ marginTop: Spacing.xs, color: theme.textSecondary }}>
              Our support team is available 24/7
            </ThemedText>
          </View>
          <Pressable
            style={[styles.chatButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("SupportChat")}
          >
            <Feather name="message-circle" size={20} color="#fff" />
            <ThemedText style={{ color: "#fff", marginLeft: Spacing.sm, fontWeight: "600" }}>
              Start Chat
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText
          type="caption"
          style={{ textAlign: "center", color: theme.textSecondary, marginTop: Spacing.xl }}
        >
          We usually respond within 2 minutes
        </ThemedText>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  faqItem: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: "#00000005",
  },
  faqAnswer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fafafa",
  },
  needHelpCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});