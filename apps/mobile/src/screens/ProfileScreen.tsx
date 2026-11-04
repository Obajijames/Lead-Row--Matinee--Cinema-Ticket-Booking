// apps/mobile/src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation/types';
import { spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import { useInAppBrowserPreference } from '../utils/browserPreference';
import { Text, Card, Badge } from '../components';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { themeMode, setThemeMode, colors } = useTheme();
  const { isInAppBrowser, togglePreference } = useInAppBrowserPreference();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [preferredLocation, setPreferredLocation] = useState('Genesis Cinemas, VI');

  const handleToggleBrowser = async (value: boolean) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    await togglePreference(value);
  };

  const handleToggleNotifications = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setNotificationsEnabled((prev) => !prev);
  };

  const handleAppearancePress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    Alert.alert(
      'Appearance',
      'Choose your preferred theme display for Matinee',
      [
        {
          text: 'Light',
          onPress: () => setThemeMode('light'),
        },
        {
          text: 'Dark',
          onPress: () => setThemeMode('dark'),
        },
        {
          text: 'System Default',
          onPress: () => setThemeMode('system'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleLocationPress = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    Alert.alert(
      'Preferred Cinema Location',
      'Select your default cinema branch for showtimes and ticket bookings',
      [
        {
          text: 'Genesis Cinemas, VI (Lagos)',
          onPress: () => setPreferredLocation('Genesis Cinemas, VI'),
        },
        {
          text: 'Filmhouse IMAX, Lekki (Lagos)',
          onPress: () => setPreferredLocation('Filmhouse IMAX, Lekki'),
        },
        {
          text: 'Silverbird Galleria, VI (Lagos)',
          onPress: () => setPreferredLocation('Silverbird Galleria, VI'),
        },
        {
          text: 'EbonyLife Cinemas, VI (Lagos)',
          onPress: () => setPreferredLocation('EbonyLife Cinemas, VI'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleHelpPress = () => {
    Alert.alert(
      'Help & Support',
      'Need assistance with your booking or ticket confirmation?\n\nEmail: support@matinee.ng\nPhone: +234 1 800 MATINEE\nHours: 8:00 AM - 11:00 PM Daily',
      [{ text: 'OK' }]
    );
  };

  const handleFeedbackPress = () => {
    Alert.alert(
      'Send Feedback',
      'We love hearing from you! Please send suggestions or report issues to feedback@matinee.ng.',
      [{ text: 'Got it' }]
    );
  };

  const handlePrivacyPress = () => {
    Alert.alert(
      'Privacy Policy',
      'Matinee respects your privacy. We store only essential booking details (email, ticket token, showtime) and never store payment card or banking information. All payment processing is conducted securely via Flutterwave.',
      [{ text: 'Close' }]
    );
  };

  const handleTermsPress = () => {
    Alert.alert(
      'Terms & Conditions',
      '1. Seat holds expire after 10 minutes.\n2. Tickets are non-refundable once the showtime has started.\n3. Admission requires presenting your verified QR code ticket at the cinema gate.',
      [{ text: 'I Understand' }]
    );
  };

  const handleAboutPress = () => {
    Alert.alert(
      'About Matinee',
      'Matinee Cinema Ticket Booking App\nVersion 1.0.0 (Release)\n\nPowered by Lead Row Engine.\nEngineered with React Native, Expo, and PostgreSQL.',
      [
        ...(Boolean(__DEV__)
          ? [
              {
                text: 'Open Dev Gallery',
                onPress: () => navigation.navigate('DevComponentGallery'),
              },
            ]
          : []),
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  const appearanceLabel =
    themeMode === 'light' ? 'Light' : themeMode === 'dark' ? 'Dark' : 'System';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Profile Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.primary },
            ]}
          >
            <Ionicons name="person" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text variant="headline-small" colorRoleName="on-surface" style={styles.userName}>
              Guest User
            </Text>
            <Text variant="body-medium" colorRoleName="on-surface-variant">
              Welcome to Matinee
            </Text>
          </View>
        </View>

        {/* Section: Preferences */}
        <Text variant="title-small" colorRoleName="on-surface-variant" style={styles.sectionHeader}>
          Preferences
        </Text>

        <Card style={styles.menuCard}>
          {/* Notifications */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={handleToggleNotifications}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityLabel="Notifications: Manage booking notifications"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                Notifications
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Manage booking notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.outlineVariant, true: colors.primary }}
              thumbColor={notificationsEnabled ? '#FFFFFF' : '#8E8E93'}
            />
          </TouchableOpacity>

          {/* Appearance */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={handleAppearancePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Appearance: Light, dark or system"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons
                name={themeMode === 'light' ? 'sunny-outline' : themeMode === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                  Appearance
                </Text>
                <Badge label={appearanceLabel} variant="neutral" />
              </View>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Light, dark or system
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>

          {/* Location */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={handleLocationPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Location: Preferred cinema location"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                  Location
                </Text>
                <Text variant="label-small" colorRoleName="primary" numberOfLines={1} style={{ maxWidth: 130 }}>
                  {preferredLocation.split(',')[0]}
                </Text>
              </View>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Preferred cinema location
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>

          {/* In-App Browser Checkout */}
          <View style={styles.menuItem}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="browsers-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                In-App Checkout
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Use built-in browser for Flutterwave payment
              </Text>
            </View>
            <Switch
              value={isInAppBrowser}
              onValueChange={handleToggleBrowser}
              trackColor={{ false: colors.outlineVariant, true: colors.primary }}
              thumbColor={isInAppBrowser ? '#FFFFFF' : '#8E8E93'}
              accessibilityRole="switch"
              accessibilityLabel="In-App Browser Toggle"
              accessibilityState={{ checked: isInAppBrowser }}
            />
          </View>
        </Card>

        {/* Section: Support */}
        <Text variant="title-small" colorRoleName="on-surface-variant" style={styles.sectionHeader}>
          Support
        </Text>

        <Card style={styles.menuCard}>
          {/* Help & Support */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={handleHelpPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Help & Support"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                Help & Support
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                FAQs and customer assistance
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>

          {/* Send Feedback */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={handleFeedbackPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Send Feedback"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                Send Feedback
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Share your ideas and experience
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={handlePrivacyPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                Privacy Policy
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                How we protect and manage your data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={handleTermsPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Terms & Conditions"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                Terms & Conditions
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Ticket terms, hold rules & policies
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>

          {/* About Matinee */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAboutPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="About Matinee"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                  About Matinee
                </Text>
                <Badge label="v1.0.0" variant="vip" />
              </View>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Cinema ticket booking app
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="body-small" colorRoleName="outline">
            Matinee Cinema v1.0.0
          </Text>
          <Text variant="label-small" colorRoleName="outline" style={{ marginTop: 2 }}>
            Powered by Lead Row Ticket Engine
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacingVal('md', 16),
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingVal('md', 16),
    paddingHorizontal: spacingVal('xs', 8),
    marginBottom: spacingVal('lg', 20),
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  headerText: {
    marginLeft: spacingVal('md', 16),
    flex: 1,
  },
  userName: {
    fontWeight: '800',
    marginBottom: 2,
  },
  sectionHeader: {
    fontWeight: '700',
    marginBottom: spacingVal('xs', 8),
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    borderRadius: radiusVal('lg', 16),
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacingVal('xl', 24),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingVal('md', 16),
    minHeight: 56, // 44pt touch target floor
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemTitle: {
    fontWeight: '700',
    marginBottom: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacingVal('xs', 8),
    marginBottom: spacingVal('lg', 20),
  },
});
