// apps/mobile/src/components/Badge.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colorRole, spacingVal } from '../tokens';
import { Text } from './Text';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'vip' | 'neutral';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'neutral',
  style,
}) => {
  const getColors = (): { bgRole: string; textRole: string } => {
    switch (variant) {
      case 'success':
        return { bgRole: 'primary-container', textRole: 'on-primary-container' };
      case 'warning':
        return { bgRole: 'tertiary-container', textRole: 'on-tertiary-container' };
      case 'error':
        return { bgRole: 'error-container', textRole: 'on-error-container' };
      case 'vip':
        return { bgRole: 'primary', textRole: 'on-primary' };
      case 'info':
        return { bgRole: 'secondary-container', textRole: 'on-secondary-container' };
      default:
        return { bgRole: 'surface-container-high', textRole: 'on-surface-variant' };
    }
  };

  const { bgRole, textRole } = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colorRole(bgRole, '#322F37') },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      <Text variant="label-small" colorRoleName={textRole} style={styles.label}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacingVal('xxs', 4),
    paddingHorizontal: spacingVal('xs', 8),
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

