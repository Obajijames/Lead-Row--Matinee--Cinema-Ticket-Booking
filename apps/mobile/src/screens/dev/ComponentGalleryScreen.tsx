// apps/mobile/src/screens/dev/ComponentGalleryScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorRole, spacingVal } from '../../tokens';
import {
  Text,
  Button,
  Card,
  Badge,
  Chip,
  Input,
  MovieCard,
  Skeleton,
  PriceSummary,
  EmptyState,
  ScreenHeader,
  SeatMap,
  SeatItem,
  BottomSheet,
  Toast,
  ToastVariant,
} from '../../components';

// Mock seats for gallery demonstration
const mockGallerySeats: SeatItem[] = [
  // Row A (Wheelchair & Standard)
  { id: 'seat-a1', rowLabel: 'A', seatNumber: 1, seatType: 'WHEELCHAIR_ACCESSIBLE', status: 'AVAILABLE' },
  { id: 'seat-a2', rowLabel: 'A', seatNumber: 2, seatType: 'WHEELCHAIR_ACCESSIBLE', status: 'AVAILABLE' },
  { id: 'seat-a3', rowLabel: 'A', seatNumber: 3, seatType: 'STANDARD', status: 'SOLD' },
  { id: 'seat-a4', rowLabel: 'A', seatNumber: 4, seatType: 'STANDARD', status: 'AVAILABLE' },
  { id: 'seat-a5', rowLabel: 'A', seatNumber: 5, seatType: 'STANDARD', status: 'AVAILABLE' },
  { id: 'seat-a6', rowLabel: 'A', seatNumber: 6, seatType: 'STANDARD', status: 'HELD' },
  // Row B
  { id: 'seat-b1', rowLabel: 'B', seatNumber: 1, seatType: 'STANDARD', status: 'AVAILABLE' },
  { id: 'seat-b2', rowLabel: 'B', seatNumber: 2, seatType: 'STANDARD', status: 'AVAILABLE' },
  { id: 'seat-b3', rowLabel: 'B', seatNumber: 3, seatType: 'STANDARD', status: 'AVAILABLE' },
  { id: 'seat-b4', rowLabel: 'B', seatNumber: 4, seatType: 'STANDARD', status: 'SOLD' },
  { id: 'seat-b5', rowLabel: 'B', seatNumber: 5, seatType: 'STANDARD', status: 'AVAILABLE' },
  { id: 'seat-b6', rowLabel: 'B', seatNumber: 6, seatType: 'STANDARD', status: 'AVAILABLE' },
  // Row C (VIP)
  { id: 'seat-c1', rowLabel: 'C', seatNumber: 1, seatType: 'VIP', status: 'AVAILABLE' },
  { id: 'seat-c2', rowLabel: 'C', seatNumber: 2, seatType: 'VIP', status: 'AVAILABLE' },
  { id: 'seat-c3', rowLabel: 'C', seatNumber: 3, seatType: 'VIP', status: 'AVAILABLE' },
  { id: 'seat-c4', rowLabel: 'C', seatNumber: 4, seatType: 'VIP', status: 'AVAILABLE' },
  { id: 'seat-c5', rowLabel: 'C', seatNumber: 5, seatType: 'VIP', status: 'SOLD' },
  { id: 'seat-c6', rowLabel: 'C', seatNumber: 6, seatType: 'VIP', status: 'AVAILABLE' },
];

