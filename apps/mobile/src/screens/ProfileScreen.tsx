// apps/mobile/src/screens/ProfileScreen.tsx
import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
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
} from '../components';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();

  const menuItems: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    badge?: string;
    action?: () => void;
  }> = [
    {
      icon: isDark ? 'moon' : 'sunny',
      title: 'App Appearance',
      subtitle:
        themeMode === 'light'
          ? 'Daylight mood active'
          : themeMode === 'dark'
          ? 'Dark mood active'
          : 'Following system settings',
      badge: themeMode === 'light' ? 'DAYLIGHT' : themeMode === 'dark' ? 'DARK' : 'SYSTEM',
      action: () => {
        const next = themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark';
        setThemeMode(next);
      },
    },
    {
      icon: 'card',
      title: 'Payment Methods',
      subtitle: 'Flutterwave Hosted Checkout (Test Mode)',
      badge: 'TEST MODE',
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      subtitle: 'Showtime alerts & blockbuster ticket drops',
    },
    {
      icon: 'fast-food',
      title: 'Cinema Perks & Concessions',
      subtitle: 'Claim free popcorn & drink upgrades',
    },
    {
      icon: 'color-palette',
      title: 'Design System Gallery',
      subtitle: 'Inspect UI tokens, states & components',
      action: () => navigation.navigate('DevComponentGallery'),
    },
    {
      icon: 'shield-checkmark',
      title: 'Security & Auth',
      subtitle: 'Manage sessions & biometric unlock',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.primary }]}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="title-medium" colorRoleName="on-surface" style={{ fontWeight: '800' }}>
                  Lead Row Cinephile
                </Text>
                <Badge label="VIP" variant="vip" />
              </View>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                customer@leadrow.com
              </Text>
              <Text variant="label-small" colorRoleName="primary" style={{ marginTop: 2 }}>
                Member since Oct 2026
              </Text>
            </View>
          </View>

          {/* Points / Balance Block */}
          <View style={[styles.pointsContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
            <View style={styles.pointsCol}>
              <Text variant="label-small" colorRoleName="outline">
                REWARD POINTS
              </Text>
              <Text variant="headline-small" colorRoleName="primary" style={{ fontWeight: '800' }}>
                2,450
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.pointsCol}>
              <Text variant="label-small" colorRoleName="outline">
                SAVED VALUE
              </Text>
              <Text variant="headline-small" colorRoleName="on-surface" style={{ fontWeight: '800' }}>
                ₦2,450
              </Text>
            </View>
          </View>
        </Card>

        {/* Theme Preference Segmented Card */}
        <Text variant="title-small" colorRoleName="on-surface-variant" style={styles.sectionHeader}>
          Theme & Display Mood
        </Text>

        <Card style={styles.themeCard}>
          <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginBottom: 12 }}>
            Switch viewing mood to match cinema lighting or outdoor daylight.
          </Text>

          <View style={styles.themeSelector}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
                themeMode === 'light' && styles.themeOptionActive,
              ]}
              onPress={() => setThemeMode('light')}
              accessibilityRole="button"
              accessibilityLabel="Daylight mode"
            >
              <Ionicons
                name="sunny"
                size={18}
                color={themeMode === 'light' ? colors.primary : colors.outline}
              />
              <Text
                variant="label-medium"
                colorRoleName={themeMode === 'light' ? 'primary' : 'on-surface-variant'}
                style={[styles.themeLabel, themeMode === 'light' && { fontWeight: '700' }]}
              >
                Daylight
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
                themeMode === 'dark' && styles.themeOptionActive,
              ]}
              onPress={() => setThemeMode('dark')}
              accessibilityRole="button"
              accessibilityLabel="Dark mood"
            >
              <Ionicons
                name="moon"
                size={18}
                color={themeMode === 'dark' ? colors.primary : colors.outline}
              />
              <Text
                variant="label-medium"
                colorRoleName={themeMode === 'dark' ? 'primary' : 'on-surface-variant'}
                style={[styles.themeLabel, themeMode === 'dark' && { fontWeight: '700' }]}
              >
                Dark mood
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
                themeMode === 'system' && styles.themeOptionActive,
              ]}
              onPress={() => setThemeMode('system')}
              accessibilityRole="button"
              accessibilityLabel="System mode"
            >
              <Ionicons
                name="phone-portrait"
                size={18}
                color={themeMode === 'system' ? colors.primary : colors.outline}
              />
              <Text
                variant="label-medium"
                colorRoleName={themeMode === 'system' ? 'primary' : 'on-surface-variant'}
                style={[styles.themeLabel, themeMode === 'system' && { fontWeight: '700' }]}
              >
                System
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Menu Items List */}
        <Text variant="title-small" colorRoleName="on-surface-variant" style={styles.sectionHeader}>
          Account & Preferences
        </Text>

        <Card style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.menuItem,
                idx !== menuItems.length - 1 && [styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }],
              ]}
              onPress={item.action || (() => Alert.alert(item.title, item.subtitle))}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon} size={22} color={colors.primary} style={styles.menuIcon} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="body-medium" colorRoleName="on-surface" style={{ fontWeight: '600' }}>
                    {item.title}
                  </Text>
                  {item.badge && <Badge label={item.badge} variant="warning" />}
                </View>
                <Text variant="body-small" colorRoleName="on-surface-variant">
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* App Version Info */}
        <View style={styles.footer}>
          <Text variant="body-small" colorRoleName="outline">
            Lead Row Cinema App v1.0.0 (Production Build)
          </Text>
          <Text variant="label-small" colorRoleName="outline" style={{ marginTop: 2 }}>
            React Native + Expo SDK 51 + PostgreSQL
          </Text>
        </View>

        <Button
          label="Sign Out"
          variant="outline"
          size="md"
          onPress={() => Alert.alert('Signed Out', 'You have been safely signed out.')}
          style={styles.signOutBtn}
        />
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
    paddingBottom: 80,
  },
  profileCard: {
    borderRadius: radiusVal('lg', 16),
    padding: spacingVal('lg', 20),
    marginBottom: spacingVal('lg', 20),
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  pointsContainer: {
    flexDirection: 'row',
    borderRadius: radiusVal('md', 12),
    padding: spacingVal('md', 16),
    marginTop: spacingVal('md', 16),
    alignItems: 'center',
  },
  pointsCol: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 36,
  },
  sectionHeader: {
    fontWeight: '700',
    marginBottom: spacingVal('xs', 8),
    marginLeft: 4,
  },
  themeCard: {
    padding: spacingVal('md', 16),
    marginBottom: spacingVal('xl', 24),
  },
  themeSelector: {
    flexDirection: 'row',
    gap: spacingVal('xs', 8),
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // 44pt touch target floor
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radiusVal('md', 12),
    borderWidth: 1.5,
    gap: 6,
  },
  themeOptionActive: {
    borderColor: '#d7960a',
    backgroundColor: 'rgba(215, 150, 10, 0.16)',
  },
  themeLabel: {
    fontSize: 13,
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
    minHeight: 56,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 16,
  },
  chevron: {
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacingVal('lg', 20),
  },
  signOutBtn: {
    borderColor: '#FF4D4D',
  },
});

