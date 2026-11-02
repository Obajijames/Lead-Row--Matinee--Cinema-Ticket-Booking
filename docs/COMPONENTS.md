# Lead Row - Component Catalog & Specifications

This document catalogs the reusable UI design system components built for Lead Row in `apps/mobile/src/components/`.

---

## 1. Design System Architecture

All components adhere strictly to the rules defined in `AGENTS.md` and `06-design-system-and-mobile.md`:
- **Two-Tier Color Token Architecture:** Components bind strictly to Color Roles (`--color-role-*`), never raw Primitives.
- **Touch Target Floor:** All interactive pressables enforce a minimum bounding box of **44 × 44 points**.
- **WCAG AA Compliance:** Text-to-background contrast exceeds 4.5:1; UI controls exceed 3:1.
- **Haptic Feedback:** Light tactile feedback via `expo-haptics` is triggered on primary taps and seat selections.
- **Screen Reader Readiness:** Explicit `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` on all actionable elements.

---

## 2. Component Specifications

### `Text`
* **File:** `apps/mobile/src/components/Text.tsx`
* **Purpose:** Atomic typography component strictly bound to typography tokens.
* **Props:**
  * `variant?: TypographyVariant` — e.g., `'display-large'`, `'headline-medium'`, `'title-medium'`, `'body-medium'`, `'label-small'`.
  * `colorRoleName?: string` — Design token role (defaults to `'on-surface'`).
  * `children: React.ReactNode`
* **Accessibility:** `accessibilityRole="text"`, respects system font scaling (`allowFontScaling={true}`).

### `Button`
* **File:** `apps/mobile/src/components/Button.tsx`
* **Purpose:** Primary interactive call-to-action supporting variants, loading spinners, and disabled states.
* **Props:**
  * `label: string`
  * `onPress: () => void`
  * `variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'`
  * `size?: 'sm' | 'md' | 'lg'` (all guarantee $\ge 44\text{pt}$ touch target)
  * `isLoading?: boolean`
  * `isDisabled?: boolean`
* **Accessibility:** `accessibilityRole="button"`, `accessibilityState={{ disabled, busy }}`.

### `Card`
* **File:** `apps/mobile/src/components/Card.tsx`
* **Purpose:** Surface container wrapper with rounded corners and border variants.
* **Props:**
  * `elevation?: 'low' | 'medium' | 'high'` (maps to `surface-container-*` roles)
  * `children: React.ReactNode`

### `Badge`
* **File:** `apps/mobile/src/components/Badge.tsx`
* **Purpose:** High-visibility pill indicators for status tags (e.g., Confirmed, Pending, VIP).
* **Props:**
  * `label: string`
  * `variant?: 'success' | 'warning' | 'error' | 'info' | 'vip' | 'neutral'`

### `Chip`
* **File:** `apps/mobile/src/components/Chip.tsx`
* **Purpose:** Selectable category and showtime filter tags with minimum 44pt touch targets.
* **Props:**
  * `label: string`
  * `isSelected?: boolean`
  * `onPress: () => void`
* **Accessibility:** `accessibilityRole="button"`, `accessibilityState={{ selected }}`.

### `Input`
* **File:** `apps/mobile/src/components/Input.tsx`
* **Purpose:** Design-token bound form and search input with active focus outline, leading/trailing Ionicons, helper text, and validation error messages.
* **Props:**
  * `label?: string`
  * `error?: string`
  * `helperText?: string`
  * `leadingIcon?: keyof typeof Ionicons.glyphMap` (e.g., `'search'`)
  * `trailingIcon?: keyof typeof Ionicons.glyphMap` (e.g., `'close-circle'`)
  * `onTrailingPress?: () => void`
  * `containerStyle?: ViewStyle`
  * `inputContainerStyle?: ViewStyle`
  * Standard React Native `TextInputProps`
