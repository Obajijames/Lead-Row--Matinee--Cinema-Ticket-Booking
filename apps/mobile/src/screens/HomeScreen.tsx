// apps/mobile/src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colorRole, spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import {
  Text,
  MovieCard,
  Button,
  Badge,
  Input,
  Chip,
  Skeleton,
  EmptyState,
  BottomSheet,
} from '../components';
import { apiRequest } from '../api/client';

export interface CinemaLocation {
  id: string;
  name: string;
  city: string;
  area: string;
  address: string;
  distanceKm: number;
  features: string[];
}

const CINEMA_LOCATIONS: CinemaLocation[] = [
  {
    id: 'cin-filmhouse-lekki',
    name: 'Filmhouse IMAX Lekki',
    city: 'Lagos',
    area: 'Lekki Phase 1',
    address: 'The Rock Drive, off Bisola Durosinmi Etti Drive',
    distanceKm: 1.8,
    features: ['IMAX 3D', 'VIP Dining', 'Dolby Atmos'],
  },
  {
    id: 'cin-genesis-palms',
    name: 'Genesis Cinemas Palms',
    city: 'Lagos',
    area: 'Lekki / Oniru',
    address: 'The Palms Shopping Mall, Bisway Street',
    distanceKm: 3.4,
    features: ['4K Laser', 'Recliner Seats'],
  },
  {
    id: 'cin-landmark-center',
    name: 'Filmhouse Landmark Center',
    city: 'Lagos',
    area: 'Victoria Island',
    address: 'Water Corporation Drive, Oniru',
    distanceKm: 4.6,
    features: ['Beachfront Cinema', 'Dolby Atmos'],
  },
  {
    id: 'cin-silverbird-vi',
    name: 'Silverbird Galleria VI',
    city: 'Lagos',
    area: 'Victoria Island',
    address: '133 Ahmadu Bello Way, Victoria Island',
    distanceKm: 5.2,
    features: ['ScreenX', 'VIP Lounge'],
  },
  {
    id: 'cin-genesis-maryland',
    name: 'Genesis Cinemas Maryland',
    city: 'Lagos',
    area: 'Maryland (Mainland)',
    address: 'Maryland Mall, 350-360 Ikorodu Road',
    distanceKm: 12.8,
    features: ['Laser Projection', 'Arcade'],
  },
  {
    id: 'cin-silverbird-ikeja',
    name: 'Silverbird Cinemas Ikeja',
    city: 'Lagos',
    area: 'Ikeja (Mainland)',
    address: 'Ikeja City Mall, Obafemi Awolowo Way, Alausa',
    distanceKm: 14.5,
    features: ['Dolby Surround', 'Party Hall'],
  },
  {
    id: 'cin-silverbird-jabi',
    name: 'Silverbird Cinemas Jabi Lake',
    city: 'Abuja',
    area: 'Jabi District',
    address: 'Jabi Lake Mall, Bala Sokoto Way',
    distanceKm: 512,
    features: ['Waterfront Screen', 'VIP Lounge'],
  },
];

interface MovieItem {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();

