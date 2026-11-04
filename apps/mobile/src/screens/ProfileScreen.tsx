// apps/mobile/src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
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
import {
  Text,
  Card,
  Badge,
  BottomSheet,
  Button,
  Chip,
} from '../components';

type ActiveModal =
  | 'appearance'
  | 'location'
  | 'help'
  | 'feedback'
  | 'privacy'
  | 'terms'
  | 'about'
  | null;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { themeMode, setThemeMode, colors } = useTheme();
  const { isInAppBrowser, togglePreference } = useInAppBrowserPreference();

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [preferredLocation, setPreferredLocation] = useState('Genesis Cinemas, VI');

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState<'love' | 'good' | 'fair'>('love');
  const [selectedFeedbackCategory, setSelectedFeedbackCategory] = useState('Booking Flow');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const openModal = (modal: ActiveModal) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveModal(modal);
  };

  const closeModal = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setActiveModal(null);
  };

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

  const cinemaLocations = [
    {
      id: 'genesis-vi',
      name: 'Genesis Cinemas, VI',
      address: 'The Palms Mall, Lekki-Epe Expressway, Victoria Island, Lagos',
    },
    {
      id: 'filmhouse-lekki',
      name: 'Filmhouse IMAX, Lekki',
      address: 'The Rock Drive, Off Bisola Durosinmi Etti, Lekki Phase 1, Lagos',
    },
    {
      id: 'silverbird-vi',
      name: 'Silverbird Galleria, VI',
      address: '133 Ahmadu Bello Way, Victoria Island, Lagos',
    },
    {
      id: 'ebonylife-vi',
      name: 'EbonyLife Cinemas, VI',
      address: 'Adetokunbo Ademola Street, Victoria Island, Lagos',
    },
    {
      id: 'genesis-maryland',
      name: 'Genesis Cinemas, Maryland',
      address: 'Maryland Mall, Ikorodu Road, Lagos',
    },
  ];

  const appearanceOptions = [
    {
      mode: 'light' as const,
      title: 'Daylight Mode',
      subtitle: 'Crisp, high-contrast light display theme',
      icon: 'sunny' as const,
    },
    {
      mode: 'dark' as const,
      title: 'Cinema Dark',
      subtitle: 'Cinematic deep dark palette for low light',
      icon: 'moon' as const,
    },
    {
      mode: 'system' as const,
      title: 'System Default',
      subtitle: 'Seamlessly mirrors your phone display mode',
      icon: 'phone-portrait' as const,
    },
  ];

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
            onPress={() => openModal('appearance')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Appearance: Light, dark or system"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons
                name={
                  themeMode === 'light'
                    ? 'sunny-outline'
                    : themeMode === 'dark'
                    ? 'moon-outline'
                    : 'phone-portrait-outline'
                }
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
            onPress={() => openModal('location')}
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

          {/* In-App Browser */}
          <View style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="browsers-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                In-App Browser
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Open payment checkout inside the app
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

          {/* Design System Gallery */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('DevComponentGallery')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Design System Gallery"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="body-medium" colorRoleName="on-surface" style={styles.itemTitle}>
                  Design System Gallery
                </Text>
                <Badge label="DEV" variant="warning" />
              </View>
              <Text variant="body-small" colorRoleName="on-surface-variant">
                Inspect UI tokens, states & components
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.chevron} />
          </TouchableOpacity>
        </Card>

        {/* Section: Support */}
        <Text variant="title-small" colorRoleName="on-surface-variant" style={styles.sectionHeader}>
          Support
        </Text>

        <Card style={styles.menuCard}>
          {/* Help & Support */}
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder, { borderBottomColor: colors.outlineVariant }]}
            onPress={() => openModal('help')}
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
            onPress={() => {
              setFeedbackSubmitted(false);
              openModal('feedback');
            }}
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
            onPress={() => openModal('privacy')}
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
            onPress={() => openModal('terms')}
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
            onPress={() => openModal('about')}
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

      {/* ─────────────────────────────────────────────────────────────
          1. APPEARANCE BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={activeModal === 'appearance'}
        onClose={closeModal}
        title="Theme & Appearance"
        subtitle="Choose your preferred viewing display mood"
      >
        <View style={{ gap: 12, paddingVertical: 8 }}>
          {appearanceOptions.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                  },
                  isSelected && styles.optionCardActive,
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {}
                  setThemeMode(opt.mode);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.optionIconCircle,
                    { backgroundColor: isSelected ? 'rgba(215,150,10,0.18)' : colors.surfaceContainer },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={22}
                    color={isSelected ? colors.primary : colors.onSurfaceVariant}
                  />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text
                    variant="title-small"
                    colorRoleName={isSelected ? 'primary' : 'on-surface'}
                    style={{ fontWeight: isSelected ? '700' : '600' }}
                  >
                    {opt.title}
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 2 }}>
                    {opt.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSelected ? colors.primary : colors.outline}
                />
              </TouchableOpacity>
            );
          })}

          <Button
            label="Done"
            variant="primary"
            size="md"
            onPress={closeModal}
            style={{ marginTop: 12 }}
          />
        </View>
      </BottomSheet>

      {/* ─────────────────────────────────────────────────────────────
          2. LOCATION BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={activeModal === 'location'}
        onClose={closeModal}
        title="Preferred Cinema Location"
        subtitle="Select your primary cinema branch for showtimes"
        maxHeight="90%"
      >
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 10, paddingVertical: 6 }}>
            {cinemaLocations.map((loc) => {
              const isSelected = preferredLocation === loc.name;
              return (
                <TouchableOpacity
                  key={loc.id}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: colors.surfaceContainerHigh,
                      borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    },
                    isSelected && styles.optionCardActive,
                  ]}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch {}
                    setPreferredLocation(loc.name);
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.optionIconCircle,
                      { backgroundColor: isSelected ? 'rgba(215,150,10,0.18)' : colors.surfaceContainer },
                    ]}
                  >
                    <Ionicons
                      name="location"
                      size={20}
                      color={isSelected ? colors.primary : colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text
                      variant="title-small"
                      colorRoleName={isSelected ? 'primary' : 'on-surface'}
                      style={{ fontWeight: isSelected ? '700' : '600' }}
                    >
                      {loc.name}
                    </Text>
                    <Text
                      variant="body-small"
                      colorRoleName="on-surface-variant"
                      numberOfLines={2}
                      style={{ marginTop: 2 }}
                    >
                      {loc.address}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={isSelected ? colors.primary : colors.outline}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <Button
          label="Save Location"
          variant="primary"
          size="md"
          onPress={closeModal}
          style={{ marginTop: 16 }}
        />
      </BottomSheet>

      {/* ─────────────────────────────────────────────────────────────
          3. HELP & SUPPORT BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={activeModal === 'help'}
        onClose={closeModal}
        title="Help & Support"
        subtitle="Customer assistance & cinema booking help"
        maxHeight="90%"
      >
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14, paddingVertical: 8 }}>
            {/* Contact Channels */}
            <Card style={styles.infoCard}>
              <View style={styles.contactRow}>
                <View style={[styles.contactIconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Ionicons name="mail" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    Email Support
                  </Text>
                  <Text variant="body-small" colorRoleName="primary" style={{ marginTop: 2 }}>
                    support@matinee.ng
                  </Text>
                  <Text variant="label-small" colorRoleName="outline" style={{ marginTop: 2 }}>
                    Average response time under 15 minutes
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.outlineVariant, marginVertical: 12 }]} />

              <View style={styles.contactRow}>
                <View style={[styles.contactIconCircle, { backgroundColor: colors.surfaceContainerHigh }]}>
                  <Ionicons name="call" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    Phone Hotline
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface" style={{ fontWeight: '600', marginTop: 2 }}>
                    +234 1 800 MATINEE (6284633)
                  </Text>
                  <Text variant="label-small" colorRoleName="outline" style={{ marginTop: 2 }}>
                    Mon - Sun: 8:00 AM – 11:00 PM Daily
                  </Text>
                </View>
              </View>
            </Card>

            {/* Quick FAQs */}
            <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700', marginTop: 4 }}>
              Frequently Asked Questions
            </Text>

            <Card style={styles.infoCard}>
              <Text variant="title-small" colorRoleName="primary" style={{ fontWeight: '700' }}>
                Where can I view my ticket QR code?
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 4, lineHeight: 18 }}>
                Your tickets are permanently stored under the Tickets tab at the bottom of the app. Tapping your booking reveals the authoritative QR admission code.
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.outlineVariant, marginVertical: 10 }]} />

              <Text variant="title-small" colorRoleName="primary" style={{ fontWeight: '700' }}>
                How does seat locking work?
              </Text>
              <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 4, lineHeight: 18 }}>
                When you select a seat, our Redis locking engine holds it exclusively for you for 10 minutes so nobody else can take it while you finish checkout.
              </Text>
            </Card>
          </View>
        </ScrollView>
        <Button label="Close" variant="primary" size="md" onPress={closeModal} style={{ marginTop: 12 }} />
      </BottomSheet>

      {/* ─────────────────────────────────────────────────────────────
          4. SEND FEEDBACK BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={activeModal === 'feedback'}
        onClose={closeModal}
        title="Send Feedback"
        subtitle="Help us refine your cinema booking experience"
      >
        <View style={{ gap: 14, paddingVertical: 8 }}>
          {feedbackSubmitted ? (
            <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
              <View
                style={[
                  styles.optionIconCircle,
                  { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(75,181,67,0.15)' },
                ]}
              >
                <Ionicons name="checkmark-done" size={36} color="#4BB543" />
              </View>
              <Text variant="title-medium" colorRoleName="on-surface" style={{ fontWeight: '800' }}>
                Thank you for your feedback! 🎉
              </Text>
              <Text
                variant="body-small"
                colorRoleName="on-surface-variant"
                style={{ textAlign: 'center', lineHeight: 18 }}
              >
                Our engineering and design teams read all user feedback to continuously improve Matinee.
              </Text>
              <Button
                label="Done"
                variant="primary"
                size="md"
                onPress={closeModal}
                style={{ width: '100%', marginTop: 12 }}
              />
            </View>
          ) : (
            <>
              {/* Experience Rating */}
              <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                How is your overall experience?
              </Text>

              <View style={styles.ratingRow}>
                <TouchableOpacity
                  style={[
                    styles.ratingBtn,
                    { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
                    feedbackRating === 'love' && styles.ratingBtnActive,
                  ]}
                  onPress={() => setFeedbackRating('love')}
                >
                  <Text style={{ fontSize: 24 }}>😍</Text>
                  <Text variant="label-small" colorRoleName={feedbackRating === 'love' ? 'primary' : 'on-surface-variant'}>
                    Love it
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ratingBtn,
                    { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
                    feedbackRating === 'good' && styles.ratingBtnActive,
                  ]}
                  onPress={() => setFeedbackRating('good')}
                >
                  <Text style={{ fontSize: 24 }}>🙂</Text>
                  <Text variant="label-small" colorRoleName={feedbackRating === 'good' ? 'primary' : 'on-surface-variant'}>
                    Good
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ratingBtn,
                    { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant },
                    feedbackRating === 'fair' && styles.ratingBtnActive,
                  ]}
                  onPress={() => setFeedbackRating('fair')}
                >
                  <Text style={{ fontSize: 24 }}>😐</Text>
                  <Text variant="label-small" colorRoleName={feedbackRating === 'fair' ? 'primary' : 'on-surface-variant'}>
                    Needs Work
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feedback Topic Chips */}
              <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700', marginTop: 4 }}>
                What would you like to improve?
              </Text>

              <View style={styles.chipsRow}>
                {['Booking Flow', 'Seat Selection', 'Payment & Speed', 'Movie Catalog'].map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    isSelected={selectedFeedbackCategory === cat}
                    onPress={() => setSelectedFeedbackCategory(cat)}
                  />
                ))}
              </View>

              <Button
                label="Submit Feedback"
                variant="primary"
                size="md"
                onPress={() => {
                  try {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch {}
                  setFeedbackSubmitted(true);
                }}
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </View>
      </BottomSheet>

      {/* ─────────────────────────────────────────────────────────────
          5. PRIVACY POLICY BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={activeModal === 'privacy'}
        onClose={closeModal}
        title="Privacy Policy"
        subtitle="How Matinee safeguards your identity & payment"
        maxHeight="90%"
      >
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12, paddingVertical: 6 }}>
            <Card style={styles.infoCard}>
              <View style={styles.policyRow}>
                <Ionicons name="card" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    Zero Payment Card Storage
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 2, lineHeight: 18 }}>
                    We never store card numbers, PINs, or CVVs. All transactions are handled securely by Flutterwave via PCI-DSS Level 1 certified hosted checkout.
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.infoCard}>
              <View style={styles.policyRow}>
                <Ionicons name="finger-print" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    Minimal Data Collection
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 2, lineHeight: 18 }}>
                    We collect only the essential details (name, email) necessary to issue verifiable digital tickets with QR admission barcodes.
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.infoCard}>
              <View style={styles.policyRow}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    No Third-Party Ad Brokers
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 2, lineHeight: 18 }}>
                    Your viewing tastes and ticket purchase history are strictly confidential and are never shared or sold to external advertisers.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>
        <Button label="I Understand" variant="primary" size="md" onPress={closeModal} style={{ marginTop: 12 }} />
      </BottomSheet>

      {/* ─────────────────────────────────────────────────────────────
          6. TERMS & CONDITIONS BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={activeModal === 'terms'}
        onClose={closeModal}
        title="Terms & Conditions"
        subtitle="Cinema booking rules, seat holds & ticketing"
        maxHeight="90%"
      >
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12, paddingVertical: 6 }}>
            <Card style={styles.infoCard}>
              <View style={styles.policyRow}>
                <Ionicons name="timer" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    10-Minute Redis Hold Window
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 2, lineHeight: 18 }}>
                    Selected cinema seats are reserved for exactly 10 minutes. If checkout is not finalized within this period, holds expire automatically to ensure fair access for everyone.
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.infoCard}>
              <View style={styles.policyRow}>
                <Ionicons name="qr-code" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    Authoritative Admission
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 2, lineHeight: 18 }}>
                    Admission to the cinema hall requires scanning your QR ticket issued in the app. Each ticket token is cryptographically verified against our PostgreSQL database.
                  </Text>
                </View>
              </View>
            </Card>

            <Card style={styles.infoCard}>
              <View style={styles.policyRow}>
                <Ionicons name="receipt" size={24} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="title-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                    Cancellations & Refunds
                  </Text>
                  <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 2, lineHeight: 18 }}>
                    Tickets are non-refundable after the showtime commences. In the event of a cinema cancellation, refunds are credited back via Flutterwave with append-only ledger audit trails.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>
        <Button label="Accept & Close" variant="primary" size="md" onPress={closeModal} style={{ marginTop: 12 }} />
      </BottomSheet>

      {/* ─────────────────────────────────────────────────────────────
          7. ABOUT MATINEE BOTTOM SHEET MODAL
      ───────────────────────────────────────────────────────────── */}
      <BottomSheet
        visible={activeModal === 'about'}
        onClose={closeModal}
        title="About Matinee"
        subtitle="Version 1.0.0 (Release Build)"
      >
        <View style={{ gap: 14, paddingVertical: 8 }}>
          <Card style={styles.infoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="title-medium" colorRoleName="on-surface" style={{ fontWeight: '800' }}>
                Matinee Cinema
              </Text>
              <Badge label="v1.0.0" variant="vip" />
            </View>
            <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginTop: 6, lineHeight: 18 }}>
              A cinema ticket-booking mobile application powered by the Lead Row reservation engine. Designed with atomic Redis seat holds, TMDB movie intelligence, and Flutterwave payment processing.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant, marginVertical: 12 }]} />

            <View style={{ gap: 6 }}>
              <View style={styles.metaRow}>
                <Text variant="label-small" colorRoleName="outline">
                  FRAMEWORK
                </Text>
                <Text variant="label-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                  React Native + Expo SDK 51
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text variant="label-small" colorRoleName="outline">
                  DATABASE
                </Text>
                <Text variant="label-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                  PostgreSQL + Prisma ORM
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text variant="label-small" colorRoleName="outline">
                  DISTRIBUTED LOCKS
                </Text>
                <Text variant="label-small" colorRoleName="on-surface" style={{ fontWeight: '700' }}>
                  Redis Key-Value Atomic SET NX
                </Text>
              </View>
            </View>
          </Card>

          <View style={{ gap: 8, marginTop: 4 }}>
            <Button
              label="Explore Design System Gallery"
              variant="outline"
              size="md"
              onPress={() => {
                closeModal();
                navigation.navigate('DevComponentGallery');
              }}
            />
            <Button label="Close" variant="primary" size="md" onPress={closeModal} />
          </View>
        </View>
      </BottomSheet>
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
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingVal('md', 16),
    borderRadius: radiusVal('md', 12),
    borderWidth: 1.5,
    minHeight: 60, // 44pt touch target floor
  },
  optionCardActive: {
    backgroundColor: 'rgba(215, 150, 10, 0.08)',
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    padding: spacingVal('md', 16),
    borderRadius: radiusVal('md', 12),
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radiusVal('md', 12),
    borderWidth: 1.5,
    gap: 4,
    minHeight: 64,
  },
  ratingBtnActive: {
    borderColor: '#d7960a',
    backgroundColor: 'rgba(215, 150, 10, 0.12)',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
