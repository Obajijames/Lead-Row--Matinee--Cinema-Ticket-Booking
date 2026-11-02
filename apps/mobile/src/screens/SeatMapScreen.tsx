// apps/mobile/src/screens/SeatMapScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colorRole, spacingVal } from '../tokens';
import {
  Text,
  ScreenHeader,
  Button,
  SeatMap,
  SeatItem,
  PriceSummary,
} from '../components';
import { apiRequest } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'SeatMap'>;

interface SeatMapData {
  showtimeId: string;
  auditoriumName: string;
  basePriceKobo: number;
  currency: string;
  totalSeats: number;
  seats: SeatItem[];
}

export const SeatMapScreen: React.FC<Props> = ({ route, navigation }) => {
  const { showtimeId } = route.params;
  const [data, setData] = useState<SeatMapData | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);

  const fetchSeats = async () => {
    try {
      const res = await apiRequest<SeatMapData>(`/v1/showtimes/${showtimeId}/seats`);
      setData(res);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load seating map');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();

    // Near real-time polling every 5 seconds to keep seat availability synchronized
    const pollInterval = setInterval(() => {
      apiRequest<SeatMapData>(`/v1/showtimes/${showtimeId}/seats`)
        .then((res) => {
          setData(res);
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [showtimeId]);

  const toggleSeat = (seatId: string) => {
    setSelectedSeatIds((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((id) => id !== seatId);
      }
      if (prev.length >= 10) {
        Alert.alert('Limit Reached', 'You can select a maximum of 10 seats per booking.');
        return prev;
      }
      return [...prev, seatId];
    });
  };

  // Calculate prices
  const basePrice = data ? data.basePriceKobo : 450000;
  const subtotalKobo = selectedSeatIds.reduce((sum, id) => {
    const seat = data?.seats.find((s) => s.id === id);
    const price = seat?.seatType === 'VIP' ? Math.round(basePrice * 1.5) : basePrice;
    return sum + price;
  }, 0);
  const serviceFeeKobo = selectedSeatIds.length > 0 ? 50000 : 0; // ₦500
  const totalAmountKobo = subtotalKobo + serviceFeeKobo;

  const handleAcquireHold = async () => {
    if (selectedSeatIds.length === 0) return;

    try {
      setIsHolding(true);
      const holdResult = await apiRequest<{ holdToken: string; showtimeId: string }>(
        `/v1/showtimes/${showtimeId}/holds`,
        {
          method: 'POST',
          body: JSON.stringify({ seatIds: selectedSeatIds }),
        }
      );

      // Navigate to Order Review with valid holdToken
      navigation.navigate('OrderReview', {
        holdToken: holdResult.holdToken,
        showtimeId: holdResult.showtimeId,
      });
    } catch (err: any) {
      if (err.code === 'SEAT_CONFLICT') {
        Alert.alert(
          'Seats Unavailable',
          'One or more of your chosen seats were just acquired by another guest. Please pick an alternative seat.',
          [{ text: 'Refresh', onPress: fetchSeats }]
        );
      } else {
        Alert.alert('Hold Failed', err.message || 'Could not reserve seats');
      }
    } finally {
      setIsHolding(false);
    }
  };

  if (isLoading || !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorRole('background', '#0B0B10') }]}>
        <ScreenHeader title="Select Seats" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colorRole('primary', '#d7960a')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorRole('background', '#0B0B10') }]}>
      <ScreenHeader
        title={data.auditoriumName}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Interactive Seat Grid */}
        <SeatMap
          seats={data.seats}
          selectedSeatIds={selectedSeatIds}
          onToggleSeat={toggleSeat}
        />

        {/* Real-time Order Summary */}
        {selectedSeatIds.length > 0 ? (
          <View style={styles.summaryWrapper}>
            <PriceSummary
              subtotalKobo={subtotalKobo}
              serviceFeeKobo={serviceFeeKobo}
              totalAmountKobo={totalAmountKobo}
              ticketCount={selectedSeatIds.length}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Persistent Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colorRole('surface-container', '#1D1B20'),
            borderColor: colorRole('outline-variant', '#49454F'),
          },
        ]}
      >
        <View>
          <Text variant="label-medium" colorRoleName="on-surface-variant">
            {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'Seat' : 'Seats'} Selected
          </Text>
          <Text variant="headline-small" colorRoleName="primary" style={styles.totalText}>
            {selectedSeatIds.length > 0 ? `₦${(totalAmountKobo / 100).toLocaleString()}` : '₦0.00'}
          </Text>
        </View>

        <Button
          label={isHolding ? 'Reserving...' : 'Confirm Seats'}
          isLoading={isHolding}
          isDisabled={selectedSeatIds.length === 0 || isHolding}
          onPress={handleAcquireHold}
          size="md"
          variant="primary"
          style={styles.confirmBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  summaryWrapper: {
    paddingHorizontal: spacingVal('md', 16),
    marginTop: spacingVal('md', 16),
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingVal('lg', 20),
    paddingVertical: spacingVal('md', 16),
    borderTopWidth: 1,
  },
  totalText: {
    fontWeight: '800',
  },
  confirmBtn: {
    minWidth: 160,
  },
});