  const [nowPlaying, setNowPlaying] = useState<MovieItem[]>([]);
  const [upcoming, setUpcoming] = useState<MovieItem[]>([]);
  const [activeShowtimes, setActiveShowtimes] = useState<
    (MovieItem & { nextShowtime?: string; lowestPriceKobo?: number; cinemaName?: string })[]
  >([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<
    'all' | 'now-playing' | 'upcoming' | 'active-showtimes'
  >('all');
  const [featuredMovie, setFeaturedMovie] = useState<MovieItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCinema, setSelectedCinema] = useState<CinemaLocation>(CINEMA_LOCATIONS[0]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [cinemaSearch, setCinemaSearch] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState<'All' | 'Lekki & VI' | 'Mainland' | 'Abuja'>('All');
  const [isLocating, setIsLocating] = useState(false);
  const [cinemas, setCinemas] = useState<CinemaLocation[]>(CINEMA_LOCATIONS);
  const [movieRegion, setMovieRegion] = useState<'GLOBAL' | 'NG'>('GLOBAL');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = async (query: string) => {
    const q = query.trim();
    if (q.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    try {
      setIsSearching(true);
      const res = await apiRequest<{ movies: MovieItem[] }>(
        `/v1/movies/search?q=${encodeURIComponent(q)}`
      );
      setSearchResults(res.movies || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUseCurrentLocation = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
      const sorted = [...cinemas].sort((a, b) => a.distanceKm - b.distanceKm);
      setCinemas(sorted);
      setSelectedCinema(sorted[0]);
      Alert.alert(
        'Location Detected',
        `Nearest cinema is ${sorted[0].name} (${sorted[0].distanceKm} km away in ${sorted[0].area}).`,
        [{ text: 'OK', onPress: () => setShowLocationModal(false) }]
      );
    }, 700);
  };

  const handleSelectCinema = (cinema: CinemaLocation) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedCinema(cinema);
    setShowLocationModal(false);
  };

  const filteredCinemas = cinemas.filter((c) => {
    const matchesSearch =
      cinemaSearch.trim() === '' ||
      c.name.toLowerCase().includes(cinemaSearch.toLowerCase()) ||
      c.area.toLowerCase().includes(cinemaSearch.toLowerCase()) ||
      c.city.toLowerCase().includes(cinemaSearch.toLowerCase());

    const matchesCity =
      selectedCityFilter === 'All' ||
      (selectedCityFilter === 'Lekki & VI' &&
        (c.area.includes('Lekki') || c.area.includes('Victoria Island') || c.area.includes('Oniru'))) ||
      (selectedCityFilter === 'Mainland' &&
        (c.area.includes('Mainland') || c.area.includes('Ikeja') || c.area.includes('Maryland'))) ||
      (selectedCityFilter === 'Abuja' && c.city === 'Abuja');

    return matchesSearch && matchesCity;
  });

  const fetchHomeData = async (region = movieRegion) => {
    try {
      setError(null);

      const [nowPlayingRes, upcomingRes, activeShowtimesRes] = await Promise.all([
        apiRequest<{ movies: MovieItem[] }>(`/v1/movies/now-playing?region=${region}`),
        apiRequest<{ movies: MovieItem[] }>(`/v1/movies/upcoming?region=${region}`).catch(() => ({ movies: [] })),
        apiRequest<{ movies: (MovieItem & { nextShowtime?: string; lowestPriceKobo?: number; cinemaName?: string })[] }>(
          `/v1/movies/with-showtimes`
        ).catch(() => ({ movies: [] })),
      ]);

      const nowPlayingList = nowPlayingRes.movies || [];
      const upcomingList = upcomingRes.movies || [];
      const activeList = activeShowtimesRes.movies || [];

      setNowPlaying(nowPlayingList);
      setUpcoming(upcomingList);
      setActiveShowtimes(activeList);

      if (nowPlayingList.length > 0) {
        setFeaturedMovie(nowPlayingList[0]);
      } else if (activeList.length > 0) {
        setFeaturedMovie(activeList[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to cinema servers');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData(movieRegion);
  }, [movieRegion]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchHomeData(movieRegion);
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (q.length > 0) {
      try {
        Haptics.selectionAsync();
      } catch {}
      performSearch(q);
      navigation.navigate('MoviesTab' as any, { initialSearch: q });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorRole('background', '#0B0B10') }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colorRole('primary', '#d7960a')}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Search Bar & Profile/Notification Actions */}
        <View style={styles.header}>
          <View style={styles.searchWrapper}>
            <Input
              placeholder="Find your next movie..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              leadingIcon="search"
              trailingIcon={searchQuery.length > 0 ? 'close-circle' : undefined}
              onTrailingPress={() => setSearchQuery('')}
              containerStyle={styles.searchContainer}
            />
          </View>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}
              onPress={() => alert('No new notifications')}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications" size={20} color={colors.onSurface} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconCircle, { marginLeft: 8, backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}
              onPress={() => navigation.navigate('ProfileTab' as any)}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Ionicons name="person" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Region Filter Chips: Global Releases vs Nollywood / Nigeria */}
        <View style={styles.regionFilterRow}>
          <Chip
            label="🌍 Global Releases"
            isSelected={movieRegion === 'GLOBAL'}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setMovieRegion('GLOBAL');
            }}
            style={{ marginRight: 8 }}
          />
          <Chip
            label="🇳🇬 Nollywood / Nigeria"
            isSelected={movieRegion === 'NG'}
            onPress={() => {
              try {
                Haptics.selectionAsync();
              } catch {}
              setMovieRegion('NG');
            }}
          />
        </View>

