import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { RootStackParamList } from './src/navigation/types';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { MainTabNavigator } from './src/navigation/MainTabNavigator';
import { MovieDetailsScreen } from './src/screens/MovieDetailsScreen';
import { SeatMapScreen } from './src/screens/SeatMapScreen';
import { OrderReviewScreen } from './src/screens/OrderReviewScreen';
import { TicketScreen } from './src/screens/TicketScreen';
import { WaitingRoomScreen } from './src/screens/WaitingRoomScreen';
import { ComponentGalleryScreen } from './src/screens/dev/ComponentGalleryScreen';

const linking = {
  prefixes: ['leadrow://', 'https://lead-row-cinema-ticket-booking-api.vercel.app'],
  config: {
    screens: {
      MainTabs: '',
      Home: 'home',
      MovieDetails: 'movie/:movieId',
      SeatMap: 'seats/:showtimeId',
      OrderReview: 'checkout',
      Ticket: 'ticket/:ticketToken',
      DevComponentGallery: 'dev',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppContent() {
  const { isDark, colors } = useTheme();

  return (
    <NavigationContainer linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Bottom Tabs Root */}
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Home" component={MainTabNavigator} />

        {/* Stack Flow Screens */}
        <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
        <Stack.Screen name="WaitingRoom" component={WaitingRoomScreen} />
        <Stack.Screen name="SeatMap" component={SeatMapScreen} />
        <Stack.Screen name="OrderReview" component={OrderReviewScreen} />
        <Stack.Screen name="Ticket" component={TicketScreen} />

        {/* Hidden development-only component gallery */}
        <Stack.Screen name="DevComponentGallery" component={ComponentGalleryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter: Inter_400Regular,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Ensure fonts are loaded before rendering components to prevent font flickering / warnings
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d7960a" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0B10',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
