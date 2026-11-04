// apps/mobile/src/screens/BookingsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { apiRequest } from '../api/client';
import { getUserBookingIds, getUserEmail } from '../utils/bookingStorage';
import {
  Text,
  Card,
  Badge,
  Button,
  EmptyState,
} from '../components';

export interface BookingRecord {
  id: string;
  movieTitle: string;
  posterUrl?: string | null;
  cinemaName: string;
  auditoriumName: string;
  seats: string[];
  startTime: string;
  totalAmountKobo: number;
  status: 'CONFIRMED' | 'PENDING' | 'USED' | 'CANCELLED';
  ticketToken?: string;
  createdAt?: string;
}

export const BookingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBookings = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const [ids, email] = await Promise.all([
        getUserBookingIds(),
        getUserEmail(),
      ]);

      const queryParams: string[] = [];
      if (ids.length > 0) {
        queryParams.push(`ids=${ids.join(',')}`);
      }
      if (email) {
        queryParams.push(`email=${encodeURIComponent(email)}`);
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const res = await apiRequest<BookingRecord[]>(`/v1/bookings${queryString}`);

      if (Array.isArray(res)) {
        setBookings(res);
      }
    } catch (err) {
      console.warn('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings(bookings.length === 0);
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchBookings(false);
  };

  const upcomingBookings = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');
  const pastBookings = bookings.filter((b) => b.status === 'USED' || b.status === 'CANCELLED');
  const filteredBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

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
              Upcoming ({upcomingBookings.length})
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
              Past Bookings ({pastBookings.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 12 }}>
              Loading your tickets...
            </Text>
          </View>
        ) : filteredBookings.length === 0 ? (
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
            const isPending = b.status === 'PENDING';

            let badgeVariant: 'success' | 'warning' | 'neutral' | 'error' = 'neutral';
            let badgeLabel = 'COMPLETED';
            if (isActive) {
              badgeVariant = 'success';
              badgeLabel = 'ACTIVE TICKET';
            } else if (isPending) {
              badgeVariant = 'warning';
              badgeLabel = 'PENDING PAYMENT';
            } else if (b.status === 'CANCELLED') {
              badgeVariant = 'error';
              badgeLabel = 'CANCELLED';
            }

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
                  <Badge label={badgeLabel} variant={badgeVariant} />
                  <Text variant="label-small" colorRoleName="outline">
                    #{b.id.slice(0, 8).toUpperCase()}
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

                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={13} color={colors.onSurfaceVariant} style={{ marginRight: 4 }} />
                  <Text variant="label-small" colorRoleName="on-surface-variant">
                    {new Date(b.startTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

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

                  {(isActive || isPending) && (
                    <Button
                      label={isActive ? 'View QR Pass' : 'View Order'}
                      variant="primary"
                      size="sm"
                      onPress={() => navigation.navigate('Ticket', { ticketToken: b.ticketToken || b.id })}
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
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: spacingVal('xxs', 4),
  },
  cinemaLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingVal('xxs', 4),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacingVal('xxs', 4),
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
