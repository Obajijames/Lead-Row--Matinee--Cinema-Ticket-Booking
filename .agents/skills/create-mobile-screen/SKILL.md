---
name: create-mobile-screen
description: Scaffold, wire, test, and style mobile application screens in apps/mobile/src/screens/. Trigger words: screen, navigation, Expo Router, React Navigation, Home, MovieDetails, SeatMapScreen, OrderReview, TicketScreen, WaitingRoom, skeleton loading, offline state, empty state.
---

## Overview

This skill teaches how to assemble production-grade, accessible mobile screens in React Native for Lead Row.
**Governing Rules:** `06-design-system-and-mobile.md`, `01-system-architecture.md`, and `PRD.md` Section 6.

---

## Ordered Procedure

1. **Define Screen Navigation Parameters:**
   - Open `apps/mobile/src/navigation/types.ts`.
   - Declare the route and typed params in the stack param list (e.g., `MovieDetails: { movieId: string }`).

2. **Scaffold Screen Structure:**
   - Create `apps/mobile/src/screens/[ScreenName]/[ScreenName].tsx`.
   - Wrap content with `SafeAreaView` from `react-native-safe-area-context`.
   - Apply background using semantic token `tokens.colors.roles.surface.hex` or `tokens.colors.roles.background.hex`.

3. **Implement Progressive Content Loading (Skeletons):**
   - Create a dedicated skeleton component for the screen layout (e.g. `MovieDetailSkeleton.tsx`).
   - If loading, render the skeleton immediately. Never display an empty blank screen or a lone spinner.

4. **Integrate API Client with Error & State Handling:**
   - Fetch data via centralized API client (`apps/mobile/src/api/client.ts`).
   - Render explicit states:
     - **Loading:** Screen skeleton
     - **Empty:** `EmptyState` component with friendly copy and action button
     - **Error / Offline:** `ErrorState` component with "Retry" action
     - **Overload / 429 / 503:** Display temporary server busy banner with countdown

5. **Wire Components & Typography Tokens:**
   - Compose screen using design system components (`Button`, `Card`, `MovieCard`, `SeatMap`, `Text`).
   - Use `ScreenHeader` for navigation back actions.
   - For lists, use `FlatList` with `keyExtractor` and `getItemLayout` for smooth scrolling.

---

## Code Skeleton

```typescript
// apps/mobile/src/screens/MovieDetails/MovieDetailsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { Button } from '../../components/Button/Button';
import { Text } from '../../components/Text/Text';
import { ErrorState } from '../../components/ErrorState/ErrorState';
import { MovieDetailsSkeleton } from './components/MovieDetailsSkeleton';
import { apiClient } from '../../api/client';
import { MovieDetailDTO } from '../../api/types';
import { tokens } from '../../tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

export const MovieDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { movieId } = route.params;
  const [movie, setMovie] = useState<MovieDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchDetails = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.get<MovieDetailDTO>(`/v1/movies/${movieId}`);
      setMovie(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load movie details. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (isLoading) {
    return <MovieDetailsSkeleton />;
  }

  if (error || !movie) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Movie Details" onBackPress={() => navigation.goBack()} />
        <ErrorState
          title="Something went wrong"
          message={error || 'Movie not found.'}
          onRetry={fetchDetails}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={movie.title} onBackPress={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchDetails(); }} />}
      >
        <Text variant="display-small" style={styles.title}>{movie.title}</Text>
        <Text variant="body-medium" style={styles.synopsis}>{movie.overview}</Text>
        <Button
          label="Select Showtimes"
          variant="primary"
          accessibilityLabel="Proceed to select cinema showtimes"
          onPress={() => navigation.navigate('Showtimes', { movieId: movie.id })}
          style={styles.actionButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.roles.background.hex,
  },
  content: {
    padding: tokens.spacing.base,
  },
  title: {
    color: tokens.colors.roles['on-background'].hex,
    marginBottom: tokens.spacing.sm,
  },
  synopsis: {
    color: tokens.colors.roles['on-surface-variant'].hex,
    marginBottom: tokens.spacing.lg,
  },
  actionButton: {
    marginTop: tokens.spacing.base,
  },
});
```

---

## Common Traps

* **Infinite Spinner on Initial Load:** Using `<ActivityIndicator />` in the middle of a blank screen instead of a skeleton component.
* **Unsafe Area Collisions:** Neglecting `SafeAreaView`, causing top headers or bottom buttons to clip into notches and home indicators.
* **Missing Error / Retry Flow:** Leaving the user stranded on a blank screen when network fails.
* **Hardcoded Styling Constants:** Hardcoding colors or spacing numbers instead of using `tokens`.
* **Direct TMDB Network Calls:** Calling TMDB endpoints directly from mobile instead of calling backend `/v1/movies/*`.

---

## Verify Before Done

1. [ ] Check that screen route parameters are strictly typed in `RootStackParamList`.
2. [ ] Verify that progressive skeleton loading is displayed during fetch.
3. [ ] Verify that empty, error, and offline states have clear retry actions.
4. [ ] Check that all text and touch targets comply with WCAG AA guidelines.
5. [ ] **Write Tests:** Add screen tests in `apps/mobile/src/screens/[ScreenName]/__tests__/[ScreenName].test.tsx` verifying:
   - Screen renders skeleton while loading
   - Screen renders movie details upon successful API fetch
   - Screen renders `ErrorState` with retry button on API failure
   - Pressing primary button navigates to next flow screen

