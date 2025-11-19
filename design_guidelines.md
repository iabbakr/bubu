# Multi-Vendor Marketplace - Design Guidelines

## Authentication & Onboarding

**Firebase Auth Stack:**
- Email/Password (primary) + Google Sign-In + Apple Sign-In (iOS required)
- Roles: Admin, Seller, Buyer (Firebase managed)

**Flow:** Welcome → Role Selection → Sign Up/In → [Sellers: Business Verification] → Profile Setup

**Account Actions:**
- Delete Account: Profile > Settings > Account > Delete (double confirmation)
- Privacy/Terms links on signup

---

## Navigation Structure

**Tab Navigation (5 tabs):**
- Supermarket/Pharmacy/Services/Orders/Profile

**Key Stack Flows:**
- Shop: Home → Product Detail → Cart → Checkout → Success
- Services: Home → Bill Category → Payment Form → Success
- Orders: Home (Running/Delivered/Cancelled tabs) → Detail
- Profile: Home → Edit/Wallet/Settings/Seller Dashboard/Admin Panel

**Native Modals:** Add Product, Apply Coupon, Delivery Confirm, Filters

---

## Core Screen Specs

### Shop Home (Supermarket/Pharmacy)
- **Header:** Transparent, search + cart badge (right)
- **Content:** Hero banner → Featured products (horizontal scroll) → Product grid (2 cols mobile, 3 tablet)
- **Safe Area:** Top: headerHeight + 24px, Bottom: tabBarHeight + 24px
- **Components:** Search modal trigger, product cards (image/name/price/discount), category chips, quick-add buttons

### Product Detail
- **Header:** Back + share buttons
- **Content:** Image carousel → Name/Price/Discount → Seller (name/rating) → Description → Reviews
- **Footer:** Sticky "Add to Cart"/"Buy Now" (60px height)
- **Components:** Quantity stepper, variant selector, review stars

### Services Home
- **Content:** 2-column grid (Airtime/Data/TV/Electricity/Education) → Recent transactions
- **Safe Area:** Standard header + tab bar spacing

### Bill Payment
- **Content:** Form (provider dropdown, account #, amount, phone) → Verify → Summary card → Submit
- **Components:** Validated inputs, pickers, payment breakdown

### Orders
- **Header:** Title + filter button
- **Sub-tabs:** Running | Delivered | Cancelled (segment control)
- **Content:** FlatList of order cards, pull-to-refresh
- **Empty State:** Illustration + message

### Order Detail
- **Content:** Status timeline (stepper) → Items → Address → Payment summary → Seller info
- **Footer:** Role-based actions (Contact/Confirm for buyers, Update Status for sellers)

### Cart (Modal)
- **Content:** FlatList items → Coupon input → Price breakdown
- **Footer:** Subtotal + Checkout button (60px height)
- **Items:** Image, name, price, quantity stepper, remove

### Profile/Wallet
- **Header:** Transparent, edit button
- **Content:** Avatar → Wallet card (balance, pending) → Menu (Orders/Wallet/Dashboard/Admin/Settings/Help/Logout)

### Seller Dashboard
- **Content:** Earnings cards (total/available/pending) → Stats (products/orders/ratings) → Recent orders → Manage Products/Withdraw buttons
- **Note:** Withdraw shown only if balance > 0

### Admin Panel
- **Content:** Commission revenue card → User stats → Transaction chart → All orders → User management

---

## Design System

### Colors
**Primary:**
- Navy `#000080` - CTAs, headers
- Snow White `#FFFAFA` - backgrounds
- Light Blue `#ADD8E6` - accents, secondary buttons
- Slate Gray `#6D8196` - secondary text, borders

**Semantic:**
- Success `#22C55E`, Warning `#F59E0B`, Error `#EF4444`, Info `#ADD8E6`

**Text:**
- Primary: Navy, Secondary: Slate Gray, Disabled: Slate Gray 40%, Inverted: Snow White

### Typography
**Fonts:** SF (iOS), Roboto (Android)
- H1: 28/32, Bold | H2: 22/24, Semibold | H3: 18/20, Semibold
- Body: 16, Regular | Caption: 14, Regular | Label: 12, Medium

### Spacing Scale
4, 8, 12, 16, 24, 32px (xs → xxl)

### Components

**Cards:**
- Background: Snow White, Border: 1px Slate Gray 15%, Radius: 12px, Padding: 16px

**Buttons:**
- Primary: Navy bg, Snow White text | Secondary: Light Blue bg, Navy text
- Outlined: Transparent, Navy border/text | Height: 48px, Radius: 8px
- Press: Scale 0.97, opacity 0.8 | Disabled: Slate Gray 20%

**FAB (Cart):**
- 56x56px, Navy bg, Snow White icon, Radius: 28px, Position: bottom-right 16px
- Shadow: offset(0,2), opacity 0.1, radius 2

**Inputs:**
- Height: 48px, Border: 1px Slate Gray 20%, Radius: 8px, Padding: 12px
- Focus: 2px Navy | Error: 2px Error red

**Status Badges:**
- Running: Warning 15% bg | Delivered: Success 15% | Cancelled: Error 15%
- Radius: 6px, Padding: 4px 8px

**Tab Bar:**
- Snow White bg, Height: 80px (incl. safe area)
- Active: Navy icon/text (Medium) | Inactive: Slate Gray 50%

### Icons
- **Library:** Feather icons (@expo/vector-icons)
- **Sizes:** 24px default, 20px tabs, 16px badges
- **Rule:** No emojis

### Interactions
- Touch targets: Min 44x44px
- Press feedback: Opacity 0.7 or scale 0.97
- List highlights: Light Blue 10%
- Loading: Navy activity indicator

### Required Assets
1. **Default Avatars:** 3 geometric patterns (brand colors)
2. **Category Icons:** Supermarket, Pharmacy, Services (line art)
3. **Empty States:** Cart, orders, products (minimalist illustrations)
4. **Service Icons:** Airtime, Data, TV, Electricity, Education (consistent style)

### Accessibility
- Contrast: 4.5:1 text, 3:1 UI
- Dynamic/scalable type support
- Screen reader labels on all interactive elements
- Clear form validation errors
- Announce loading/success states

---

## Safe Area Standards
- **Transparent Headers:** Top: headerHeight + 24px
- **Default Headers:** Top: 24px
- **With Tab Bar:** Bottom: tabBarHeight + 24px
- **Sticky Footers:** Bottom: insets.bottom + 24px (+ button height if applicable)