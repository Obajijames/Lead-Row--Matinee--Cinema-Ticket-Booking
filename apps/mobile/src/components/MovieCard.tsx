// apps/mobile/src/components/MovieCard.tsx
import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { spacingVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

export interface MovieCardProps {
  title: string;
  posterUrl: string | null;
  rating?: number;
  releaseYear?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  title,
  posterUrl,
  rating,
  releaseYear,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics optional
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, rating ${rating ? rating.toFixed(1) : 'unrated'}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      <View style={styles.imageContainer}>
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            style={styles.image}
            contentFit="cover"
            transition={250}
            cachePolicy="memory-disk"
            accessibilityRole="image"
            accessibilityLabel={`${title} poster`}
          />
        ) : (
          <View
            style={[
              styles.imageFallback,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <Ionicons name="film" size={36} color="#8A8A9E" />
          </View>
        )}

        {rating ? (
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: 'rgba(22, 22, 34, 0.85)' },
            ]}
          >
            <Ionicons name="star" size={11} color="#FFD700" style={{ marginRight: 3 }} />
            <Text variant="label-small" style={[styles.ratingText, { color: '#FFFFFF' }]}>
              {rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.content}>
        <Text
          variant="title-small"
          colorRoleName="on-surface"
          numberOfLines={2}
          style={styles.title}
        >
          {title}
        </Text>
        <Text
          variant="body-small"
          colorRoleName="on-surface-variant"
          numberOfLines={1}
          style={styles.releaseYear}
        >
          {releaseYear || ' '}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 156,
    height: 308,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacingVal('md', 16),
  },
  imageContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#0B0B10',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: spacingVal('xs', 8),
    right: spacingVal('xs', 8),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingVal('xs', 8),
    paddingVertical: spacingVal('xxs', 4),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  ratingText: {
    fontWeight: '700',
  },
  content: {
    padding: spacingVal('sm', 12),
    height: 86,
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36,
    maxHeight: 36,
    marginBottom: spacingVal('xxs', 4),
  },
  releaseYear: {
    lineHeight: 16,
    minHeight: 16,
  },
});
