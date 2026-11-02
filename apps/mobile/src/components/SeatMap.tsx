// apps/mobile/src/components/SeatMap.tsx
import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colorRole, spacingVal } from '../tokens';
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
  style?: ViewStyle;
}

interface SeatCellProps {
  seat: SeatItem;
  isSelected: boolean;
  onPress: (seat: SeatItem) => void;
  visual: { bg: string; border: string; textColor: string };
  isInteractive: boolean;
}

const SeatCell: React.FC<SeatCellProps> = ({
  seat,
  isSelected,
  onPress,
  visual,
  isInteractive,
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

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={() => onPress(seat)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isInteractive && !isSelected}
        accessibilityRole="button"
        accessibilityLabel={`Seat ${seat.rowLabel}${seat.seatNumber}, ${seat.seatType}, ${
          isSelected ? 'Selected' : seat.status
        }`}
        style={({ pressed }) => [
          styles.seat,
          {
            backgroundColor: visual.bg,
            borderColor: visual.border,
            opacity: pressed && isInteractive ? 0.75 : 1,
          },
        ]}
      >
        <Text
          variant="label-small"
          style={[styles.seatNumber, { color: visual.textColor }]}
        >
          {seat.seatType === 'WHEELCHAIR_ACCESSIBLE' ? (
            <Ionicons name="accessibility" size={13} color={visual.textColor} />
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
  // Group seats by row
  const rowLabels = Array.from(new Set(seats.map((s) => s.rowLabel))).sort();

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
        bg: colorRole('primary', '#d7960a'),
        border: colorRole('primary', '#d7960a'),
        textColor: '#FFFFFF',
      };
    }

    if (seat.status === 'SOLD') {
      return {
        bg: colorRole('surface-container-highest', '#36343B'),
        border: colorRole('outline-variant', '#49454F'),
        textColor: '#666666',
      };
    }

    if (seat.status === 'HELD') {
      return {
        bg: colorRole('tertiary-container', '#4E2600'),
        border: colorRole('tertiary', '#FFB77C'),
        textColor: '#FFAA66',
      };
    }

    if (seat.seatType === 'VIP') {
      return {
        bg: 'transparent',
        border: colorRole('primary', '#d7960a'),
        textColor: colorRole('primary', '#d7960a'),
      };
    }

    if (seat.seatType === 'WHEELCHAIR_ACCESSIBLE') {
      return {
        bg: 'transparent',
        border: colorRole('secondary', '#CCC2DC'),
        textColor: colorRole('secondary', '#CCC2DC'),
      };
    }

    // Standard available
    return {
      bg: colorRole('surface-container-high', '#322F37'),
      border: colorRole('outline-variant', '#49454F'),
      textColor: colorRole('on-surface-variant', '#CAC4D0'),
    };
  };

  return (
    <View style={[styles.container, style]}>
      {/* Cinema Screen Indicator */}
      <View style={styles.screenWrapper}>
        <View
          style={[
            styles.screenCurve,
            { borderColor: colorRole('primary', '#d7960a') },
          ]}
        />
        <Text variant="label-small" colorRoleName="on-surface-variant" style={styles.screenText}>
          CINEMA SCREEN
        </Text>
      </View>

      {/* Interactive Seat Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.grid}>
          {rowLabels.map((row) => {
            const rowSeats = seats
              .filter((s) => s.rowLabel === row)
              .sort((a, b) => a.seatNumber - b.seatNumber);

            return (
              <View key={row} style={styles.rowContainer}>
                <Text
                  variant="label-small"
                  colorRoleName="on-surface-variant"
                  style={styles.rowHeader}
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
                        onPress={handleSeatPress}
                      />
                    );
                  })}
                </View>

                <Text
                  variant="label-small"
                  colorRoleName="on-surface-variant"
                  style={styles.rowHeader}
                >
                  {row}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colorRole('surface-container-high', '#322F37') },
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
              { backgroundColor: colorRole('primary', '#d7960a') },
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
              { backgroundColor: colorRole('tertiary-container', '#4E2600') },
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
              { backgroundColor: colorRole('surface-container-highest', '#36343B') },
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
                borderColor: colorRole('primary', '#d7960a'),
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacingVal('md', 16),
  },
  screenWrapper: {
    alignItems: 'center',
    marginBottom: spacingVal('xl', 24),
  },
  screenCurve: {
    width: '80%',
    height: 12,
    borderTopWidth: 4,
    borderRadius: 8,
    marginBottom: spacingVal('xs', 8),
  },
  screenText: {
    letterSpacing: 2,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: spacingVal('md', 16),
  },
  grid: {
    alignItems: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingVal('xs', 8),
  },
  rowHeader: {
    width: 24,
    textAlign: 'center',
    fontWeight: '700',
  },
  seatsRow: {
    flexDirection: 'row',
    marginHorizontal: spacingVal('xs', 8),
  },
  seat: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatNumber: {
    fontSize: 10,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacingVal('lg', 20),
    gap: spacingVal('md', 16),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingVal('xxs', 4),
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
});

