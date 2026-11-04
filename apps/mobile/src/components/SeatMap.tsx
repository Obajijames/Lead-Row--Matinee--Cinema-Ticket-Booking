// apps/mobile/src/components/SeatMap.tsx
import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { spacingVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { Text } from './Text';

export type SeatState = 'AVAILABLE' | 'SELECTED' | 'HELD' | 'SOLD';
export type SeatCategory = 'STANDARD' | 'VIP' | 'WHEELCHAIR_ACCESSIBLE';

export interface SeatItem {
  id: string;
  rowLabel: string;
  seatNumber: number;
  seatType: SeatCategory;
  status: SeatState;
}

export interface SeatMapProps {
  seats: SeatItem[];
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
  style?: StyleProp<ViewStyle>;
}

interface SeatCellProps {
  seat: SeatItem;
  isSelected: boolean;
  onPress: (seat: SeatItem) => void;
  visual: { bg: string; border: string; textColor: string };
  isInteractive: boolean;
  size: number;
  marginHorizontal: number;
}

const SeatCell: React.FC<SeatCellProps> = ({
  seat,
  isSelected,
  onPress,
  visual,
  isInteractive,
  size,
  marginHorizontal,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(1.22, { damping: 9, stiffness: 350 }),
        withSpring(1.0, { damping: 12, stiffness: 220 })
      );
    } else {
      scale.value = withSpring(1.0, { damping: 12 });
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (isInteractive) {
      scale.value = withSpring(0.86, { damping: 14, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (isInteractive) {
      scale.value = withSpring(1.0, { damping: 12 });
    }
  };

  // Font size scales with seat size
  const fontSize = size >= 26 ? 11 : size >= 22 ? 9.5 : size >= 18 ? 8 : 7;
  // Accessible touch target padding
  const hitPadding = Math.max(6, Math.floor((44 - size) / 2));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(seat)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isInteractive && !isSelected}
        hitSlop={{
          top: hitPadding,
          bottom: hitPadding,
          left: Math.min(hitPadding, 6),
          right: Math.min(hitPadding, 6),
        }}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${seat.rowLabel}${seat.seatNumber}, ${seat.seatType}, ${
          isSelected ? 'Selected' : seat.status
        }`}
        style={({ pressed }) => [
          styles.seat,
          {
            width: size,
            height: size,
            borderRadius: Math.max(4, Math.round(size * 0.22)),
            marginHorizontal,
            backgroundColor: visual.bg,
            borderColor: visual.border,
            opacity: pressed && isInteractive ? 0.75 : 1,
          },
        ]}
      >
        <Text
          variant="label-small"
          style={[styles.seatNumber, { fontSize, color: visual.textColor }]}
        >
          {seat.seatType === 'WHEELCHAIR_ACCESSIBLE' ? (
            <Ionicons name="accessibility" size={Math.max(10, Math.round(size * 0.55))} color={visual.textColor} />
          ) : (
            seat.seatNumber
          )}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  onToggleSeat,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Group seats by row
  const rowLabels = Array.from(new Set(seats.map((s) => s.rowLabel))).sort();

  // Find max seats in any single row to calculate responsive sizing
  const maxSeatsPerRow = Math.max(
    ...rowLabels.map((row) => seats.filter((s) => s.rowLabel === row).length),
    1
  );

  // Responsive seat dimensions so the entire grid fits on-screen width with ZERO horizontal swiping
  const rowHeaderWidth = 20;
  // Available width = Screen width - container padding (32) - left & right row headers (40)
  const availableWidth = Math.max(windowWidth - 72, 260);
  const calculatedSeatSize = Math.floor((availableWidth - (maxSeatsPerRow - 1) * 4) / maxSeatsPerRow);
  const seatSize = Math.max(16, Math.min(34, calculatedSeatSize));
  const seatMargin = Math.max(1.5, Math.min(3, Math.round(seatSize * 0.08)));
  const rowSpacing = seatSize < 24 ? 6 : 8;

  const handleSeatPress = (seat: SeatItem) => {
    if (seat.status === 'SOLD' || seat.status === 'HELD') return;

    try {
      Haptics.selectionAsync();
    } catch {
      // Haptics optional
    }
    onToggleSeat(seat.id);
  };

  const getSeatVisuals = (seat: SeatItem, isSelected: boolean) => {
    if (isSelected) {
      return {
        bg: colors.primary,
        border: colors.primary,
        textColor: '#000000',
      };
    }

    if (seat.status === 'SOLD') {
      return {
        bg: isDark ? '#2D2D3D' : '#E5E7EB',
        border: isDark ? '#3D3D4D' : '#D1D5DB',
        textColor: isDark ? '#666677' : '#9CA3AF',
      };
    }

    if (seat.status === 'HELD') {
      return {
        bg: isDark ? '#4E2600' : '#FEF3C7',
        border: '#D97706',
        textColor: isDark ? '#FFAA66' : '#B45309',
      };
    }

    if (seat.seatType === 'VIP') {
      return {
        bg: 'transparent',
        border: colors.primary,
        textColor: colors.primary,
      };
    }

    if (seat.seatType === 'WHEELCHAIR_ACCESSIBLE') {
      return {
        bg: 'transparent',
        border: colors.outline,
        textColor: colors.outline,
      };
    }

    // Standard available
    return {
      bg: colors.surfaceContainerHigh,
      border: colors.outlineVariant,
      textColor: colors.onSurfaceVariant,
    };
  };

  return (
    <View style={[styles.container, style]}>
      {/* Cinema Screen Arc at Top */}
      <View style={styles.screenWrapper}>
        <View
          style={[
            styles.screenCurve,
            { borderColor: colors.primary },
          ]}
        />
        <Text variant="label-small" colorRoleName="on-surface-variant" style={styles.screenText}>
          CINEMA SCREEN
        </Text>
      </View>

      {/* Legend Directly Below Screen */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          />
          <Text variant="label-small" colorRoleName="on-surface-variant">
            Available
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.primary },
            ]}
          />
          <Text variant="label-small" colorRoleName="on-surface-variant">
            Selected
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: isDark ? '#4E2600' : '#FEF3C7',
                borderColor: '#D97706',
                borderWidth: 1,
              },
            ]}
          />
          <Text variant="label-small" colorRoleName="on-surface-variant">
            Held
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: isDark ? '#2D2D3D' : '#E5E7EB' },
            ]}
          />
          <Text variant="label-small" colorRoleName="on-surface-variant">
            Sold
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                borderColor: colors.primary,
                borderWidth: 1.5,
                backgroundColor: 'transparent',
              },
            ]}
          />
          <Text variant="label-small" colorRoleName="on-surface-variant">
            VIP
          </Text>
        </View>
      </View>

      {/* Full-Width Interactive Seat Grid (No horizontal swiping needed) */}
      <View style={styles.gridContainer}>
        {rowLabels.map((row) => {
          const rowSeats = seats
            .filter((s) => s.rowLabel === row)
            .sort((a, b) => a.seatNumber - b.seatNumber);

          return (
            <View key={row} style={[styles.rowContainer, { marginBottom: rowSpacing }]}>
              <Text
                variant="label-small"
                colorRoleName="on-surface-variant"
                style={[styles.rowHeader, { width: rowHeaderWidth }]}
              >
                {row}
              </Text>

              <View style={styles.seatsRow}>
                {rowSeats.map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const visual = getSeatVisuals(seat, isSelected);
                  const isInteractive = seat.status === 'AVAILABLE';

                  return (
                    <SeatCell
                      key={seat.id}
                      seat={seat}
                      isSelected={isSelected}
                      visual={visual}
                      isInteractive={isInteractive}
                      size={seatSize}
                      marginHorizontal={seatMargin}
                      onPress={handleSeatPress}
                    />
                  );
                })}
              </View>

              <Text
                variant="label-small"
                colorRoleName="on-surface-variant"
                style={[styles.rowHeader, { width: rowHeaderWidth }]}
              >
                {row}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacingVal('md', 16),
    alignItems: 'center',
    width: '100%',
  },
  screenWrapper: {
    alignItems: 'center',
    marginBottom: spacingVal('sm', 12),
    width: '100%',
  },
  screenCurve: {
    width: '78%',
    height: 12,
    borderTopWidth: 4,
    borderRadius: 8,
    marginBottom: spacingVal('xs', 8),
  },
  screenText: {
    letterSpacing: 2,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacingVal('lg', 20),
    gap: spacingVal('sm', 12),
    paddingHorizontal: spacingVal('sm', 12),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingVal('xxs', 4),
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  gridContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rowHeader: {
    textAlign: 'center',
    fontWeight: '700',
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seat: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatNumber: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

