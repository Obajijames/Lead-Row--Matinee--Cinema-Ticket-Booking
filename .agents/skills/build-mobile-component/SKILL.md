---
name: build-mobile-component
description: Build, style, test, and document reusable mobile UI components in apps/mobile/src/components/. Trigger words: component, Button, Text, Card, MovieCard, Input, Chip, Badge, BottomSheet, Skeleton, Toast, EmptyState, SeatMap, ScreenHeader, PriceSummary, QueueStatus, ErrorState, COMPONENTS.md.
---

## Overview

This skill guides the construction of accessible, token-bound React Native components for the Lead Row mobile app.
**Governing Rules:** `06-design-system-and-mobile.md`, `01-system-architecture.md`, and `AGENTS.md` Section 9.

---

## Ordered Procedure

1. **Verify Token Requirements:**
   - Open `tokens.json` or `tokens.css`.
   - Identify the exact Color Roles needed (`roles.primary`, `roles.surface`, `roles.outline`, etc.). Do not touch raw primitive palette colors.
   - Select spacing values from the 4pt/8pt rhythm (`spacing.xs`, `spacing.sm`, `spacing.base`, etc.).

2. **Define Component Interface:**
   - Create `apps/mobile/src/components/[ComponentName]/[ComponentName].types.ts`.
   - Export an interface extending standard React Native props (`ViewProps`, `TextProps`, or `PressableProps`).
   - Include required accessibility props: `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole`.
   - Explicitly type variants, sizes, and states (`isLoading`, `isDisabled`).

3. **Implement Component Structure:**
   - Create `apps/mobile/src/components/[ComponentName]/[ComponentName].tsx`.
   - Use `Pressable` for interactive elements. Enforce minimum dimensions of 44 × 44 points (`minHeight: 44`, `minWidth: 44`).
   - If interactive, wrap feedback with `expo-haptics` inside a `try/catch` or platform check so missing haptics do not crash web/test runners.
   - For animated transitions (modals, seat selections, badges), use `react-native-reanimated`.
   - For typography, combine family (`Inter` or `Playfair Display`), size, and line height. Never hardcode line heights that clip when system text scales.

4. **Add Story to Development Gallery:**
   - Open `apps/mobile/src/screens/dev/ComponentGalleryScreen.tsx`.
   - Import the component.
   - Render every variant, state (default, pressed, loading, disabled), and edge-case text length.

5. **Document in COMPONENTS.md:**
   - Open `docs/COMPONENTS.md`.
   - Add or update the component table with:
     - Name and purpose
     - Props interface and default values
     - States supported
     - Accessibility roles and screen-reader behaviors

---

## Code Skeleton

```typescript
// apps/mobile/src/components/Button/Button.types.ts
import { PressableProps, StyleProp, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'error';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  accessibilityHint?: string;
}
```

```typescript
// apps/mobile/src/components/Button/Button.tsx
import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ButtonProps } from './Button.types';
import { tokens } from '../../tokens';

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...rest
}) => {
  const handlePress = () => {
    if (isDisabled || isLoading) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const backgroundColor = isDisabled
    ? tokens.colors.roles['surface-container-high'].hex
    : variant === 'primary'
    ? tokens.colors.roles.primary.hex
    : tokens.colors.roles.surface.hex;

  const textColor = isDisabled
    ? tokens.colors.roles['on-surface-variant'].hex
    : variant === 'primary'
    ? tokens.colors.roles['on-primary'].hex
    : tokens.colors.roles['on-surface'].hex;

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled || isLoading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled || isLoading, busy: isLoading }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        { backgroundColor, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: tokens.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  sm: { paddingVertical: tokens.spacing.xs, paddingHorizontal: tokens.spacing.sm },
  md: { paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.base },
  lg: { paddingVertical: tokens.spacing.md, paddingHorizontal: tokens.spacing.lg },
  text: {
    fontFamily: tokens.typography['label-large'].fontFamily,
    fontSize: tokens.typography['label-large'].fontSize,
    fontWeight: '500',
  },
});
```

---

## Common Traps

* **Direct Primitive Color Import:** Importing `--color-primitive-primary-40` or hardcoding `#d7960a`. Always read from `tokens.colors.roles`.
* **Touch Target Too Small:** Creating 32 × 32 icon buttons. Always enforce `minHeight: 44` and `minWidth: 44`.
* **Missing Screen-Reader Props:** Leaving an icon button without an `accessibilityLabel`.
* **Broken System Font Scaling:** Setting rigid container heights (e.g. `height: 30`) that clip text when a user enables large accessibility fonts.
* **Exposing Gallery in Production:** Linking the component gallery from user-facing bottom tabs or drawers.

---

## Verify Before Done

1. [ ] Check that no primitive color tokens are imported or referenced.
2. [ ] Measure interactive touch target to ensure minimum 44 × 44 points.
3. [ ] Verify WCAG AA contrast (4.5:1 for standard text, 3:1 for large controls).
4. [ ] Component is added to `apps/mobile/src/screens/dev/ComponentGalleryScreen.tsx`.
5. [ ] Props, variants, and accessibility behavior are documented in `docs/COMPONENTS.md`.
6. [ ] **Write Tests:** Add unit tests in `apps/mobile/src/components/[ComponentName]/__tests__/[ComponentName].test.tsx` verifying:
   - Renders with default props
   - Fires `onPress` callback when pressed
   - Does not fire `onPress` when `isDisabled` or `isLoading` is true
   - Has correct accessibility attributes (`accessibilityRole="button"`, `accessibilityLabel`)

