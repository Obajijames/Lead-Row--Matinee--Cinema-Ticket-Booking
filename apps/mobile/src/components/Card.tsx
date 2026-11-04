// apps/mobile/src/components/Card.tsx
import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colorRole, spacingVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';

export type CardElevation = 'low' | 'medium' | 'high';

export interface CardProps extends ViewProps {
  elevation?: CardElevation;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  elevation = 'medium',
  children,
  style,
  ...rest
}) => {
  const { colors } = useTheme();

  const getBackgroundColor = (): string => {
    switch (elevation) {
      case 'low':
        return colors.surfaceContainerLow;
      case 'high':
        return colors.surfaceContainerHigh;
      default:
        return colors.surfaceContainer;
    }
  };

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: colors.outlineVariant,
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

