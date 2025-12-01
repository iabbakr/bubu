// types/user.ts

export type UserRole = 
  | "admin" 
  | "seller" 
  | "buyer"
  | "state_manager_1"      // State Operation Manager I
  | "state_manager_2"      // State Operation Manager II
  | "support_agent"        // Customer Support Agent
  | "professional";        // Doctors, Pharmacists, Dentists, Lawyers

export type ProfessionalType = 
  | "doctor" 
  | "pharmacist" 
  | "dentist" 
  | "lawyer";

export interface Location {
  state: string;
  city: string;
  area: string;
}

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  gender?: "male" | "female" | "other";
  referralCode?: string;
  myReferralCode?: string;
  referredBy?: string;
  hasCompletedFirstPurchase?: boolean;
  location?: Location;
  sellerCategory?: "supermarket" | "pharmacy";
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  hasCompletedBusinessProfile?: boolean;
  createdAt: number;
  referralBonus?: number;
  
  // NEW: Additional role-specific fields
  assignedState?: string;              // For state managers
  managerLevel?: 1 | 2;               // Manager level (I or II)
  professionalType?: ProfessionalType; // For professionals
  professionalLicense?: string;        // Professional license number
  specialization?: string;             // For doctors/dentists
  yearsOfExperience?: number;         // For professionals
  consultationFee?: number;           // For professionals
  availability?: string[];            // Available days for professionals
  isVerified?: boolean;               // Verification status for professionals
  isActive?: boolean;                 // Account active status
  assignedBy?: string;                // UID of admin who assigned role
  assignedAt?: number;                // Timestamp of role assignment
  permissions?: string[];             // Specific permissions array
}

// Role hierarchy and permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  state_manager_2: 80,
  state_manager_1: 70,
  support_agent: 50,
  professional: 40,
  seller: 30,
  buyer: 10,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  state_manager_1: "State Operation Manager I",
  state_manager_2: "State Operation Manager II",
  support_agent: "Customer Support Agent",
  professional: "Professional",
  seller: "Seller",
  buyer: "Buyer",
};

export const PROFESSIONAL_LABELS: Record<ProfessionalType, string> = {
  doctor: "Doctor",
  pharmacist: "Pharmacist",
  dentist: "Dentist",
  lawyer: "Lawyer",
};

// Permission definitions
export type Permission = 
  | "view_all_orders"
  | "view_state_orders"
  | "view_disputes"
  | "resolve_disputes"
  | "manage_users"
  | "manage_state_users"
  | "view_analytics"
  | "view_state_analytics"
  | "handle_support"
  | "assign_roles"
  | "view_transactions"
  | "manage_products"
  | "provide_consultation";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "view_all_orders",
    "view_disputes",
    "resolve_disputes",
    "manage_users",
    "view_analytics",
    "handle_support",
    "assign_roles",
    "view_transactions",
    "manage_products",
  ],
  state_manager_2: [
    "view_state_orders",
    "view_disputes",
    "resolve_disputes",
    "manage_state_users",
    "view_state_analytics",
    "view_transactions",
  ],
  state_manager_1: [
    "view_state_orders",
    "view_disputes",
    "view_state_analytics",
    "view_transactions",
  ],
  support_agent: [
    "view_all_orders",
    "view_disputes",
    "handle_support",
  ],
  professional: [
    "provide_consultation",
  ],
  seller: [
    "manage_products",
  ],
  buyer: [],
};

// Helper functions
export function hasPermission(user: User, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

export function canManageRole(userRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
}

export function isStateManager(role: UserRole): boolean {
  return role === "state_manager_1" || role === "state_manager_2";
}

export function isProfessional(role: UserRole): boolean {
  return role === "professional";
}

export function getDisplayName(user: User): string {
  if (user.role === "professional" && user.professionalType) {
    return `${PROFESSIONAL_LABELS[user.professionalType]} ${user.name}`;
  }
  return `${user.name} (${ROLE_LABELS[user.role]})`;
}