// screens/AdminRoleManagement.tsx
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Spacing, BorderRadius } from "../constants/theme";
import { roleManagementService } from "../services/roleManagementService";
import { firebaseService, User as FirebaseUser } from "../services/firebaseService";
import {
  UserRole,
  ProfessionalType,
  ROLE_LABELS,
  PROFESSIONAL_LABELS,
} from "../types/user";
import { getAllStates } from "../types/location";

type User = FirebaseUser;

interface RoleAssignmentModal {
  visible: boolean;
  user: FirebaseUser | null;
  selectedRole: UserRole | null;
  selectedState: string;
  selectedProfessionalType: ProfessionalType | null;
  professionalLicense: string;
  specialization: string;
  reason: string;
}

export default function AdminRoleManagement() {
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [specialRoleUsers, setSpecialRoleUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<FirebaseUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "special_roles">("all");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<RoleAssignmentModal>({
    visible: false,
    user: null,
    selectedRole: null,
    selectedState: "",
    selectedProfessionalType: null,
    professionalLicense: "",
    specialization: "",
    reason: "",
  });

  const states = getAllStates();
  const availableRoles: UserRole[] = [
    "state_manager_1",
    "state_manager_2",
    "support_agent",
    "professional",
  ];

  useEffect(() => {
    if (currentUser?.role === "admin") {
      loadUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedFilter, users, specialRoleUsers]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const allUsers = await firebaseService.getAllUsers();
      
      let specialUsers: User[] = [];
      try {
        specialUsers = await roleManagementService.getSpecialRoleUsers();
      } catch (error) {
        console.error("Error loading special role users:", error);
        const specialRoles: UserRole[] = [
          "state_manager_1",
          "state_manager_2",
          "support_agent",
          "professional",
        ];
        specialUsers = allUsers.filter((u) => specialRoles.includes(u.role));
      }
      
      setUsers(allUsers);
      setSpecialRoleUsers(specialUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert("Error", "Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (selectedFilter === "special_roles") {
      const specialIds = specialRoleUsers.map((u) => u.uid);
      filtered = users.filter((u) => specialIds.includes(u.uid));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          ROLE_LABELS[u.role].toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const openAssignModal = (user: FirebaseUser) => {
    setModal({
      visible: true,
      user,
      selectedRole: null,
      selectedState: "",
      selectedProfessionalType: null,
      professionalLicense: "",
      specialization: "",
      reason: "",
    });
  };

  const closeModal = () => {
    setModal({
      visible: false,
      user: null,
      selectedRole: null,
      selectedState: "",
      selectedProfessionalType: null,
      professionalLicense: "",
      specialization: "",
      reason: "",
    });
  };

  const handleAssignRole = async () => {
    if (!modal.user || !modal.selectedRole || !currentUser) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    // Validate state for state managers
    if (
      (modal.selectedRole === "state_manager_1" ||
        modal.selectedRole === "state_manager_2") &&
      !modal.selectedState
    ) {
      Alert.alert("Error", "Please select a state");
      return;
    }

    // Validate professional type
    if (modal.selectedRole === "professional" && !modal.selectedProfessionalType) {
      Alert.alert("Error", "Please select a professional type");
      return;
    }

    try {
      await roleManagementService.assignRole(
        currentUser.uid,
        modal.user.uid,
        modal.selectedRole,
        {
          // Only pass values that are actually set
          ...(modal.selectedState && { assignedState: modal.selectedState }),
          ...(modal.selectedRole === "state_manager_1" && { managerLevel: 1 as const }),
          ...(modal.selectedRole === "state_manager_2" && { managerLevel: 2 as const }),
          ...(modal.selectedProfessionalType && { professionalType: modal.selectedProfessionalType }),
          ...(modal.professionalLicense?.trim() && { professionalLicense: modal.professionalLicense.trim() }),
          ...(modal.specialization?.trim() && { specialization: modal.specialization.trim() }),
          ...(modal.reason?.trim() && { reason: modal.reason.trim() }),
        }
      );

      Alert.alert("Success", "Role assigned successfully");
      closeModal();
      loadUsers();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to assign role");
    }
  };

  const handleRemoveRole = (user: FirebaseUser) => {
    if (user.role === "admin") {
      Alert.alert("Error", "Cannot remove admin role");
      return;
    }

    if (user.role === "buyer" || user.role === "seller") {
      Alert.alert("Info", "This user has a standard role (buyer/seller)");
      return;
    }

    Alert.alert(
      "Remove Role",
      `Remove ${ROLE_LABELS[user.role]} role from ${user.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await roleManagementService.removeRole(
                currentUser!.uid,
                user.uid,
                "Role removed by admin"
              );
              Alert.alert("Success", "Role removed successfully");
              loadUsers();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to remove role");
            }
          },
        },
      ]
    );
  };

  const renderUserCard = ({ item }: { item: FirebaseUser }) => {
    const isSpecialRole = ![
      "buyer",
      "seller",
      "admin",
    ].includes(item.role);

    return (
      <View
        style={[
          styles.userCard,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
          isSpecialRole && {
            borderLeftWidth: 4,
            borderLeftColor: theme.primary,
          },
        ]}
      >
        <View style={styles.userInfo}>
          <View style={{ flex: 1 }}>
            <ThemedText weight="medium">{item.name}</ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {item.email}
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isSpecialRole
                      ? theme.primary + "20"
                      : theme.backgroundSecondary,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  weight="medium"
                  style={{ color: isSpecialRole ? theme.primary : theme.textSecondary }}
                >
                  {ROLE_LABELS[item.role]}
                </ThemedText>
              </View>
              {(item as any).assignedState && (
                <View
                  style={[
                    styles.stateBadge,
                    { backgroundColor: theme.info + "20" },
                  ]}
                >
                  <Feather name="map-pin" size={10} color={theme.info} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.info, marginLeft: 4 }}
                  >
                    {(item as any).assignedState}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: theme.primary + "20" }]}
            onPress={() => openAssignModal(item)}
          >
            <Feather name="user-plus" size={16} color={theme.primary} />
          </Pressable>
          {isSpecialRole && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: theme.error + "20" }]}
              onPress={() => handleRemoveRole(item)}
            >
              <Feather name="user-x" size={16} color={theme.error} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>
            Access Denied
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="h2">Role Management</ThemedText>
        <View
          style={[
            styles.countBadge,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <ThemedText type="h4" style={{ color: theme.primary }}>
            {specialRoleUsers.length}
          </ThemedText>
        </View>
      </View>

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search users..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filters}>
          <Pressable
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  selectedFilter === "all" ? theme.primary : theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setSelectedFilter("all")}
          >
            <ThemedText
              type="caption"
              weight="medium"
              style={{
                color: selectedFilter === "all" ? "#fff" : theme.text,
              }}
            >
              All Users
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  selectedFilter === "special_roles"
                    ? theme.primary
                    : theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setSelectedFilter("special_roles")}
          >
            <ThemedText
              type="caption"
              weight="medium"
              style={{
                color: selectedFilter === "special_roles" ? "#fff" : theme.text,
              }}
            >
              Special Roles
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.uid}
        renderItem={renderUserCard}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{ marginTop: Spacing.md, color: theme.textSecondary }}
            >
              No users found
            </ThemedText>
          </View>
        }
      />

      <Modal
        visible={modal.visible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Assign Role</ThemedText>
              <Pressable onPress={closeModal}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {modal.user && (
                <>
                  <View style={styles.userPreview}>
                    <ThemedText weight="medium">{modal.user.name}</ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      {modal.user.email}
                    </ThemedText>
                  </View>

                  <ThemedText weight="medium" style={{ marginTop: Spacing.lg }}>
                    Select Role
                  </ThemedText>
                  <View style={styles.roleGrid}>
                    {availableRoles.map((role) => (
                      <Pressable
                        key={role}
                        style={[
                          styles.roleOption,
                          {
                            backgroundColor:
                              modal.selectedRole === role
                                ? theme.primary + "20"
                                : theme.backgroundSecondary,
                            borderColor:
                              modal.selectedRole === role
                                ? theme.primary
                                : theme.border,
                          },
                        ]}
                        onPress={() => setModal({ ...modal, selectedRole: role })}
                      >
                        <ThemedText
                          type="caption"
                          weight="medium"
                          style={{
                            color:
                              modal.selectedRole === role
                                ? theme.primary
                                : theme.text,
                          }}
                        >
                          {ROLE_LABELS[role]}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>

                  {(modal.selectedRole === "state_manager_1" ||
                    modal.selectedRole === "state_manager_2") && (
                    <>
                      <ThemedText weight="medium" style={{ marginTop: Spacing.lg }}>
                        Assign State
                      </ThemedText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: Spacing.sm }}
                      >
                        {states.map((state) => (
                          <Pressable
                            key={state}
                            style={[
                              styles.stateOption,
                              {
                                backgroundColor:
                                  modal.selectedState === state
                                    ? theme.primary + "20"
                                    : theme.backgroundSecondary,
                                borderColor:
                                  modal.selectedState === state
                                    ? theme.primary
                                    : theme.border,
                              },
                            ]}
                            onPress={() =>
                              setModal({ ...modal, selectedState: state })
                            }
                          >
                            <ThemedText
                              type="caption"
                              style={{
                                color:
                                  modal.selectedState === state
                                    ? theme.primary
                                    : theme.text,
                              }}
                            >
                              {state}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </>
                  )}

                  {modal.selectedRole === "professional" && (
                    <>
                      <ThemedText weight="medium" style={{ marginTop: Spacing.lg }}>
                        Professional Type
                      </ThemedText>
                      <View style={styles.roleGrid}>
                        {(
                          ["doctor", "pharmacist", "dentist", "lawyer"] as ProfessionalType[]
                        ).map((type) => (
                          <Pressable
                            key={type}
                            style={[
                              styles.roleOption,
                              {
                                backgroundColor:
                                  modal.selectedProfessionalType === type
                                    ? theme.primary + "20"
                                    : theme.backgroundSecondary,
                                borderColor:
                                  modal.selectedProfessionalType === type
                                    ? theme.primary
                                    : theme.border,
                              },
                            ]}
                            onPress={() =>
                              setModal({ ...modal, selectedProfessionalType: type })
                            }
                          >
                            <ThemedText
                              type="caption"
                              weight="medium"
                              style={{
                                color:
                                  modal.selectedProfessionalType === type
                                    ? theme.primary
                                    : theme.text,
                              }}
                            >
                              {PROFESSIONAL_LABELS[type]}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>

                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                            borderColor: theme.border,
                          },
                        ]}
                        placeholder="License Number"
                        placeholderTextColor={theme.textSecondary}
                        value={modal.professionalLicense}
                        onChangeText={(text) =>
                          setModal({ ...modal, professionalLicense: text })
                        }
                      />

                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                            borderColor: theme.border,
                          },
                        ]}
                        placeholder="Specialization (optional)"
                        placeholderTextColor={theme.textSecondary}
                        value={modal.specialization}
                        onChangeText={(text) =>
                          setModal({ ...modal, specialization: text })
                        }
                      />
                    </>
                  )}

                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder="Reason for assignment (optional)"
                    placeholderTextColor={theme.textSecondary}
                    value={modal.reason}
                    onChangeText={(text) => setModal({ ...modal, reason: text })}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <PrimaryButton
                title="Cancel"
                onPress={closeModal}
                variant="outlined"
                style={{ flex: 1, marginRight: Spacing.sm }}
              />
              <PrimaryButton
                title="Assign Role"
                onPress={handleAssignRole}
                style={{ flex: 1, marginLeft: Spacing.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    paddingTop: 100,
  },
  countBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  controls: { paddingHorizontal: Spacing.lg },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, marginLeft: Spacing.sm, fontSize: 16 },
  filters: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  filterBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  list: { padding: Spacing.lg, paddingTop: 0 },
  userCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  userInfo: { flex: 1, flexDirection: "row" },
  roleBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.xs,
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  actions: { flexDirection: "row", gap: Spacing.sm },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  modalBody: { padding: Spacing.lg },
  modalFooter: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  userPreview: {
    padding: Spacing.md,
    backgroundColor: "#f9f9f9",
    borderRadius: BorderRadius.md,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  roleOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  stateOption: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    minHeight: 80,
    textAlignVertical: "top",
  },
});