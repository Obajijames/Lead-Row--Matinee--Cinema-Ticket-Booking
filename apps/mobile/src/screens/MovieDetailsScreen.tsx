// apps/mobile/src/screens/MovieDetailsScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colorRole, spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import {
  Text,
  ScreenHeader,
  Card,
  Badge,
  Button,
  EmptyState,
  formatKoboToNaira,
} from '../components';
import { apiRequest } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

interface ShowtimeItem {
  id: string;
  startTime: string;
  endTime: string;
  basePriceKobo: number;
  auditorium: {
    name: string;
    cinema: {
      name: string;
      city: string;
    };
  };
}

interface MovieDetails {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  voteAverage: number;
  genres?: string[];
  tagline?: string | null;
  showtimes?: ShowtimeItem[];
}

export const MovieDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { movieId } = route.params;
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setError(null);
      const data = await apiRequest<MovieDetails>(`/v1/movies/${movieId}`);
      setMovie(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load movie details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [movieId]);

  // 1-Week Sunday to Saturday schedule generator
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0: Sunday, 1: Monday ... 6: Saturday
    const days: Array<{
      key: string;
      dayName: string;
      dateNumber: number;
      monthName: string;
      isToday: boolean;
    }> = [];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      let dayDiff = i - currentDayOfWeek;
      if (dayDiff < 0) {
        dayDiff += 7;
      }
      d.setDate(now.getDate() + dayDiff);
      d.setHours(0, 0, 0, 0);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateNum = String(d.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${dateNum}`;

      days.push({
        key,
        dayName: dayNames[i],
        dateNumber: d.getDate(),
        monthName: monthNames[d.getMonth()],
        isToday: dayDiff === 0,
      });
    }

    return days;
  }, []);

  const [selectedDayKey, setSelectedDayKey] = useState<string>('all');

  const filteredShowtimes = useMemo(() => {
    if (!movie?.showtimes) return [];
    if (selectedDayKey === 'all') return movie.showtimes;

    return movie.showtimes.filter((st) => {
      const stDate = new Date(st.startTime);
      const stYear = stDate.getFullYear();
      const stMonth = String(stDate.getMonth() + 1).padStart(2, '0');
      const stDay = String(stDate.getDate()).padStart(2, '0');
      const stKey = `${stYear}-${stMonth}-${stDay}`;
      return stKey === selectedDayKey;
    });
  }, [movie?.showtimes, selectedDayKey]);

  const formatShowtime = (iso: string): string => {
    const d = new Date(iso);
    const timeStr = d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${dateStr} • ${timeStr}`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Movie Details" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !movie) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Movie Details" onBack={() => navigation.goBack()} />
        <EmptyState
          iconName="alert-circle"
          title="Movie Unavailable"
          message={error || 'Could not find details for this movie.'}
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title={movie.title} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Backdrop Image with progressive disk caching */}
        {movie.backdropUrl ? (
          <Image
            source={{ uri: movie.backdropUrl }}
            style={styles.backdrop}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : null}

        <View style={styles.content}>
          {/* Header Info */}
          <Text variant="headline-medium" colorRoleName="on-surface" style={styles.title}>
            {movie.title}
          </Text>

          {movie.tagline ? (
            <Text variant="body-medium" colorRoleName="primary" style={styles.tagline}>
              "{movie.tagline}"
            </Text>
          ) : null}

          {/* Metadata Badges */}
          <View style={styles.metaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color="#FFD700" style={{ marginRight: 4 }} />
              <Text variant="label-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                {movie.voteAverage.toFixed(1)}
              </Text>
            </View>
            {movie.runtimeMinutes ? (
              <Badge label={`${movie.runtimeMinutes} mins`} variant="neutral" />
            ) : null}
            {movie.releaseDate ? (
              <Badge label={movie.releaseDate.split('-')[0]} variant="neutral" />
            ) : null}
          </View>

          {/* Synopsis */}
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionTitle}>
            Synopsis
          </Text>
          <Text variant="body-medium" colorRoleName="on-surface-variant" style={styles.overview}>
            {movie.overview}
          </Text>

          {/* Showtimes & Booking Section with 1-Week (Sunday to Saturday) schedule */}
          <View style={styles.showtimeTitleRow}>
            <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionTitle}>
              Available Showtimes
            </Text>
            <Badge label="1-WEEK SCHEDULE" variant="warning" />
          </View>

          {/* 1-Week Sunday to Saturday selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekSelectorScroll}
          >
            <TouchableOpacity
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setSelectedDayKey('all');
              }}
              style={[
                styles.dayChip,
                {
                  backgroundColor: selectedDayKey === 'all'
                    ? colors.primaryContainer
                    : colors.surfaceContainer,
                  borderColor: selectedDayKey === 'all'
                    ? colors.primary
                    : colors.outlineVariant,
                },
              ]}
            >
              <Text
                variant="label-small"
                style={{
                  fontWeight: '700',
                  color: selectedDayKey === 'all' ? colors.primary : colors.onSurface,
                }}
              >
                All Days
              </Text>
            </TouchableOpacity>

            {weekDays.map((day) => {
              const isSelected = selectedDayKey === day.key;
              return (
                <TouchableOpacity
                  key={day.dayName}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setSelectedDayKey(day.key);
                  }}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryContainer
                        : colors.surfaceContainer,
                      borderColor: isSelected
                        ? colors.primary
                        : colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    variant="label-small"
                    style={{
                      fontWeight: isSelected ? '800' : '600',
                      color: isSelected ? colors.primary : colors.onSurfaceVariant,
                    }}
                  >
                    {day.dayName} {day.dateNumber}
                  </Text>
                  {day.isToday && (
                    <View style={[styles.todayIndicatorDot, { backgroundColor: colors.primary }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredShowtimes.length > 0 ? (
            filteredShowtimes.map((st) => (
              <Card key={st.id} style={styles.showtimeCard}>
                <View style={styles.showtimeHeader}>
                  <View>
                    <Text variant="title-small" colorRoleName="on-surface">
                      {st.auditorium.cinema.name}
                    </Text>
                    <Text variant="body-small" colorRoleName="on-surface-variant">
                      {st.auditorium.name} • {st.auditorium.cinema.city}
                    </Text>
                  </View>
                  <Text variant="title-medium" colorRoleName="primary" style={styles.price}>
                    {formatKoboToNaira(st.basePriceKobo)}
                  </Text>
                </View>

                <View style={[styles.showtimeFooter, { borderTopColor: colors.outlineVariant }]}>
                  <View style={styles.timeWrapper}>
                    <Ionicons name="time" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text variant="body-medium" colorRoleName="on-surface" style={styles.timeLabel}>
                      {formatShowtime(st.startTime)}
                    </Text>
                  </View>
                  <Button
                    label="Select Seats"
                    size="sm"
                    variant="primary"
                    onPress={() => navigation.navigate('SeatMap', { showtimeId: st.id })}
                  />
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.noShowtimesCard}>
              <Ionicons name="calendar-outline" size={24} color={colors.onSurfaceVariant} style={{ marginBottom: 6 }} />
              <Text variant="body-medium" colorRoleName="on-surface-variant" style={{ textAlign: 'center' }}>
                No active showtimes scheduled for this title on the selected day. Try selecting "All Days" or another day of the week!
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: spacingVal('xl', 24),
  },
  backdrop: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
  },
  content: {
    padding: spacingVal('md', 16),
  },
  title: {
    fontWeight: '800',
    marginBottom: spacingVal('xxs', 4),
  },
  tagline: {
    fontStyle: 'italic',
    marginBottom: spacingVal('xs', 8),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingVal('xs', 8),
    marginBottom: spacingVal('md', 16),
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d7960a',
    paddingHorizontal: spacingVal('xs', 8),
    paddingVertical: spacingVal('xxs', 4),
    borderRadius: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    marginTop: spacingVal('md', 16),
    marginBottom: spacingVal('xs', 8),
  },
  overview: {
    lineHeight: 22,
    marginBottom: spacingVal('md', 16),
  },
  showtimeCard: {
    marginBottom: spacingVal('sm', 12),
  },
  showtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacingVal('sm', 12),
  },
  price: {
    fontWeight: '700',
  },
  showtimeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacingVal('xs', 8),
    borderTopWidth: 1,
    borderTopColor: '#322F37',
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontWeight: '600',
  },
  noShowtimesCard: {
    padding: spacingVal('md', 16),
    alignItems: 'center',
  },
  showtimeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacingVal('md', 16),
    marginBottom: spacingVal('xs', 8),
  },
  weekSelectorScroll: {
    paddingVertical: spacingVal('xs', 8),
    gap: spacingVal('xs', 8),
    marginBottom: spacingVal('sm', 12),
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radiusVal('md', 12),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});

