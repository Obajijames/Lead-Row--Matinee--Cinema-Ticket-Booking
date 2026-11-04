// apps/mobile/src/components/Badge.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { spacingVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
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
  const { colors, isDark } = useTheme();

  const getVisual = (): { bg: string; text: string; border: string } => {
    switch (variant) {
      case 'success':
        return isDark
          ? {
              bg: 'rgba(52, 211, 153, 0.16)',
              text: '#34D399',
              border: 'rgba(52, 211, 153, 0.35)',
            }
          : {
              bg: '#DCFCE7',
              text: '#047857',
              border: '#86EFAC',
            };
      case 'warning':
        return isDark
          ? {
              bg: 'rgba(215, 150, 10, 0.2)',
              text: '#FBBF24',
              border: 'rgba(215, 150, 10, 0.4)',
            }
          : {
              bg: '#FEF3C7',
              text: '#B45309',
              border: '#FDE68A',
            };
      case 'error':
        return isDark
          ? {
              bg: 'rgba(239, 68, 68, 0.2)',
              text: '#F87171',
              border: 'rgba(239, 68, 68, 0.4)',
            }
          : {
              bg: '#FEE2E2',
              text: '#B91C1C',
              border: '#FCA5A5',
            };
      case 'vip':
        return {
          bg: colors.primary,
          text: isDark ? '#000000' : '#FFFFFF',
          border: colors.primary,
        };
      case 'info':
        return isDark
          ? {
              bg: 'rgba(56, 189, 248, 0.18)',
              text: '#38BDF8',
              border: 'rgba(56, 189, 248, 0.35)',
            }
          : {
              bg: '#E0F2FE',
              text: '#0369A1',
              border: '#BAE6FD',
            };
      default:
        return {
          bg: colors.surfaceContainerHigh,
          text: colors.onSurfaceVariant,
          border: colors.outlineVariant,
        };
    }
  };

  const visual = getVisual();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: visual.bg,
          borderColor: visual.border,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
    >
      <Text
        variant="label-small"
        style={[styles.label, { color: visual.text }]}
      >
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
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
