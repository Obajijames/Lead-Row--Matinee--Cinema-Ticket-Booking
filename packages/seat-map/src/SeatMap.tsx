// packages/seat-map/src/SeatMap.tsx
import React, { useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { SeatItem, SeatMapProps, SeatThemeColors } from './SeatMap.types';

const DEFAULT_THEME: Required<SeatThemeColors> = {
  availableBg: '#242436',
  availableBorder: '#3C3C54',
  availableText: '#E6E6FA',

  selectedBg: '#D7960A',
  selectedBorder: '#FFD700',
  selectedText: '#0B0B10',

  heldBg: '#D97706',
  heldBorder: '#F59E0B',
  heldText: '#FFFFFF',

  soldBg: '#151520',
  soldBorder: '#232330',
  soldText: '#626278',

  vipBorder: '#FFD700',
  screenColor: '#D7960A',
};

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  onToggleSeat,
  maxSelectable,
  onMaxSelectionReached,
  theme = {},
  showScreen = true,
  screenLabel = 'CINEMA SCREEN',
  showLegend = true,
  style,
  seatSize = 32,
}) => {
  const activeTheme: Required<SeatThemeColors> = useMemo(
    () => ({ ...DEFAULT_THEME, ...theme }),
    [theme]
  );

  // Group seats by row label preserving natural theater order
  const rows = useMemo(() => {
    const grouped = new Map<string, SeatItem[]>();
    for (const seat of seats) {
      if (!grouped.has(seat.rowLabel)) {
        grouped.set(seat.rowLabel, []);
      }
      grouped.get(seat.rowLabel)!.push(seat);
    }

    // Sort seats in each row by seatNumber
    for (const [, rowSeats] of grouped) {
      rowSeats.sort((a, b) => a.seatNumber - b.seatNumber);
    }

    return Array.from(grouped.entries());
  }, [seats]);

  const handleSeatPress = (seat: SeatItem) => {
    const isSelected = selectedSeatIds.includes(seat.id);
    if (!isSelected && maxSelectable && selectedSeatIds.length >= maxSelectable) {
      if (onMaxSelectionReached) {
        onMaxSelectionReached(maxSelectable);
      }
      return;
    }

    onToggleSeat(seat.id);
  };

  const getSeatVisuals = (seat: SeatItem, isSelected: boolean) => {
    if (isSelected) {
      return {
        bg: activeTheme.selectedBg,
        border: activeTheme.selectedBorder,
        textColor: activeTheme.selectedText,
      };
    }

    switch (seat.status) {
      case 'AVAILABLE':
        return {
          bg: activeTheme.availableBg,
          border: seat.seatType === 'VIP' ? activeTheme.vipBorder : activeTheme.availableBorder,
          textColor: activeTheme.availableText,
        };
      case 'HELD':
        return {
          bg: activeTheme.heldBg,
          border: activeTheme.heldBorder,
          textColor: activeTheme.heldText,
        };
      case 'SOLD':
      default:
        return {
          bg: activeTheme.soldBg,
          border: activeTheme.soldBorder,
          textColor: activeTheme.soldText,
        };
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* 1. Curved Cinema Screen Indicator */}
      {showScreen && (
        <View style={styles.screenContainer}>
          <View
            style={[
              styles.screenCurvedBar,
              { borderTopColor: activeTheme.screenColor, shadowColor: activeTheme.screenColor },
            ]}
          />
          <Text style={[styles.screenText, { color: activeTheme.screenColor }]}>
            {screenLabel}
          </Text>
        </View>
      )}

      {/* 2. Interactive Seating Grid with Horizontal & Vertical Scrolling */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.gridContainer}>
          {rows.map(([rowLabel, rowSeats]) => (
            <View key={rowLabel} style={styles.rowWrapper}>
              {/* Left Row Indicator */}
              <View style={styles.rowLabelBox}>
                <Text style={styles.rowLabelText}>{rowLabel}</Text>
              </View>

              {/* Row Seats */}
              <View style={styles.seatsRow}>
                {rowSeats.map((seat) => {
                  const isSelected = selectedSeatIds.includes(seat.id);
                  const isInteractive = seat.status === 'AVAILABLE' || isSelected;
                  const visuals = getSeatVisuals(seat, isSelected);

                  return (
                    <Pressable
                      key={seat.id}
                      onPress={() => isInteractive && handleSeatPress(seat)}
                      disabled={!isInteractive}
                      accessibilityRole="button"
                      accessibilityLabel={`Seat ${seat.rowLabel}${seat.seatNumber}, ${seat.seatType}, ${
                        isSelected ? 'Selected' : seat.status
                      }`}
                      style={({ pressed }) => [
                        styles.seatItem,
                        {
                          width: seatSize,
                          height: seatSize,
                          backgroundColor: visuals.bg,
                          borderColor: visuals.border,
                          borderWidth: seat.seatType === 'VIP' && !isSelected ? 1.5 : 1,
                          opacity: pressed && isInteractive ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.seatNumberText, { color: visuals.textColor }]}>
                        {seat.seatType === 'WHEELCHAIR_ACCESSIBLE' ? '♿' : seat.seatNumber}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Right Row Indicator */}
              <View style={styles.rowLabelBox}>
                <Text style={styles.rowLabelText}>{rowLabel}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 3. Legend */}
      {showLegend && (
        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: activeTheme.availableBg, borderColor: activeTheme.availableBorder },
                ]}
              />
              <Text style={styles.legendLabel}>Available</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: activeTheme.selectedBg, borderColor: activeTheme.selectedBorder },
                ]}
              />
              <Text style={styles.legendLabel}>Selected</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: activeTheme.heldBg, borderColor: activeTheme.heldBorder },
                ]}
              />
              <Text style={styles.legendLabel}>Reserved</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: activeTheme.soldBg, borderColor: activeTheme.soldBorder },
                ]}
              />
              <Text style={styles.legendLabel}>Sold</Text>
            </View>
          </View>

          <View style={[styles.legendRow, { marginTop: 8 }]}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  {
                    backgroundColor: activeTheme.availableBg,
                    borderColor: activeTheme.vipBorder,
                    borderWidth: 1.5,
                  },
                ]}
              />
              <Text style={styles.legendLabel}>VIP Recliner</Text>
            </View>

            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendIndicator,
                  { backgroundColor: activeTheme.availableBg, borderColor: activeTheme.availableBorder },
                ]}
              >
                <Text style={{ fontSize: 9, color: activeTheme.availableText }}>♿</Text>
              </View>
              <Text style={styles.legendLabel}>Accessible</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  screenContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    paddingHorizontal: 20,
  },
  screenCurvedBar: {
    width: '90%',
    height: 14,
    borderTopWidth: 4,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 4,
  },
  screenText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gridContainer: {
    alignItems: 'center',
  },
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowLabelBox: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A9E',
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  seatItem: {
    borderRadius: 6,
    marginHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatNumberText: {
    fontSize: 10,
    fontWeight: '700',
  },
  legendContainer: {
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A0A0B2',
  },
});

