// apps/mobile/src/components/Card.tsx
import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle } from 'react-native';
import { colorRole, spacingVal } from '../tokens';

export type CardElevation = 'low' | 'medium' | 'high';

export interface CardProps extends ViewProps {
  elevation?: CardElevation;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  elevation = 'medium',
  children,
  style,
  ...rest
}) => {
  const getBackgroundColorRole = (): string => {
    switch (elevation) {
      case 'low':
        return 'surface-container-low';
      case 'high':
        return 'surface-container-high';
      default:
        return 'surface-container';
    }
  };

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colorRole(getBackgroundColorRole(), '#1D1B20'),
          borderColor: colorRole('outline-variant', '#49454F'),
        },
        style,
      ]}
      accessibilityRole="none"
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: spacingVal('md', 16),
    borderWidth: 1,
    overflow: 'hidden',
  },
});