* **Design Token Bindings:**
  * Normal Border: `colorRole('outline-variant', '#2D2D35')`
  * Active/Focused Border: `colorRole('primary', '#d7960a')`
  * Error Border: `colorRole('error', '#fb0d36')`
  * Background: `colorRole('surface-container-high', '#1C1C26')`
  * Typography: `typographyStyle('body-medium')`
  * Minimum touch height: $\ge 48\text{pt}$ (enforces 44pt floor)

### `MovieCard`
* **File:** `apps/mobile/src/components/MovieCard.tsx`
* **Purpose:** Movie poster tile displaying rating badge, title, release year, and press interaction.
* **Props:**
  * `title: string`
  * `posterUrl: string | null`
  * `rating?: number`
  * `releaseYear?: string`
  * `onPress: () => void`

### `Skeleton`
* **File:** `apps/mobile/src/components/Skeleton.tsx`
* **Purpose:** Pulsing animated placeholder for content loading states.
* **Props:**
  * `width: number | string`
  * `height: number`
  * `borderRadius?: number`

### `PriceSummary`
* **File:** `apps/mobile/src/components/PriceSummary.tsx`
* **Purpose:** Financial breakdown component enforcing integer minor units (kobo) and formatting as `₦`.
* **Props:**
  * `subtotalKobo: number`
  * `serviceFeeKobo: number`
  * `totalAmountKobo: number`
  * `ticketCount?: number`
* **Accessibility:** `accessibilityRole="summary"`.

### `ScreenHeader`
* **File:** `apps/mobile/src/components/ScreenHeader.tsx`
* **Purpose:** Standardized screen header bar with 40x40 circular back button and title.
* **Props:**
  * `title: string`
  * `onBack?: () => void`
  * `rightSlot?: React.ReactNode`

### `SeatMap`
* **File:** `apps/mobile/src/components/SeatMap.tsx`
* **Purpose:** Interactive cinema seat selection grid supporting 300+ seats, curved cinema screen indicator, and legend.
* **States Represented:**
  * `AVAILABLE`: Standard selectable seat.
  * `SELECTED`: Active user selection (Primary color).
  * `HELD`: Held by another user in active checkout (Orange/Amber).
  * `SOLD`: Durable confirmed allocation (Dark gray).
  * `VIP`: VIP seating tier with luxury border.
  * `WHEELCHAIR_ACCESSIBLE`: Accessible seating with wheelchair icon (`♿`).
* **Props:**
  * `seats: SeatItem[]`
  * `selectedSeatIds: string[]`
  * `onToggleSeat: (seatId: string) => void`

### `EmptyState`
* **File:** `apps/mobile/src/components/EmptyState.tsx`
* **Purpose:** Friendly zero-data presentation with icon, description, and primary CTA.
* **Props:**
  * `title: string`
  * `message: string`
  * `actionLabel?: string`
  * `onAction?: () => void`

### `BottomSheet`
* **File:** `apps/mobile/src/components/BottomSheet.tsx`
* **Purpose:** Material 3 modal bottom sheet with animated slide up entrance, grab handle bar, title header, optional close button, backdrop tap-to-dismiss, and scrollable content.
* **Props:**
  * `visible: boolean` — Controls sheet visibility.
  * `onClose: () => void` — Callback on backdrop tap, grab handle swipe, or close button press.
  * `title?: string` — Optional header title.
  * `subtitle?: string` — Optional descriptive text.
  * `children: React.ReactNode` — Sheet content.
  * `maxHeight?: number | string` (defaults to `'85%'`).
  * `showCloseButton?: boolean` (defaults to `true`).
* **Accessibility:** `accessibilityViewIsModal={true}`, `accessibilityRole="dialog"`, close button enforces $\ge 44\text{pt}$ touch target.

