// apps/mobile/src/navigation/MainTabNavigator.tsx
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { colorRole } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { HomeScreen } from '../screens/HomeScreen';
import { MoviesScreen } from '../screens/MoviesScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const primaryKeyColor = colors.primary;
  const surfaceContainer = colors.surfaceContainer;

  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  const barHeight = 80 + bottomInset;

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: surfaceContainer,
            height: barHeight,
            paddingBottom: bottomInset,
            borderTopColor: isDark ? 'transparent' : colors.outlineVariant,
            borderTopWidth: isDark ? 0 : 1,
          },
        ],
        tabBarActiveTintColor: primaryKeyColor,
        tabBarInactiveTintColor: colors.outline,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.indicatorPill, focused && styles.activeIndicatorPill]}>
              <Ionicons name="home" size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="MoviesTab"
        component={MoviesScreen}
        options={{
          tabBarLabel: 'Movies',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.indicatorPill, focused && styles.activeIndicatorPill]}>
              <Ionicons name="film" size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="BookingsTab"
        component={BookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.indicatorPill, focused && styles.activeIndicatorPill]}>
              <Ionicons name="ticket" size={24} color={color} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.indicatorPill, focused && styles.activeIndicatorPill]}>
              <Ionicons name="person" size={24} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    // Material 3 specs: Elevation level 2 surface container without harsh borders
    borderTopWidth: 0,
    paddingTop: 12,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
  // M3 Stadium Active Indicator: 64dp width x 32dp height, 16dp radius
  indicatorPill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeIndicatorPill: {
    backgroundColor: 'rgba(215, 150, 10, 0.22)',
  },
  // M3 label-medium typography: 12sp font, 16sp line-height, 0.5sp tracking, 4dp top margin
  tabLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '600',
    marginTop: 4,
  },
});