        {/* Category Tabs: All, Now Showing, Coming Soon, Active Showtimes */}
        <View style={styles.categoryTabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabsScroll}
          >
            <Chip
              label="All"
              isSelected={selectedCategoryTab === 'all'}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setSelectedCategoryTab('all');
              }}
              style={{ marginRight: 8 }}
            />
            <Chip
              label="Now Showing"
              isSelected={selectedCategoryTab === 'now-playing'}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setSelectedCategoryTab('now-playing');
              }}
              style={{ marginRight: 8 }}
            />
            <Chip
              label="Coming Soon"
              isSelected={selectedCategoryTab === 'upcoming'}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setSelectedCategoryTab('upcoming');
              }}
              style={{ marginRight: 8 }}
            />
            <Chip
              label="Active Showtimes"
              isSelected={selectedCategoryTab === 'active-showtimes'}
              onPress={() => {
                try {
                  Haptics.selectionAsync();
                } catch {}
                setSelectedCategoryTab('active-showtimes');
              }}
            />
          </ScrollView>
        </View>

        {/* Search Results View when query is active */}
        {searchQuery.trim().length > 0 ? (
          <View style={styles.searchResultsContainer}>
            <View style={styles.searchHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text variant="title-medium" colorRoleName="on-surface" style={{ fontWeight: '800' }}>
                  Search Results
                </Text>
                <Text variant="body-small" colorRoleName="on-surface-variant">
                  {isSearching
                    ? 'Searching movie database...'
                    : `${searchResults.length} movie${searchResults.length === 1 ? '' : 's'} found for "${searchQuery.trim()}"`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear search input"
              >
                <Text variant="label-medium" colorRoleName="primary" style={{ fontWeight: '700' }}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {isSearching ? (
              <View style={styles.searchGrid}>
                <Skeleton width="48%" height={240} borderRadius={16} />
                <Skeleton width="48%" height={240} borderRadius={16} />
                <Skeleton width="48%" height={240} borderRadius={16} style={{ marginTop: 12 }} />
                <Skeleton width="48%" height={240} borderRadius={16} style={{ marginTop: 12 }} />
              </View>
            ) : searchResults.length === 0 ? (
              <EmptyState
                iconName="search"
                title="No Movies Found"
                message={`We couldn't find any movie matching "${searchQuery}". Try another title or explore all releases.`}
                actionLabel="Explore All Movies"
                onAction={() => {
                  setSearchQuery('');
                  navigation.navigate('MoviesTab' as any);
                }}
              />
            ) : (
              <>
                <View style={styles.searchGrid}>
                  {searchResults.map((movie) => (
                    <View key={movie.id} style={styles.searchCardWrapper}>
                      <MovieCard
                        title={movie.title}
                        posterUrl={movie.posterUrl}
                        rating={movie.voteAverage}
                        releaseYear={movie.releaseDate ? movie.releaseDate.split('-')[0] : undefined}
                        onPress={() => navigation.navigate('MovieDetails', { movieId: movie.id })}
                      />
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.viewAllInMoviesBtn, { borderColor: colors.primary }]}
                  onPress={() => {
                    navigation.navigate('MoviesTab' as any, { initialSearch: searchQuery.trim() });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View full list in Movies tab"
                >
                  <Text variant="label-medium" colorRoleName="primary" style={{ fontWeight: '700' }}>
                    View & Filter in Movies Tab
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : isLoading ? (
          <View style={{ paddingHorizontal: spacingVal('md', 16) }}>
            <Skeleton width="100%" height={260} borderRadius={20} style={{ marginVertical: 16 }} />
            <Skeleton width="50%" height={20} style={{ marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Skeleton width={156} height={220} borderRadius={16} />
              <Skeleton width={156} height={220} borderRadius={16} />
            </View>
          </View>
        ) : error ? (
          <EmptyState
            iconName="alert-circle"
            title="Connection Notice"
            message={error}
            actionLabel="Try Again"
            onAction={fetchHomeData}
          />
        ) : (
          <>
            {/* 3. Featured Movie / Hero Section */}
            {featuredMovie && (selectedCategoryTab === 'all' || selectedCategoryTab === 'now-playing') && (
              <View style={styles.heroContainer}>
                <View style={[styles.heroCard, { borderColor: isDark ? '#2D2D3D' : colors.outlineVariant }]}>
                  <Image
                    source={{
                      uri:
                        featuredMovie.backdropUrl ||
                        featuredMovie.posterUrl ||
                        'https://image.tmdb.org/t/p/w1280/xOm9vyql09Q9ONwvpMu49QIYph5.jpg',
                    }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={300}
                    cachePolicy="memory-disk"
                  />

                  <View style={styles.heroScrim}>
                    <View style={styles.heroBadgeRow}>
                      <Badge label="FEATURED PREMIERE" variant="vip" />
                      {featuredMovie.voteAverage > 0 && (
                        <View style={styles.heroRatingPill}>
                          <Ionicons name="star" size={12} color="#FFD700" style={{ marginRight: 4 }} />
                          <Text variant="label-small" style={{ fontWeight: '700', color: '#FFFFFF' }}>
                            {featuredMovie.voteAverage.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text variant="headline-small" style={[styles.heroTitle, { color: '#FFFFFF' }]}>
                      {featuredMovie.title}
                    </Text>

                    <Text
                      variant="body-small"
                      numberOfLines={2}
                      style={[styles.heroOverview, { color: 'rgba(255, 255, 255, 0.86)' }]}
                    >
                      {featuredMovie.overview || 'Experience the cinema spectacle on the biggest screens in town.'}
                    </Text>

                    <Button
                      label="Book Now"
                      variant="primary"
                      size="md"
                      onPress={() => navigation.navigate('MovieDetails', { movieId: featuredMovie.id })}
                      style={styles.heroBookBtn}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 4. Now Showing Section */}
            {(selectedCategoryTab === 'all' || selectedCategoryTab === 'now-playing') && (
              <>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionTitle}>
                      Now Showing
                    </Text>
                    <Text variant="label-small" colorRoleName="primary">
                      Available for immediate ticket reservation
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      navigation.navigate('MoviesTab' as any, { filter: 'now-playing', region: movieRegion });
                    }}
                    style={styles.seeAllBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="See All Now Showing"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="label-medium" colorRoleName="primary" style={{ fontWeight: '700' }}>
                        See All
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color={colorRole('primary', '#d7960a')} style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {nowPlaying.map((movie) => (
                    <View key={movie.id} style={styles.cardWrapper}>
                      <MovieCard
                        title={movie.title}
                        posterUrl={movie.posterUrl}
                        rating={movie.voteAverage}
                        releaseYear={movie.releaseDate ? movie.releaseDate.split('-')[0] : undefined}
                        onPress={() => navigation.navigate('MovieDetails', { movieId: movie.id })}
                      />
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {/* 5. Coming Soon Section */}
            {(selectedCategoryTab === 'all' || selectedCategoryTab === 'upcoming') && upcoming.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: spacingVal('lg', 20) }]}>
                  <View>
                    <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionTitle}>
                      Coming Soon
                    </Text>
                    <Text variant="label-small" colorRoleName="on-surface-variant">
                      Anticipated premieres arriving soon
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      navigation.navigate('MoviesTab' as any, { filter: 'upcoming', region: movieRegion });
                    }}
                    style={styles.seeAllBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="See All Coming Soon"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="label-medium" colorRoleName="secondary" style={{ fontWeight: '700' }}>
                        See All
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color="#CCC2DC" style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {upcoming.map((movie) => (
                    <View key={movie.id} style={styles.cardWrapper}>
                      <MovieCard
                        title={movie.title}
                        posterUrl={movie.posterUrl}
                        rating={movie.voteAverage}
                        releaseYear={
                          movie.releaseDate
                            ? `Coming ${new Date(movie.releaseDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}`
                            : 'Coming Soon'
                        }
                        onPress={() => navigation.navigate('MovieDetails', { movieId: movie.id })}
                      />
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            {/* 6. Active Showtimes Section (Fourth Tab Content) */}
            {(selectedCategoryTab === 'all' || selectedCategoryTab === 'active-showtimes') && (
              <>
                <View style={[styles.sectionHeader, { marginTop: spacingVal('lg', 20) }]}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionTitle}>
                        Active Showtimes
                      </Text>
                      <View style={styles.liveIndicatorBadge}>
                        <View style={styles.liveGreenDot} />
                        <Text style={styles.liveBadgeText}>LIVE SEATS</Text>
                      </View>
                    </View>
                    <Text variant="label-small" colorRoleName="primary">
                      {activeShowtimes.length > 0
                        ? `${activeShowtimes.length} movies ready to book seats right now`
                        : 'Checking available theater halls...'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch {}
                      navigation.navigate('MoviesTab' as any, { filter: 'active-showtimes', region: movieRegion });
                    }}
                    style={styles.seeAllBtn}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="See All Movies with Active Showtimes"
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text variant="label-medium" colorRoleName="primary" style={{ fontWeight: '700' }}>
                        See All
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colorRole('primary', '#d7960a')}
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </TouchableOpacity>
                </View>

                {activeShowtimes.length === 0 ? (
                  <View style={{ paddingHorizontal: spacingVal('md', 16), paddingVertical: 12 }}>
                    <Text variant="body-small" colorRoleName="on-surface-variant">
                      No active showtimes currently scheduled. Check back shortly.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {activeShowtimes.map((movie) => (
                      <View key={movie.id} style={styles.cardWrapper}>
                        <MovieCard
                          title={movie.title}
                          posterUrl={movie.posterUrl}
                          rating={movie.voteAverage}
                          releaseYear={
                            movie.lowestPriceKobo
                              ? `From ₦${(movie.lowestPriceKobo / 100).toLocaleString()}`
                              : 'Live Showtimes'
                          }
                          onPress={() => navigation.navigate('MovieDetails', { movieId: movie.id })}
                        />
                      </View>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            {/* TMDB Official Logos & Attribution */}
            <View
              style={[
                styles.attributionCard,
                {
                  backgroundColor: isDark ? 'rgba(13, 37, 63, 0.45)' : '#F0F4F8',
                  borderColor: isDark ? '#1C3E61' : '#D0DBE5',
                },
              ]}
            >
              {/* TMDB Clickable Logo Capsule */}
              <TouchableOpacity
                onPress={() => Linking.openURL('https://developer.themoviedb.org/docs/getting-started')}
                style={styles.tmdbLogoPill}
                activeOpacity={0.8}
                accessibilityRole="link"
                accessibilityLabel="The Movie Database (TMDB). Tap to open TMDB developer documentation in browser."
              >
                <View style={styles.tmdbAccentBar} />
                <Text style={styles.tmdbLogoText}>TMDB</Text>
                <Ionicons name="open-outline" size={13} color="#01B4E4" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              <Text variant="body-small" colorRoleName="on-surface-variant" style={styles.attributionNotice}>
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Cinema Location Selection Bottom Sheet Component */}
      <BottomSheet
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Select Cinema Location"
        subtitle="Find nearest cinema for showtimes & seats"
      >
        {/* "Use My Location" Fast Action */}
        <TouchableOpacity
          style={[
            styles.useLocationBtn,
            { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
          ]}
          onPress={handleUseCurrentLocation}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Detect current location and find closest cinema"
        >
          <View style={[styles.navigateIconCircle, { backgroundColor: 'rgba(215, 150, 10, 0.16)' }]}>
            <Ionicons name="navigate" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="label-medium" colorRoleName="primary" style={{ fontWeight: '700' }}>
              Use Current Location
            </Text>
            <Text variant="body-small" colorRoleName="on-surface-variant">
              {isLocating ? 'Scanning nearest cinemas...' : 'Sort cinemas by proximity to you'}
            </Text>
          </View>
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Badge label="GPS" variant="vip" />
          )}
        </TouchableOpacity>

        {/* Search Input */}
        <View style={{ marginTop: 12 }}>
          <Input
            placeholder="Search by cinema name, city or area..."
            value={cinemaSearch}
            onChangeText={setCinemaSearch}
            leadingIcon="search"
            trailingIcon={cinemaSearch.length > 0 ? 'close-circle' : undefined}
            onTrailingPress={() => setCinemaSearch('')}
            containerStyle={{ marginBottom: 8 }}
          />
        </View>

        {/* Area Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
          {(['All', 'Lekki & VI', 'Mainland', 'Abuja'] as const).map((filter) => (
            <Chip
              key={filter}
              label={filter}
              isSelected={selectedCityFilter === filter}
              onPress={() => setSelectedCityFilter(filter)}
              style={{ marginRight: 8 }}
            />
          ))}
        </ScrollView>

        {/* Cinemas List */}
        <ScrollView style={styles.cinemasScrollView} showsVerticalScrollIndicator={false}>
          {filteredCinemas.length === 0 ? (
            <EmptyState
              iconName="location"
              title="No Cinemas Found"
              message={`No cinemas match "${cinemaSearch}". Try searching a different city or area.`}
            />
          ) : (
            filteredCinemas.map((c) => {
              const isSelected = selectedCinema.id === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.cinemaItem,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(215, 150, 10, 0.12)'
                        : colors.surfaceContainerHigh,
                      borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    },
                  ]}
                  onPress={() => handleSelectCinema(c)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${c.area}, ${c.distanceKm} km away. ${isSelected ? 'Currently selected' : ''}`}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <Text
                        variant="title-small"
                        colorRoleName={isSelected ? 'primary' : 'on-surface'}
                        style={{ fontWeight: '700' }}
                      >
                        {c.name}
                      </Text>
                      {c.distanceKm <= 3 && <Badge label="NEAREST" variant="success" />}
                    </View>

                    <Text variant="body-small" colorRoleName="on-surface-variant" numberOfLines={1}>
                      {c.area} • {c.address}
                    </Text>

                    <View style={styles.cinemaFeaturesRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                        <Ionicons name="navigate-circle" size={14} color={colors.primary} style={{ marginRight: 3 }} />
                        <Text variant="label-small" colorRoleName="primary" style={{ fontWeight: '700' }}>
                          {c.distanceKm} km
                        </Text>
                      </View>
                      {c.features.slice(0, 2).map((feat) => (
                        <Text
                          key={feat}
                          variant="label-small"
                          colorRoleName="outline"
                          style={styles.featureTag}
                        >
                          • {feat}
                        </Text>
                      ))}
                    </View>
                  </View>

                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                    size={22}
                    color={isSelected ? colors.primary : colors.outline}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingVal('md', 16),
    paddingTop: spacingVal('sm', 12),
    paddingBottom: spacingVal('xs', 8),
  },
  searchWrapper: {
    flex: 1,
    marginRight: spacingVal('sm', 12),
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d7960a',
  },
  searchSection: {
    paddingHorizontal: spacingVal('md', 16),
    marginTop: spacingVal('xs', 8),
    marginBottom: spacingVal('xs', 8),
  },
  searchContainer: {
    marginBottom: 0,
  },
  regionFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacingVal('md', 16),
    marginBottom: spacingVal('xs', 8),
  },
  categoryTabsWrapper: {
    marginBottom: spacingVal('md', 16),
  },
  categoryTabsScroll: {
    paddingHorizontal: spacingVal('md', 16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(144, 206, 161, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(144, 206, 161, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#90CEA1',
    marginRight: 5,
  },
  liveBadgeText: {
    color: '#90CEA1',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  searchResultsContainer: {
    paddingHorizontal: spacingVal('md', 16),
    marginTop: spacingVal('xs', 8),
  },
  searchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingVal('md', 16),
  },
  clearSearchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  searchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  searchCardWrapper: {
    width: '48%',
    marginBottom: spacingVal('md', 16),
  },
  viewAllInMoviesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: spacingVal('sm', 12),
    minHeight: 44,
  },
  heroContainer: {
    paddingHorizontal: spacingVal('md', 16),
    marginBottom: spacingVal('lg', 20),
  },
  heroCard: {
    height: 280,
    borderRadius: radiusVal('lg', 16),
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#161622',
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 11, 16, 0.88)',
    padding: spacingVal('md', 16),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 44, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2D3D',
  },
  heroTitle: {
    fontWeight: '800',
    marginBottom: 4,
  },
  heroOverview: {
    marginBottom: spacingVal('sm', 12),
    lineHeight: 18,
  },
  heroBookBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacingVal('md', 16),
    marginBottom: spacingVal('sm', 12),
  },
  sectionTitle: {
    fontWeight: '800',
  },
  seeAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  horizontalScroll: {
    paddingLeft: spacingVal('md', 16),
    paddingRight: spacingVal('xs', 8),
  },
  cardWrapper: {
    marginRight: spacingVal('sm', 12),
  },
  attributionCard: {
    marginTop: spacingVal('xl', 24),
    marginHorizontal: spacingVal('md', 16),
    padding: spacingVal('md', 16),
    borderRadius: radiusVal('lg', 16),
    borderWidth: 1,
    alignItems: 'center',
  },
  tmdbLogoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D253F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: spacingVal('xs', 8),
    minHeight: 44,
  },
  tmdbAccentBar: {
    width: 20,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#90CEA1',
    marginRight: 8,
  },
  tmdbLogoText: {
    color: '#01B4E4',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.5,
  },
  attributionNotice: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacingVal('md', 16),
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
    minHeight: 44,
  },
  navigateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    marginBottom: 4,
  },
  cinemasScrollView: {
    maxHeight: 380,
  },
  cinemaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    minHeight: 44,
  },
  cinemaFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  featureTag: {
    marginRight: 6,
  },
});
