// apps/mobile/src/components/EmptyState.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colorRole, spacingVal } from '../tokens';
import { Text } from './Text';
import { Button } from './Button';

export interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'film',
  title,
  message,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={40} color={colorRole('primary', '#d7960a')} />
      </View>
      <Text variant="headline-small" colorRoleName="on-surface" style={styles.title}>
        {title}
      </Text>
      <Text
        variant="body-medium"
        colorRoleName="on-surface-variant"
        style={styles.message}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacingVal('xl', 24),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 240,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E1E2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingVal('md', 16),
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacingVal('xs', 8),
  },
  message: {
    textAlign: 'center',
    marginBottom: spacingVal('lg', 20),
    maxWidth: 280,
    lineHeight: 20,
  },
  button: {
    minWidth: 160,
  },
});