export const ComponentGalleryScreen: React.FC = () => {
  const [btnLoading, setBtnLoading] = useState(false);
  const [selectedChip, setSelectedChip] = useState('All');
  const [inputValue, setInputValue] = useState('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>(['seat-a4']);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    message: string;
    title?: string;
    variant: ToastVariant;
  }>({
    visible: false,
    message: '',
    variant: 'info',
  });

  const triggerToast = (variant: ToastVariant, title: string, message: string) => {
    setToastConfig({ visible: true, title, message, variant });
  };

  const toggleSeat = (id: string) => {
    setSelectedSeatIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorRole('background', '#0B0B10') }]}>
      <ScreenHeader title="Lead Row Design System" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="display-small" colorRoleName="primary" style={styles.pageTitle}>
          Component Gallery
        </Text>
        <Text variant="body-medium" colorRoleName="on-surface-variant" style={styles.pageSubtitle}>
          Interactive testing catalog for all Lead Row token-bound mobile components.
        </Text>

        {/* 1. Typography */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            1. Typography Variants
          </Text>
          <Text variant="headline-medium" colorRoleName="on-surface">
            Headline Medium
          </Text>
          <Text variant="title-medium" colorRoleName="primary">
            Title Medium (Primary)
          </Text>
          <Text variant="body-large" colorRoleName="on-surface">
            Body Large: Cinema ticket booking experience.
          </Text>
          <Text variant="body-medium" colorRoleName="on-surface-variant">
            Body Medium: Token-bound typography with WCAG AA compliance.
          </Text>
          <Text variant="label-small" colorRoleName="tertiary">
            LABEL SMALL / CAPTION
          </Text>
        </Card>

        {/* 2. Buttons */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            2. Buttons (44pt+ Touch Targets)
          </Text>
          <View style={styles.btnRow}>
            <Button
              label="Primary Button"
              onPress={() => alert('Primary Pressed')}
              variant="primary"
              style={styles.btnItem}
            />
            <Button
              label="Secondary Button"
              onPress={() => alert('Secondary Pressed')}
              variant="secondary"
              style={styles.btnItem}
            />
          </View>
          <View style={styles.btnRow}>
            <Button
              label="Outline Button"
              onPress={() => alert('Outline Pressed')}
              variant="outline"
              style={styles.btnItem}
            />
            <Button
              label="Danger Button"
              onPress={() => alert('Danger Pressed')}
              variant="danger"
              style={styles.btnItem}
            />
          </View>
          <View style={styles.btnRow}>
            <Button
              label={btnLoading ? 'Loading...' : 'Toggle Loading State'}
              onPress={() => setBtnLoading(!btnLoading)}
              isLoading={btnLoading}
              variant="primary"
              style={styles.btnItem}
            />
            <Button
              label="Disabled Button"
              onPress={() => {}}
              isDisabled={true}
              variant="primary"
              style={styles.btnItem}
            />
          </View>
        </Card>

        {/* 3. Badges */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            3. Badges (Status Indicators)
          </Text>
          <View style={styles.wrapRow}>
            <Badge label="Confirmed" variant="success" />
            <Badge label="Pending" variant="warning" />
            <Badge label="Cancelled" variant="error" />
            <Badge label="VIP Access" variant="vip" />
            <Badge label="IMAX 3D" variant="info" />
            <Badge label="Standard" variant="neutral" />
          </View>
        </Card>

        {/* 4. Chips */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            4. Filter Chips (Interactive)
          </Text>
          <View style={styles.wrapRow}>
            {['All', 'Today', 'Action', 'Sci-Fi', 'IMAX'].map((genre) => (
              <Chip
                key={genre}
                label={genre}
                isSelected={selectedChip === genre}
                onPress={() => setSelectedChip(genre)}
              />
            ))}
          </View>
        </Card>

        {/* 5. Input Fields */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            5. Form Inputs
          </Text>
          <Input
            label="Email Address"
            placeholder="e.g. user@example.com"
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="email-address"
          />
          <Input
            label="Password"
            placeholder="Enter secure password"
            secureTextEntry={true}
            error={inputValue.length > 0 && inputValue.length < 6 ? 'Password must be at least 6 characters' : undefined}
          />
        </Card>

        {/* 6. Movie Card */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            6. Movie Card Tile
          </Text>
          <View style={styles.movieCardsRow}>
            <MovieCard
              title="Dune: Part Two"
              rating={8.2}
              releaseYear="2024"
              posterUrl="https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"
              onPress={() => alert('Selected Dune')}
            />
            <MovieCard
              title="Deadpool & Wolverine"
              rating={7.8}
              releaseYear="2024"
              posterUrl="https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg"
              onPress={() => alert('Selected Deadpool')}
            />
          </View>
        </Card>

        {/* 7. Skeleton Placeholders */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            7. Skeleton Loaders (Pulsing)
          </Text>
          <Skeleton width="100%" height={24} style={{ marginBottom: 12 }} />
          <Skeleton width="75%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="50%" height={16} />
        </Card>

        {/* 8. Price Summary */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            8. Price Summary (NGN Minor Units)
          </Text>
          <PriceSummary
            subtotalKobo={900000} // ₦9,000.00
            serviceFeeKobo={50000} // ₦500.00
            totalAmountKobo={950000} // ₦9,500.00
            ticketCount={2}
          />
        </Card>

        {/* 9. Interactive Seat Map */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            9. SeatMap (Interactive Cinema Grid)
          </Text>
          <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginBottom: 12 }}>
            Selected Seats: {selectedSeatIds.join(', ') || 'None'}
          </Text>
          <SeatMap
            seats={mockGallerySeats}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={toggleSeat}
          />
        </Card>

        {/* 10. Empty State */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            10. Empty State
          </Text>
          <EmptyState
            title="No Bookings Yet"
            message="You haven't reserved any cinema tickets yet. Explore now playing movies to book your seat!"
            actionLabel="Browse Movies"
            onAction={() => alert('Browse clicked')}
          />
        </Card>

        {/* 11. Toast Notifications */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            11. Toast Notifications (Auto-Dismissing & Accessible)
          </Text>
          <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginBottom: 12 }}>
            Tap a button below to trigger live toast notifications:
          </Text>
          <View style={styles.btnRow}>
            <Button
              label="Success Toast"
              variant="outline"
              onPress={() => triggerToast('success', 'Seats Held', 'Your seats are locked for 10 minutes.')}
              style={styles.btnItem}
            />
            <Button
              label="Error Toast"
              variant="danger"
              onPress={() => triggerToast('error', 'Hold Expired', 'Your 10-minute hold session timed out.')}
              style={styles.btnItem}
            />
          </View>
          <View style={styles.btnRow}>
            <Button
              label="Warning Toast"
              variant="outline"
              onPress={() => triggerToast('warning', 'Low Availability', 'Only 4 VIP seats remain.')}
              style={styles.btnItem}
            />
            <Button
              label="Info Toast"
              variant="secondary"
              onPress={() => triggerToast('info', 'New Showtimes', 'Silverbird Ikeja added 3 evening shows.')}
              style={styles.btnItem}
            />
          </View>
        </Card>

        {/* 12. Bottom Sheet */}
        <Card style={styles.sectionCard}>
          <Text variant="title-medium" colorRoleName="on-surface" style={styles.sectionHeader}>
            12. BottomSheet (Material 3 Modal Sheet)
          </Text>
          <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginBottom: 12 }}>
            Supports drag handles, title headers, backdrop dismissal, and nested content.
          </Text>
          <Button
            label="Open Demo BottomSheet"
            variant="primary"
            onPress={() => setShowBottomSheet(true)}
          />
        </Card>
      </ScrollView>

      {/* Live Toast Component Overlay */}
      <Toast
        visible={toastConfig.visible}
        title={toastConfig.title}
        message={toastConfig.message}
        variant={toastConfig.variant}
        onDismiss={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* Live BottomSheet Component Overlay */}
      <BottomSheet
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        title="Cinema Seat Legend"
        subtitle="Understand seat tiers and accessibility options"
      >
        <View style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Badge label="AVAILABLE" variant="neutral" />
            <Text variant="body-medium" colorRoleName="on-surface" style={{ marginLeft: 12 }}>
              Standard theater seat (₦4,500)
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Badge label="VIP RECLINER" variant="vip" />
            <Text variant="body-medium" colorRoleName="on-surface" style={{ marginLeft: 12 }}>
              Luxury leather recliner with dining service (₦7,000)
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Badge label="ACCESSIBLE" variant="info" />
            <Text variant="body-medium" colorRoleName="on-surface" style={{ marginLeft: 12 }}>
              Wheelchair-accessible space with companion seat
            </Text>
          </View>
          <Button
            label="Got It"
            variant="primary"
            onPress={() => setShowBottomSheet(false)}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacingVal('md', 16),
  },
  pageTitle: {
    fontWeight: '800',
    marginBottom: spacingVal('xs', 8),
  },
  pageSubtitle: {
    marginBottom: spacingVal('lg', 20),
  },
  sectionCard: {
    marginBottom: spacingVal('lg', 20),
  },
  sectionHeader: {
    fontWeight: '700',
    marginBottom: spacingVal('md', 16),
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacingVal('sm', 12),
    marginBottom: spacingVal('sm', 12),
  },
  btnItem: {
    flex: 1,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingVal('xs', 8),
  },
  movieCardsRow: {
    flexDirection: 'row',
    gap: spacingVal('md', 16),
  },
});
