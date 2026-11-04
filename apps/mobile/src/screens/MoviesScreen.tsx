// apps/mobile/src/screens/MoviesScreen.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { colorRole, spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import {
  Text,
  Card,
  MovieCard,
  Chip,
  Input,
  Skeleton,
  EmptyState,
  Badge,
} from '../components';
import { apiRequest } from '../api/client';

export interface ShowtimeSlot {
  id: string;
  startTime: string;
  endTime?: string;
  cinemaName: string;
  auditoriumName: string;
  basePriceKobo: number;
}

interface MovieItem {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
  runtimeMinutes?: number | null;
  lowestPriceKobo?: number;
  cinemaName?: string;
  nextShowtime?: string;
  showtimes?: ShowtimeSlot[];
}

export const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'MoviesTab'>>();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState(route.params?.initialSearch || '');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'now-playing' | 'upcoming' | 'active-showtimes'>(
    route.params?.filter || 'all'
  );
  const [selectedRegion, setSelectedRegion] = useState<'GLOBAL' | 'NG'>(
    route.params?.region || 'GLOBAL'
  );
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      rawDate: Date;
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
        rawDate: d,
      });
    }

    return days;
  }, []);

  const todayIndex = weekDays.findIndex((d) => d.isToday);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0);

  // Synchronize when route params change (e.g. redirected from Home "See All")
  useEffect(() => {
    if (route.params) {
      if (route.params.initialSearch !== undefined) {
        setSearchQuery(route.params.initialSearch);
      }
      if (route.params.filter) {
        setSelectedFilter(route.params.filter);
      }
      if (route.params.region) {
        setSelectedRegion(route.params.region);
      }
    }
  }, [route.params]);

  const fetchMovies = async (
    query = searchQuery,
    filter = selectedFilter,
    region = selectedRegion
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      let endpoint = `/v1/movies/now-playing?region=${region}`;
      if (query.trim().length > 0) {
        endpoint = `/v1/movies/search?q=${encodeURIComponent(query.trim())}`;
      } else if (filter === 'upcoming') {
        endpoint = `/v1/movies/upcoming?region=${region}`;
      } else if (filter === 'active-showtimes') {
        endpoint = `/v1/movies/with-showtimes`;
      }

      const result = await apiRequest<{ movies: MovieItem[] }>(endpoint);
      setMovies(result.movies || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load movie catalogue');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovies(searchQuery, selectedFilter, selectedRegion);
  }, [selectedFilter, selectedRegion]);

  const handleSearchSubmit = () => {
    fetchMovies(searchQuery, selectedFilter, selectedRegion);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchMovies('', selectedFilter, selectedRegion);
  };

  // Filter movies and showtimes for the selected date
  const selectedDateKey = weekDays[selectedDayIndex]?.key;
  const moviesForSelectedDay = useMemo(() => {
    if (!selectedDateKey || selectedFilter !== 'active-showtimes') return [];

    return movies
      .map((movie) => {
        let matchingShowtimes = (movie.showtimes || []).filter((st) => {
          const stDate = new Date(st.startTime);
          const stYear = stDate.getFullYear();
          const stMonth = String(stDate.getMonth() + 1).padStart(2, '0');
          const stDay = String(stDate.getDate()).padStart(2, '0');
          const stKey = `${stYear}-${stMonth}-${stDay}`;
          return stKey === selectedDateKey;
        });

        // Fallback for legacy nextShowtime
        if (matchingShowtimes.length === 0 && movie.nextShowtime) {
          const stDate = new Date(movie.nextShowtime);
          const stYear = stDate.getFullYear();
          const stMonth = String(stDate.getMonth() + 1).padStart(2, '0');
          const stDay = String(stDate.getDate()).padStart(2, '0');
          const stKey = `${stYear}-${stMonth}-${stDay}`;
          if (stKey === selectedDateKey) {
            matchingShowtimes = [
              {
                id: movie.id,
                startTime: movie.nextShowtime,
                cinemaName: movie.cinemaName || 'Filmhouse Cinema',
                auditoriumName: 'Main Screen',
                basePriceKobo: movie.lowestPriceKobo || 450000,
              },
            ];
          }
        }

        return {
          ...movie,
          dayShowtimes: matchingShowtimes,
        };
      })
      .filter((movie) => movie.dayShowtimes.length > 0);
  }, [movies, selectedDateKey, selectedFilter]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headline-medium" colorRoleName="on-surface" style={styles.title}>
          Explore Movies
        </Text>
        <Text variant="body-small" colorRoleName="on-surface-variant">
          Discover latest blockbusters, active showtimes, and premieres
        </Text>

        {/* Search Input */}
        <Input
          placeholder="Search titles, actors, directors..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          leadingIcon="search"
          trailingIcon={searchQuery.length > 0 ? 'close-circle' : undefined}
          onTrailingPress={handleClearSearch}
          containerStyle={styles.searchContainer}
        />

        {/* Region Toggle Chips: Global vs Nollywood / Nigeria */}
        <View style={[styles.filterRow, { marginBottom: 8 }]}>
          <Chip
            label="🌍 Global Releases"
            isSelected={selectedRegion === 'GLOBAL'}
            onPress={() => setSelectedRegion('GLOBAL')}
          />
          <Chip
            label="🇳🇬 Nollywood / Nigeria"
            isSelected={selectedRegion === 'NG'}
            onPress={() => setSelectedRegion('NG')}
          />
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterRow, { paddingRight: 16 }]}
        >
          <Chip
            label="All Movies"
            isSelected={selectedFilter === 'all'}
            onPress={() => setSelectedFilter('all')}
            style={{ marginRight: 8 }}
          />
          <Chip
            label="Now Showing"
            isSelected={selectedFilter === 'now-playing'}
            onPress={() => setSelectedFilter('now-playing')}
            style={{ marginRight: 8 }}
          />
          <Chip
            label="Coming Soon"
            isSelected={selectedFilter === 'upcoming'}
            onPress={() => setSelectedFilter('upcoming')}
            style={{ marginRight: 8 }}
          />
          <Chip
            label="Active Showtimes"
            isSelected={selectedFilter === 'active-showtimes'}
            onPress={() => setSelectedFilter('active-showtimes')}
          />
        </ScrollView>

        {/* 1-Week Sunday to Saturday Schedule Bar (Shown when Active Showtimes is selected) */}
        {selectedFilter === 'active-showtimes' && (
          <View style={styles.weekSelectorContainer}>
            <View style={styles.weekScheduleHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar" size={14} color={colors.primary} style={{ marginRight: 5 }} />
                <Text variant="label-small" style={{ fontWeight: '700', color: colors.onSurface }}>
                  Schedule: {weekDays[selectedDayIndex]?.dayName}, {weekDays[selectedDayIndex]?.dateNumber} {weekDays[selectedDayIndex]?.monthName}
                </Text>
              </View>
              <Badge label="1-WEEK SCHEDULE" variant="warning" />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekSelectorScroll}
            >
              {weekDays.map((day, idx) => {
                const isSelected = selectedDayIndex === idx;
                return (
                  <TouchableOpacity
                    key={day.dayName}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      setSelectedDayIndex(idx);
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.weekDayTab,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(215, 150, 10, 0.22)'
                            : 'rgba(215, 150, 10, 0.14)'
                          : colors.surfaceContainer,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.outlineVariant,
                      },
                    ]}
                  >
                    <Text
                      variant="label-small"
                      style={[
                        styles.weekDayName,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.onSurfaceVariant,
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {day.dayName}
                    </Text>
                    <Text
                      variant="title-medium"
                      style={[
                        styles.weekDateNumber,
                        {
                          color: isSelected ? colors.primary : colors.onSurface,
                          fontWeight: '800',
                        },
                      ]}
                    >
                      {day.dateNumber}
                    </Text>
                    {day.isToday ? (
                      <View style={styles.todayIndicatorRow}>
                        <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />
                        <Text variant="label-small" style={{ fontSize: 9, color: colors.primary, fontWeight: '700' }}>
                          TODAY
                        </Text>
                      </View>
                    ) : (
                      <Text
                        variant="label-small"
                        style={[
                          styles.monthLabel,
                          { color: colors.onSurfaceVariant },
                        ]}
                      >
                        {day.monthName}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Movie Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              fetchMovies(searchQuery, selectedFilter, selectedRegion);
            }}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={styles.cardSkeletonWrapper}>
                <Skeleton width="100%" height={220} borderRadius={16} />
                <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
        ) : error ? (
          <EmptyState
            iconName="alert-circle"
            title="Connection Issue"
            message={error}
            actionLabel="Try Again"
            onAction={() => fetchMovies(searchQuery, selectedFilter)}
          />
        ) : selectedFilter === 'active-showtimes' ? (
          /* Active Showtimes 1-Week Lineup Display */
          moviesForSelectedDay.length === 0 ? (
            <Card style={[styles.emptyDayCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
              <Ionicons name="calendar-outline" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                No Showtimes on {weekDays[selectedDayIndex]?.dayName}, {weekDays[selectedDayIndex]?.dateNumber} {weekDays[selectedDayIndex]?.monthName}
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant" style={{ textAlign: 'center', marginTop: 4 }}>
                Select another day of the week above to view available movies and book ahead of time.
              </Text>
            </Card>
          ) : (
            <View style={styles.dayLineupContainer}>
              {moviesForSelectedDay.map((movie) => (
                <Card
                  key={movie.id}
                  style={[
                    styles.movieLineupCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.movieLineupTopRow}>
                    {movie.posterUrl ? (
                      <Image
                        source={{ uri: movie.posterUrl }}
                        style={styles.movieLineupPoster}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[styles.movieLineupPoster, styles.posterFallback, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Ionicons name="film" size={24} color="#8A8A9E" />
                      </View>
                    )}

                    <View style={styles.movieLineupInfo}>
                      <Text
                        variant="title-small"
                        colorRoleName="on-surface"
                        numberOfLines={2}
                        style={styles.lineupMovieTitle}
                      >
                        {movie.title}
                      </Text>

                      <View style={styles.metaRow}>
                        <Ionicons name="star" size={12} color="#FFD700" style={{ marginRight: 3 }} />
                        <Text variant="label-small" style={{ fontWeight: '700', color: colors.onSurface }}>
                          {movie.voteAverage ? movie.voteAverage.toFixed(1) : '7.5'}
                        </Text>
                        {movie.runtimeMinutes ? (
                          <Text variant="label-small" colorRoleName="on-surface-variant" style={{ marginLeft: 6 }}>
                            • {movie.runtimeMinutes} min
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.lineupLocationRow}>
                        <Ionicons name="location" size={12} color={colors.primary} style={{ marginRight: 3 }} />
                        <Text
                          variant="body-small"
                          colorRoleName="primary"
                          numberOfLines={1}
                          style={{ fontWeight: '600' }}
                        >
                          {movie.cinemaName || 'Filmhouse Cinema'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => navigation.navigate('MovieDetails', { movieId: movie.id })}
                        style={styles.viewDetailsLink}
                      >
                        <Text variant="label-small" colorRoleName="secondary" style={{ fontWeight: '700' }}>
                          View Details & Synopsis →
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Showtime Pills for this Day */}
                  <View style={[styles.showtimePillsSection, { borderTopColor: colors.outlineVariant }]}>
                    <Text variant="label-small" colorRoleName="on-surface-variant" style={styles.showtimePillsHeader}>
                      AVAILABLE SHOWTIMES:
                    </Text>
                    <View style={styles.showtimePillsRow}>
                      {movie.dayShowtimes.map((st) => {
                        const stTime = new Date(st.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        });
                        const isImax = st.auditoriumName.toLowerCase().includes('imax');

                        return (
                          <TouchableOpacity
                            key={st.id}
                            onPress={() => {
                              try {
                                Haptics.selectionAsync();
                              } catch {}
                              navigation.navigate('SeatMap', { showtimeId: st.id });
                            }}
                            activeOpacity={0.7}
                            style={[
                              styles.showtimePill,
                              {
                                backgroundColor: isImax
                                  ? isDark
                                    ? 'rgba(215, 150, 10, 0.22)'
                                    : 'rgba(215, 150, 10, 0.12)'
                                  : colors.surfaceContainerHigh,
                                borderColor: isImax ? colors.primary : colors.outlineVariant,
                              },
                            ]}
                          >
                            <Text
                              variant="label-medium"
                              style={[
                                styles.showtimePillTime,
                                { color: isImax ? colors.primary : colors.onSurface },
                              ]}
                            >
                              {stTime}
                            </Text>
                            <Text variant="label-small" style={{ fontSize: 9, color: colors.onSurfaceVariant, marginTop: 1 }}>
                              {isImax ? 'IMAX' : 'Standard'} • ₦{(st.basePriceKobo / 100).toLocaleString()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )
        ) : movies.length === 0 ? (
          <EmptyState
            iconName="film"
            title="No Results Found"
            message={
              searchQuery
                ? `No movies matched "${searchQuery}". Try a different keyword.`
                : 'No movies are currently available in this category.'
            }
          />
        ) : (
          /* Standard 2-Column Grid Display */
          <View style={styles.grid}>
            {movies.map((movie) => (
              <MovieCard
                key={movie.id}
                title={movie.title}
                posterUrl={movie.posterUrl}
                rating={movie.voteAverage}
                releaseYear={movie.releaseDate ? movie.releaseDate.split('-')[0] : undefined}
                onPress={() => navigation.navigate('MovieDetails', { movieId: movie.id })}
              />
            ))}
          </View>
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
  searchContainer: {
    marginTop: spacingVal('md', 16),
    marginBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: spacingVal('md', 16),
    gap: spacingVal('xs', 8),
  },
  weekSelectorContainer: {
    marginTop: spacingVal('md', 16),
  },
  weekScheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingVal('xs', 8),
  },
  weekSelectorScroll: {
    gap: spacingVal('xs', 8),
  },
  weekDayTab: {
    width: 62,
    height: 74,
    borderRadius: radiusVal('md', 12),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
  },
  weekDayName: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekDateNumber: {
    marginVertical: 1,
  },
  todayIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  monthLabel: {
    fontSize: 10,
  },
  scrollContent: {
    padding: spacingVal('md', 16),
    paddingBottom: 80,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardSkeletonWrapper: {
    width: '48%',
    marginBottom: spacingVal('md', 16),
  },
  dayLineupContainer: {
    gap: spacingVal('md', 16),
  },
  movieLineupCard: {
    padding: spacingVal('md', 16),
    borderRadius: radiusVal('lg', 16),
    borderWidth: 1,
  },
  movieLineupTopRow: {
    flexDirection: 'row',
    marginBottom: spacingVal('sm', 12),
  },
  movieLineupPoster: {
    width: 72,
    height: 104,
    borderRadius: radiusVal('sm', 8),
    backgroundColor: '#0B0B10',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieLineupInfo: {
    flex: 1,
    marginLeft: spacingVal('sm', 12),
    justifyContent: 'space-between',
  },
  lineupMovieTitle: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lineupLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  viewDetailsLink: {
    marginTop: 6,
  },
  showtimePillsSection: {
    borderTopWidth: 1,
    paddingTop: spacingVal('sm', 12),
  },
  showtimePillsHeader: {
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: spacingVal('xs', 8),
  },
  showtimePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingVal('xs', 8),
  },
  showtimePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radiusVal('sm', 8),
    borderWidth: 1,
    alignItems: 'center',
  },
  showtimePillTime: {
    fontWeight: '700',
  },
  emptyDayCard: {
    padding: spacingVal('lg', 20),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVal('lg', 16),
    borderWidth: 1,
    marginVertical: spacingVal('md', 16),
  },
});