### `Toast`
* **File:** `apps/mobile/src/components/Toast.tsx`
* **Purpose:** Transient, auto-dismissing notification banner strictly bound to design tokens and supporting animated entrance/exit with Reanimated.
* **Variants:**
  * `success`: Green checkmark icon and emerald border (`#4caf50`).
  * `error`: Alert circle icon and ruby border (`#fb0d36`).
  * `warning`: Warning triangle icon and amber border (`#d7960a`).
  * `info`: Information circle icon and turquoise border (`#01B4E4`).
* **Props:**
  * `visible: boolean`
  * `message: string`
  * `title?: string`
  * `variant?: ToastVariant`
  * `durationMs?: number` (defaults to 4000ms).
  * `onDismiss: () => void`
  * `position?: 'top' | 'bottom'`
  * `actionLabel?: string`
  * `onAction?: () => void`
* **Accessibility:** `accessibilityRole="alert"`, `accessibilityLiveRegion="polite"`, 44pt touch targets on action and dismiss controls.

---

## 3. Live Component Gallery Inspection
All components are wired and demonstrated with interactive controls in the hidden developer screen:
`apps/mobile/src/screens/dev/ComponentGalleryScreen.tsx`.


---

## 4. Navigation Architecture & Application Screens

### Bottom Navigation Tabs (`MainTabNavigator`)
* **File:** `apps/mobile/src/navigation/MainTabNavigator.tsx`
* **Tabs:**
  * 🏠 **Home (`HomeScreen`):** Now Showing carousel, category filters, and movie catalog grid.
  * 🎬 **Movies (`MoviesScreen`):** Search bar, genre chips, and full TMDB release browsing.
  * 🎟️ **Bookings (`BookingsScreen`):** Active tickets, upcoming showtimes, and QR pass launcher.
  * 👤 **Profile (`ProfileScreen`):** Account information, loyalty reward points, payment method settings, and dev gallery access.
* **Material 3 (M3) Navigation Bar Specifications:**
  * Container Background: `surface-container` (`tokens.colors.primitives['key-surface-raised']` / `#1C1C26`).
  * Elevation: Level 2 tonal surface without harsh dividing borders (`borderTopWidth: 0`).
  * Height: 80dp content height + safe area bottom inset.
  * Active Indicator: Stadium / Pill shape (64dp width × 32dp height, 16dp radius) in primary container tonal alpha (`rgba(215, 150, 10, 0.22)`).
  * Icons: 24dp filled Ionicons strictly from `https://ionic.io/ionicons`.
  * Active Tint: Primary Key Color (`#d7960a`).
  * Inactive Tint: `on-surface-variant` (`#8A8A9E`).
  * Typography: M3 `label-medium` (12sp font size, 16sp line height, 0.5sp tracking, 4dp top spacing).

---

## 13. Standalone Open-Source Package (Stretch Goal)

The `SeatMap` component has been extracted and packaged as an independent, zero-dependency open-source package located at [`packages/seat-map`](../packages/seat-map):

- **Package Name**: `react-native-cinema-seat-map` (v1.0.0)
- **Source**: `packages/seat-map/src/` (`SeatMap.tsx`, `SeatMap.types.ts`, `index.ts`)
- **Distribution**: `packages/seat-map/dist/` (compiled CommonJS + TypeScript `.d.ts` declaration files and maps)
- **Features**:
  - Handles 300+ seat interactive cinema auditoriums with smooth horizontal/vertical panning.
  - Full state representation: Available, Selected, Held, Sold, and Wheelchair-Accessible (ADA compliant).
  - High-performance memoization using `React.memo` and `useCallback` to prevent cascading re-renders during high-frequency tap events.
  - Fully customizable theming via `SeatThemeColors`.
  - Accessible touch targets adhering to WCAG 2.1 AA ($\ge 44 \times 44\text{pt}$ touch bounds) and screen-reader semantics (`accessibilityRole="checkbox"`, `accessibilityState`, `accessibilityLabel`).
- **NPM Documentation**: Full standalone `README.md` and MIT `LICENSE` included.

