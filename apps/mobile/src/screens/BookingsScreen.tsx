// apps/mobile/src/screens/BookingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colorRole, spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import {
  Text,
  Card,
  Badge,
  Button,
  EmptyState,
} from '../components';

interface BookingRecord {
  id: string;
  movieTitle: string;
  cinemaName: string;
  auditoriumName: string;
  seats: string[];
  startTime: string;
  totalAmountKobo: number;
  status: 'CONFIRMED' | 'PENDING' | 'USED';
}

const SAMPLE_BOOKINGS: BookingRecord[] = [
  {
    id: 'bkg_10928a-live',
    movieTitle: 'Dune: Part Two',
    cinemaName: 'Filmhouse IMAX Lekki',
    auditoriumName: 'Screen 1 (IMAX)',
    seats: ['D8', 'D9'],
    startTime: new Date(Date.now() + 86400000).toISOString(),
    totalAmountKobo: 1350000,
    status: 'CONFIRMED',
  },
  {
    id: 'bkg_09823f-live',
    movieTitle: 'Deadpool & Wolverine',
    cinemaName: 'Silverbird Galleria Victoria Island',
    auditoriumName: 'Cinema 2',
    seats: ['F12'],
    startTime: new Date(Date.now() - 86400000 * 3).toISOString(),
    totalAmountKobo: 500000,
    status: 'USED',
  },
];

export const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings] = useState<BookingRecord[]>(SAMPLE_BOOKINGS);

  const filteredBookings = bookings.filter((b) =>
    activeTab === 'upcoming' ? b.status === 'CONFIRMED' : b.status === 'USED'
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headline-medium" colorRoleName="on-surface" style={styles.title}>
          My Tickets
        </Text>
        <Text variant="body-small" colorRoleName="on-surface-variant">
          Your cinema admissions, active holds, and past orders
        </Text>

        {/* Tab Selector */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'upcoming' && [
                styles.tabButtonActive,
                { borderColor: colors.primary, backgroundColor: 'rgba(215, 150, 10, 0.16)' },
              ],
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              variant="label-medium"
              colorRoleName={activeTab === 'upcoming' ? 'primary' : 'on-surface-variant'}
              style={{ fontWeight: '700' }}
            >
              Upcoming ({bookings.filter((b) => b.status === 'CONFIRMED').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'past' && [
                styles.tabButtonActive,
                { borderColor: colors.primary, backgroundColor: 'rgba(215, 150, 10, 0.16)' },
              ],
            ]}
            onPress={() => setActiveTab('past')}
          >
            <Text
              variant="label-medium"
              colorRoleName={activeTab === 'past' ? 'primary' : 'on-surface-variant'}
              style={{ fontWeight: '700' }}
            >
              Past Bookings
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredBookings.length === 0 ? (
          <EmptyState
            iconName="ticket"
            title="No Bookings Found"
            message={
              activeTab === 'upcoming'
                ? 'You do not have any upcoming showtime tickets reserved.'
                : 'No past booking history found.'
            }
            actionLabel={activeTab === 'upcoming' ? 'Browse Showtimes' : undefined}
            onAction={activeTab === 'upcoming' ? () => navigation.navigate('Home') : undefined}
          />
        ) : (
          filteredBookings.map((b) => {
            const isActive = b.status === 'CONFIRMED';
            return (
              <Card
                key={b.id}
                style={[
                  styles.ticketCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: isActive
                      ? isDark
                        ? 'rgba(215, 150, 10, 0.45)'
                        : 'rgba(215, 150, 10, 0.7)'
                      : colors.cardBorder,
                    borderLeftWidth: isActive ? 4 : 1,
                    borderLeftColor: isActive ? colors.primary : colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Badge
                    label={isActive ? 'ACTIVE TICKET' : 'COMPLETED'}
                    variant={isActive ? 'success' : 'neutral'}
                  />
                  <Text variant="label-small" colorRoleName="outline">
                    #{b.id.slice(0, 10).toUpperCase()}
                  </Text>
                </View>

                <Text variant="title-medium" colorRoleName="on-surface" style={styles.movieTitle}>
                  {b.movieTitle}
                </Text>

                <View style={styles.cinemaLocationRow}>
                  <Ionicons name="location" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text variant="body-small" colorRoleName="primary" style={{ fontWeight: '600' }}>
                    {b.cinemaName}
                  </Text>
                </View>
                <Text variant="body-small" colorRoleName="on-surface-variant">
                  {b.auditoriumName} • Seats: {b.seats.join(', ')}
                </Text>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                <View style={styles.footerRow}>
                  <View>
                    <Text variant="label-small" colorRoleName="outline">
                      TOTAL PAID
                    </Text>
                    <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                      ₦{(b.totalAmountKobo / 100).toLocaleString()}
                    </Text>
                  </View>

                  {b.status === 'CONFIRMED' && (
                    <Button
                      label="View QR Pass"
                      variant="primary"
                      size="sm"
                      onPress={() => navigation.navigate('Ticket', { ticketToken: b.id })}
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacingVal('md', 16),
    paddingTop: spacingVal('sm', 12),
    paddingBottom: spacingVal('xs', 8),
  },
  title: {
    fontWeight: '800',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: radiusVal('md', 12),
    padding: 4,
    marginTop: spacingVal('md', 16),
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radiusVal('sm', 8),
  },
  tabButtonActive: {
    borderWidth: 1,
  },
  scrollContent: {
    padding: spacingVal('md', 16),
    paddingBottom: 80,
  },
  ticketCard: {
    borderWidth: 1,
    borderRadius: radiusVal('lg', 16),
    padding: spacingVal('md', 16),
    marginBottom: spacingVal('md', 16),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingVal('sm', 12),
  },
  movieTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  cinemaLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginVertical: spacingVal('sm', 12),
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

