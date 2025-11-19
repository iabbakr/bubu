# MarketHub - Multi-Vendor Marketplace

## Overview

MarketHub is a React Native mobile application built with Expo that serves as a multi-vendor marketplace platform. The application enables users to browse and purchase products from supermarkets and pharmacies, pay for utility bills and services, and manage orders. It supports three distinct user roles: buyers who shop, sellers who list products, and administrators who oversee the platform.

The app features a tab-based navigation system with five main sections: Supermarket, Pharmacy, Services, Orders, and Profile. Built using modern React Native practices, it leverages Expo's ecosystem for cross-platform development targeting iOS, Android, and Web.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Platform:**
- React Native 0.81.5 with Expo SDK 54
- Cross-platform targeting: iOS, Android, and Web
- React 19.1.0 with experimental React Compiler enabled
- New Architecture (Fabric) enabled for improved performance

**Navigation Structure:**
- Bottom tab navigation with 5 primary tabs (Supermarket, Pharmacy, Services, Orders, Profile)
- Native stack navigation within each tab
- Transparent/blurred headers on iOS, solid headers on Android
- Gesture-based navigation with platform-specific behavior

**UI Architecture:**
- Theme system with light/dark mode support using `useColorScheme` hook
- Custom themed components (ThemedText, ThemedView) for consistent styling
- Reusable component library: Button, Card, ProductCard, OrderCard, TextInputField
- Screen wrapper components that handle safe areas and keyboard behavior automatically
- Design system based on navy (#000080), snow white (#FFFAFA), and light blue (#ADD8E6) color palette

**State Management:**
- React Context API for global state (AuthContext, CartContext)
- Local component state with React hooks
- No external state management library (Redux, MobX, etc.)

**Key Libraries & Integrations:**
- React Navigation for routing and navigation
- React Native Reanimated for performant animations
- React Native Gesture Handler for gesture support
- Expo Image for optimized image rendering
- Expo Blur for glassmorphic UI effects
- React Native Keyboard Controller for keyboard management
- AsyncStorage for local data persistence

### Backend Architecture

**Data Storage:**
- AsyncStorage used as the primary local database
- No remote backend or API currently implemented
- Mock Firebase service layer (`utils/firebase.ts`) that simulates backend operations
- All data stored client-side with in-memory operations

**Authentication System:**
- Simulated authentication using AsyncStorage
- Role-based access control (admin, seller, buyer)
- Email/password authentication flow (no actual Firebase Auth integration despite naming)
- User session persistence across app restarts

**Data Models:**
- User: uid, email, role, name, phone, createdAt
- Product: id, name, description, price, category (supermarket/pharmacy), imageUrl, sellerId, stock, discount
- Order: id, buyerId, sellerId, products[], totalAmount, commission, status (running/delivered/cancelled), deliveryAddress
- Wallet: userId, balance, pendingBalance
- Coupon: code, discount, type (percentage/fixed), expiresAt, usedBy[]

**Business Logic:**
- Shopping cart management with quantity controls
- Order creation and status tracking
- Commission calculation (10% platform fee on all transactions)
- Coupon validation and discount application
- Wallet balance management for sellers and admin

### External Dependencies

**Third-Party Services:**
- Resend SDK (included but not actively used) - email service integration prepared
- No active external APIs or backend services
- No database connections (Postgres, MongoDB, etc.)
- No payment gateway integrations
- No real-time features or WebSocket connections

**Development Tools:**
- TypeScript for type safety
- ESLint with Expo config for code quality
- Prettier for code formatting
- Babel module resolver for path aliasing (`@/` imports)

**Platform-Specific Considerations:**
- iOS: Glass effect headers, tab bar blur, haptic feedback support
- Android: Edge-to-edge display, solid backgrounds
- Web: Fallback implementations for native-only features (keyboard aware scroll view)

**Asset Management:**
- Expo Image for optimized image loading
- Unsplash URLs used for sample product images
- Local assets for app icons, splash screens

**Notable Architecture Decisions:**
- No actual Firebase implementation despite naming convention - the `firebase.ts` file is a mock service layer
- All user data and products exist only in memory/AsyncStorage - no server persistence
- Services screen prepared but payment integrations not implemented
- Sample data initialization on first app launch
- Platform-agnostic design with conditional rendering for iOS/Android/Web differences