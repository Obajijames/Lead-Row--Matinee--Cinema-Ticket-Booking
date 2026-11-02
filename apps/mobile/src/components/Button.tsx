// apps/mobile/src/components/Button.tsx
import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colorRole, typographyStyle, spacingVal } from '../tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  style,
  accessibilityHint,
}) => {
  const handlePress = () => {
    if (isLoading || isDisabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics optional if unsupported on platform
    }
    onPress();
  };

  const getContainerStyles = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      minHeight: 44, // Minimum 44pt touch target rule
    };

    // Size
    if (size === 'sm') {
      base.paddingVertical = spacingVal('xs', 8);
      base.paddingHorizontal = spacingVal('md', 16);
      base.minHeight = 44;
    } else if (size === 'lg') {
      base.paddingVertical = spacingVal('md', 16);
      base.paddingHorizontal = spacingVal('xl', 24);
      base.minHeight = 56;
    } else {
      base.paddingVertical = spacingVal('sm', 12);
      base.paddingHorizontal = spacingVal('lg', 20);
      base.minHeight = 48;
    }

    // Variant
    switch (variant) {
      case 'primary':
        base.backgroundColor = colorRole('primary', '#d7960a');
        break;
      case 'secondary':
        base.backgroundColor = colorRole('secondary-container', '#322F37');
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 1.5;
        base.borderColor = colorRole('outline', '#938F99');
        break;
      case 'ghost':
        base.backgroundColor = 'transparent';
        break;
      case 'danger':
        base.backgroundColor = colorRole('error', '#BA1A1A');
        break;
    }

    if (isDisabled) {
      base.opacity = 0.45;
    }

    return base;
  };

  const getTextColorRole = (): string => {
    switch (variant) {
      case 'primary':
        return 'on-primary';
      case 'secondary':
        return 'on-secondary-container';
      case 'outline':
      case 'ghost':
        return 'primary';
      case 'danger':
        return 'on-error';
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled || isLoading}
      accessibilityRole={'button' as AccessibilityRole}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      style={({ pressed }) => [
        getContainerStyles(),
        pressed && !isDisabled && !isLoading && { opacity: 0.82 },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={colorRole(getTextColorRole(), '#ffffff')}
        />
      ) : (
        <Text
          variant={size === 'lg' ? 'title-medium' : size === 'sm' ? 'label-medium' : 'label-large'}
          colorRoleName={getTextColorRole()}
          style={styles.label}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  label: {
    textAlign: 'center',
    fontWeight: '600',
  },
});

