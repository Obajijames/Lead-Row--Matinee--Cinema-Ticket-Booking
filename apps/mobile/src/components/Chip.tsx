// apps/mobile/src/components/Chip.tsx
import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colorRole, spacingVal } from '../tokens';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  isSelected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  isSelected = false,
  onPress,
  style,
}) => {
  const handlePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics optional
    }
    onPress();
  };

  const bgRole = isSelected ? 'primary' : 'surface-container-high';
  const textRole = isSelected ? 'on-primary' : 'on-surface-variant';
  const borderRole = isSelected ? 'primary' : 'outline-variant';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colorRole(bgRole, '#322F37'),
          borderColor: colorRole(borderRole, '#49454F'),
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text variant="label-medium" colorRoleName={textRole} style={styles.text}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 44, // 44pt touch target rule
    paddingVertical: spacingVal('xs', 8),
    paddingHorizontal: spacingVal('md', 16),
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '500',
  },
});

