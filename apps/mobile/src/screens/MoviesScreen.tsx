// apps/mobile/src/screens/MoviesScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { colorRole, spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import {
  Text,
  MovieCard,
  Chip,
  Input,
  Skeleton,
  EmptyState,
} from '../components';
import { apiRequest } from '../api/client';

interface MovieItem {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  posterUrl: string | null;
  releaseDate: string | null;
  voteAverage: number;
}

export const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'MoviesTab'>>();
  const { colors } = useTheme();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headline-medium" colorRoleName="on-surface" style={styles.title}>
          Explore Movies
        </Text>
        <Text variant="body-small" colorRoleName="on-surface-variant">
          Discover latest blockbusters and premieres
        </Text>

        {/* Search Input (Token-bound Design System Input) */}
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
      </View>

      {/* Movie Grid List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              fetchMovies(searchQuery, selectedFilter, selectedRegion);
            }}
            tintColor={colorRole('primary', '#d7960a')}
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
});

