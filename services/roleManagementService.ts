// services/roleManagementService.ts
import { db } from "../lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { UserRole, ProfessionalType } from "../types/user";
import { User } from "./firebaseService";

export interface RoleAssignment {
  userId: string;
  previousRole: UserRole;
  newRole: UserRole;
  assignedBy: string;
  assignedAt: number;
  assignedState?: string;
  professionalType?: ProfessionalType;
  reason?: string;
}

export interface StateAnalytics {
  state: string;
  totalSellers: number;
  activeSellers: number;
  totalOrders: number;
  runningOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  commissionEarned: number;
  averageOrderValue: number;
  topSellers: Array<{
    sellerId: string;
    sellerName: string;
    totalOrders: number;
    revenue: number;
  }>;
  period: string;
}

export const roleManagementService = {
  /**
   * Assign a new role to a user (Admin only)
   */
  async assignRole(
    adminId: string,
    userId: string,
    newRole: UserRole,
    additionalData?: {
      assignedState?: string;
      managerLevel?: 1 | 2;
      professionalType?: ProfessionalType;
      professionalLicense?: string;
      specialization?: string;
      reason?: string;
    }
  ): Promise<void> {
    // Verify admin has permission
    const adminDoc = await getDoc(doc(db, "users", adminId));
    if (!adminDoc.exists() || adminDoc.data()?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can assign roles");
    }

    // Get current user data
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const currentUser = userDoc.data() as User;
    
    // Create role assignment record
    const assignment: RoleAssignment = {
      userId,
      previousRole: currentUser.role,
      newRole,
      assignedBy: adminId,
      assignedAt: Date.now(),
    };

    // Add optional reason if provided
    if (additionalData?.reason?.trim()) {
      assignment.reason = additionalData.reason.trim();
    }

    // Prepare update data - Start with required fields
    const updateData: any = {
      role: newRole,
      assignedBy: adminId,
      assignedAt: Date.now(),
      isActive: true,
    };

    // Role-specific data for State Managers
    if (newRole === "state_manager_1" || newRole === "state_manager_2") {
      if (!additionalData?.assignedState) {
        throw new Error("State must be specified for state managers");
      }
      updateData.assignedState = additionalData.assignedState;
      updateData.managerLevel = newRole === "state_manager_1" ? 1 : 2;
      assignment.assignedState = additionalData.assignedState;
      
      // Clear professional fields
      updateData.professionalType = null;
      updateData.professionalLicense = null;
      updateData.specialization = null;
    }

    // Role-specific data for Professionals
    if (newRole === "professional") {
      if (!additionalData?.professionalType) {
        throw new Error("Professional type must be specified");
      }
      updateData.professionalType = additionalData.professionalType;
      updateData.isVerified = false;
      assignment.professionalType = additionalData.professionalType;
      
      // Optional fields - only add if they have values
      if (additionalData.professionalLicense?.trim()) {
        updateData.professionalLicense = additionalData.professionalLicense.trim();
      } else {
        updateData.professionalLicense = null;
      }
      
      if (additionalData.specialization?.trim()) {
        updateData.specialization = additionalData.specialization.trim();
      } else {
        updateData.specialization = null;
      }
      
      // Clear state manager fields
      updateData.assignedState = null;
      updateData.managerLevel = null;
    }

    // For support_agent role - clear all special fields
    if (newRole === "support_agent") {
      updateData.assignedState = null;
      updateData.managerLevel = null;
      updateData.professionalType = null;
      updateData.professionalLicense = null;
      updateData.specialization = null;
    }

    // Update user document
    await updateDoc(doc(db, "users", userId), updateData);

    // Log role assignment
    await setDoc(doc(db, "roleAssignments", `${userId}_${Date.now()}`), assignment);
  },

  /**
   * Remove a role (revert to buyer)
   */
  async removeRole(
    adminId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const adminDoc = await getDoc(doc(db, "users", adminId));
    if (!adminDoc.exists() || adminDoc.data()?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can remove roles");
    }

    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }

    const currentUser = userDoc.data() as User;

    if (currentUser.role === "admin") {
      throw new Error("Cannot remove admin role");
    }

    // Log the removal
    const assignment: RoleAssignment = {
      userId,
      previousRole: currentUser.role,
      newRole: "buyer" as UserRole,
      assignedBy: adminId,
      assignedAt: Date.now(),
    };
    
    if (reason?.trim()) {
      assignment.reason = reason.trim();
    }

    await setDoc(doc(db, "roleAssignments", `${userId}_${Date.now()}`), assignment);

    // Revert to buyer role and clear all special fields
    const updateData: any = {
      role: "buyer",
      assignedState: null,
      managerLevel: null,
      professionalType: null,
      professionalLicense: null,
      specialization: null,
      isActive: false,
    };

    await updateDoc(doc(db, "users", userId), updateData);
  },

  /**
   * Get all users with special roles
   */
  async getSpecialRoleUsers(): Promise<User[]> {
    try {
      // Get all users first, then filter in memory to avoid index issues
      const usersSnapshot = await getDocs(collection(db, "users"));
      
      const specialRoles: UserRole[] = [
        "state_manager_1",
        "state_manager_2",
        "support_agent",
        "professional",
      ];
      
      return usersSnapshot.docs
        .map((doc) => doc.data() as User)
        .filter((user) => specialRoles.includes(user.role))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error("Error getting special role users:", error);
      return [];
    }
  },

  /**
   * Get state managers for a specific state
   */
  async getStateManagers(state: string): Promise<User[]> {
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    return usersSnapshot.docs
      .map((doc) => doc.data() as User)
      .filter(
        (user) =>
          user.assignedState === state &&
          (user.role === "state_manager_1" || user.role === "state_manager_2") &&
          user.isActive === true
      );
  },

  /**
   * Get all support agents
   */
  async getSupportAgents(): Promise<User[]> {
    const agentsSnapshot = await getDocs(
      query(
        collection(db, "users"),
        where("role", "==", "support_agent"),
        where("isActive", "==", true)
      )
    );

    return agentsSnapshot.docs.map((doc) => doc.data() as User);
  },

  /**
   * Get all professionals by type
   */
  async getProfessionals(type?: ProfessionalType): Promise<User[]> {
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    return usersSnapshot.docs
      .map((doc) => doc.data() as User)
      .filter((user) => {
        if (user.role !== "professional" || user.isActive !== true) {
          return false;
        }
        if (type && user.professionalType !== type) {
          return false;
        }
        return true;
      });
  },

  /**
   * Get analytics for a specific state
   */
  async getStateAnalytics(state: string): Promise<StateAnalytics> {
    // Get all sellers in the state
    const usersSnapshot = await getDocs(collection(db, "users"));
    const sellers = usersSnapshot.docs
      .map((doc) => doc.data() as User)
      .filter(
        (user) => user.role === "seller" && user.location?.state === state
      );

    const sellerIds = sellers.map((s) => s.uid);

    // Get all orders involving state sellers
    const ordersSnapshot = await getDocs(collection(db, "orders"));
    const orders = ordersSnapshot.docs
      .map((doc) => doc.data())
      .filter((order: any) => sellerIds.includes(order.sellerId));

    // Calculate metrics
    const totalSellers = sellers.length;
    const activeSellers = sellers.filter(
      (s) => s.hasCompletedBusinessProfile
    ).length;
    const totalOrders = orders.length;
    const runningOrders = orders.filter((o: any) => o.status === "running").length;
    const deliveredOrders = orders.filter((o: any) => o.status === "delivered").length;
    const cancelledOrders = orders.filter((o: any) => o.status === "cancelled").length;

    const totalRevenue = orders
      .filter((o: any) => o.status === "delivered")
      .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

    const commissionEarned = orders
      .filter((o: any) => o.status === "delivered")
      .reduce((sum: number, o: any) => sum + (o.commission || 0), 0);

    const averageOrderValue =
      deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;

    // Calculate top sellers
    const sellerRevenue = new Map<string, { name: string; orders: number; revenue: number }>();
    
    orders
      .filter((o: any) => o.status === "delivered")
      .forEach((order: any) => {
        const seller = sellers.find((s) => s.uid === order.sellerId);
        if (seller) {
          const current = sellerRevenue.get(order.sellerId) || {
            name: seller.businessName || seller.name,
            orders: 0,
            revenue: 0,
          };
          current.orders += 1;
          current.revenue += (order.totalAmount || 0) - (order.commission || 0);
          sellerRevenue.set(order.sellerId, current);
        }
      });

    const topSellers = Array.from(sellerRevenue.entries())
      .map(([sellerId, data]) => ({
        sellerId,
        sellerName: data.name,
        totalOrders: data.orders,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      state,
      totalSellers,
      activeSellers,
      totalOrders,
      runningOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      commissionEarned,
      averageOrderValue,
      topSellers,
      period: "all_time",
    };
  },

  /**
   * Get all states with managers assigned
   */
  async getManagedStates(): Promise<string[]> {
    const usersSnapshot = await getDocs(collection(db, "users"));
    
    const states = new Set<string>();
    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data() as User;
      if (
        (user.role === "state_manager_1" || user.role === "state_manager_2") &&
        user.isActive === true &&
        user.assignedState
      ) {
        states.add(user.assignedState);
      }
    });

    return Array.from(states).sort();
  },

  /**
   * Verify professional credentials
   */
  async verifyProfessional(
    adminId: string,
    professionalId: string,
    verified: boolean
  ): Promise<void> {
    const adminDoc = await getDoc(doc(db, "users", adminId));
    if (!adminDoc.exists() || adminDoc.data()?.role !== "admin") {
      throw new Error("Unauthorized: Only admins can verify professionals");
    }

    await updateDoc(doc(db, "users", professionalId), {
      isVerified: verified,
    });
  },
};