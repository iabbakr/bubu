import React, { useEffect, useState } from "react";
import { View, StyleSheet, Switch, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { ScreenScrollView } from "../components/ScreenScrollView";
import { Spacing, BorderRadius } from "../constants/theme";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import * as Notifications from "expo-notifications";
import { notificationSettingsService }  from "../services/NotificationSettingsService";
import { pushNotificationService } from "../services/pushNotificationService";

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;

    const settings = await notificationSettingsService.getUserSettings(user.uid);
    setEnabled(settings.notificationsEnabled ?? true);
    setLoading(false);
  };

  const toggleNotifications = async (value: boolean) => {
    if (!user) return;

    setEnabled(value);

    if (value === true) {
      // Turning ON
      const token = await pushNotificationService.registerForPushNotifications(user.uid);
      if (!token) {
        Alert.alert("Permission Required", "Please enable notifications from device settings.");
        setEnabled(false);
        return;
      }
    } else {
      // Turning OFF
      await notificationSettingsService.clearPushToken(user.uid);
    }

    await notificationSettingsService.updateUserSettings(user.uid, {
      notificationsEnabled: value,
    });
  };

  return (
    <ScreenScrollView>
      <View style={styles.container}>
        <ThemedText type="h2" style={{ marginBottom: Spacing.xl }}>
          Notification Settings
        </ThemedText>

        <View
          style={[
            styles.row,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={styles.left}>
            <Feather name="bell" size={22} color={theme.primary} />
            <ThemedText style={{ marginLeft: Spacing.md }}>Push Notifications</ThemedText>
          </View>

          <Switch
            value={enabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: "#bbb", true: theme.primary }}
            thumbColor="#fff"
            disabled={loading}
          />
        </View>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
});
