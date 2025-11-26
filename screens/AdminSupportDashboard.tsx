// screens/AdminSupportDashboard.tsx

import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "../components/ThemedText";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import {
  supportChatService,
  SupportChat,
} from "../services/supportChatService";
import { ProfileStackParamList } from "../navigation/ProfileStackNavigator";

type AdminSupportNavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  "AdminSupportDashboard"
>;

export default function AdminSupportDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<AdminSupportNavigationProp>();

  const [chats, setChats] = useState<SupportChat[]>([]);
  const [filteredChats, setFilteredChats] = useState<SupportChat[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "waiting" | "active" | "resolved"
  >("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeChats: 0,
    resolvedToday: 0,
    totalResolved: 0,
    averageRating: 0,
  });
  const [waitingCount, setWaitingCount] = useState(0);

  useEffect(() => {
    if (user?.role === "admin") {
      loadStats();

      const unsubscribeChats = supportChatService.listenToAllChats(
        (newChats) => {
          setChats(newChats);
          applyFilter(newChats, selectedFilter);
          setLoading(false);
          setRefreshing(false);
        }
      );

      const unsubscribeWaiting = supportChatService.listenToWaitingChats(
        (count) => {
          setWaitingCount(count);
        }
      );

      return () => {
        unsubscribeChats();
        unsubscribeWaiting();
      };
    }
  }, [user]);

  useEffect(() => {
    applyFilter(chats, selectedFilter);
  }, [selectedFilter, chats]);

  const loadStats = async () => {
    if (!user) return;
    try {
      const adminStats = await supportChatService.getAdminStats(user.uid);
      setStats(adminStats);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const applyFilter = (
    allChats: SupportChat[],
    filter: typeof selectedFilter
  ) => {
    if (filter === "all") {
      setFilteredChats(allChats);
    } else {
      setFilteredChats(allChats.filter((chat) => chat.status === filter));
    }
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
  };

  const handleAssignChat = async (chatId: string) => {
    if (!user) return;

    Alert.alert("Assign Chat", "Do you want to take this support chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Assign to Me",
        onPress: async () => {
          try {
            await supportChatService.assignChatToAdmin(
              chatId,
              user.uid,
              user.name
            );
            navigation.navigate("AdminSupportChat", { chatId });
          } catch (error) {
            Alert.alert("Error", "Failed to assign chat");
          }
        },
      },
    ]);
  };

  const renderStatCard = (
    icon: string,
    label: string,
    value: string | number,
    color: string
  ) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>
        {value}
      </ThemedText>
      <ThemedText
        type="caption"
        style={{ color: theme.textSecondary, marginTop: 2 }}
      >
        {label}
      </ThemedText>
    </View>
  );

  const renderFilterButton = (
    filter: typeof selectedFilter,
    label: string,
    count?: number
  ) => (
    <Pressable
      style={[
        styles.filterButton,
        {
          backgroundColor:
            selectedFilter === filter ? theme.primary : theme.cardBackground,
          borderColor:
            selectedFilter === filter ? theme.primary : theme.border,
        },
      ]}
      onPress={() => handleFilterChange(filter)}
    >
      <ThemedText
        weight="medium"
        style={{
          color: selectedFilter === filter ? "#fff" : theme.text,
          fontSize: 13,
        }}
      >
        {label}
        {count !== undefined && count > 0 && ` (${count})`}
      </ThemedText>
    </Pressable>
  );

  const renderChatItem = ({ item }: { item: SupportChat }) => {
    const statusColor =
      item.status === "waiting"
        ? theme.warning
        : item.status === "active"
        ? theme.success
        : theme.textSecondary;

    const isAssignedToMe = item.assignedAdminId === user?.uid;

    return (
      <Pressable
        style={[
          styles.chatCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
          item.unreadCount > 0 && {
            borderLeftWidth: 4,
            borderLeftColor: theme.primary,
          },
        ]}
        onPress={() => {
          if (item.status === "waiting") {
            handleAssignChat(item.id);
          } else {
            navigation.navigate("AdminSupportChat", { chatId: item.id });
          }
        }}
      >
        <View style={styles.chatHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText weight="medium" style={{ flex: 1 }}>
                {item.userName}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <ThemedText
                  type="caption"
                  weight="medium"
                  style={{ color: statusColor }}
                >
                  {item.status.toUpperCase()}
                </ThemedText>
              </View>
            </View>

            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {item.userRole} • {item.subject}
            </ThemedText>

            {item.lastMessage && (
              <ThemedText
                type="caption"
                numberOfLines={2}
                style={{
                  color: theme.textSecondary,
                  marginTop: Spacing.xs,
                }}
              >
                {item.lastMessage}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.chatFooter}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {item.status === "waiting" && item.queuePosition && (
              <>
                <Feather name="clock" size={14} color={theme.warning} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.warning, marginLeft: 4 }}
                >
                  Position {item.queuePosition}
                </ThemedText>
              </>
            )}

            {item.status === "active" && isAssignedToMe && (
              <>
                <Feather name="user-check" size={14} color={theme.success} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.success, marginLeft: 4 }}
                >
                  Assigned to you
                </ThemedText>
              </>
            )}

            {item.status === "active" &&
              !isAssignedToMe &&
              item.assignedAdminName && (
                <>
                  <Feather
                    name="user"
                    size={14}
                    color={theme.textSecondary}
                  />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginLeft: 4 }}
                  >
                    {item.assignedAdminName}
                  </ThemedText>
                </>
              )}
          </View>

          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {new Date(item.createdAt).toLocaleDateString()}
          </ThemedText>
        </View>

        {item.unreadCount > 0 && (
          <View
            style={[styles.unreadBadge, { backgroundColor: theme.primary }]}
          >
            <ThemedText
              type="caption"
              weight="medium"
              lightColor="#fff"
              darkColor="#fff"
            >
              {item.unreadCount}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ marginTop: Spacing.md }}>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Stats Section */}
      <View style={styles.statsContainer}>
        {renderStatCard(
          "message-circle",
          "Active Chats",
          stats.activeChats,
          theme.primary
        )}
        {renderStatCard(
          "check-circle",
          "Resolved Today",
          stats.resolvedToday,
          theme.success
        )}
        {renderStatCard(
          "star",
          "Avg Rating",
          stats.averageRating.toFixed(1),
          theme.warning
        )}
      </View>

      {/* Waiting Queue Alert */}
      {waitingCount > 0 && (
        <View
          style={[
            styles.queueAlert,
            {
              backgroundColor: theme.warning + "20",
              borderColor: theme.warning,
            },
          ]}
        >
          <Feather name="alert-circle" size={20} color={theme.warning} />
          <ThemedText
            weight="medium"
            style={{ marginLeft: Spacing.sm, flex: 1 }}
          >
            {waitingCount} user{waitingCount > 1 ? "s" : ""} waiting for
            support
          </ThemedText>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilterButton("all", "All", chats.length)}
        {renderFilterButton(
          "waiting",
          "Waiting",
          chats.filter((c) => c.status === "waiting").length
        )}
        {renderFilterButton(
          "active",
          "Active",
          chats.filter((c) => c.status === "active").length
        )}
        {renderFilterButton("resolved", "Resolved")}
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.chatList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{
                color: theme.textSecondary,
                marginTop: Spacing.md,
              }}
            >
              No chats found
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  queueAlert: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.md,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  filtersContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  chatList: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  chatCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    position: "relative",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.xs,
  },
  chatFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  unreadBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxxl,
  },
});