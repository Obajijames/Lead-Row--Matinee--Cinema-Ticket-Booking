// apps/mobile/src/components/ScreenHeader.tsx
import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colorRole, spacingVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  rightSlot,
  style,
}) => {
  const { colors } = useTheme();

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics optional
    }
    if (onBack) onBack();
  };

  return (
    <View style={[styles.header, style]}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backButton,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
                borderWidth: 1,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      <View style={styles.center}>
        <Text
          variant="title-medium"
          colorRoleName="on-surface"
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </Text>
      </View>

      <View style={styles.right}>{rightSlot || <View style={styles.spacer} />}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingVal('md', 16),
  },
  left: {
    width: 48,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    width: 48,
    alignItems: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
