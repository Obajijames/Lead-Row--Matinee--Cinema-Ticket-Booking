// apps/mobile/src/components/PriceSummary.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colorRole, spacingVal } from '../tokens';
import { Text } from './Text';

export interface PriceSummaryProps {
  subtotalKobo: number;
  serviceFeeKobo: number;
  totalAmountKobo: number;
  ticketCount?: number;
  currency?: string;
  style?: ViewStyle;
}

export const formatKoboToNaira = (kobo: number): string => {
  const naira = (kobo / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₦${naira}`;
};

export const PriceSummary: React.FC<PriceSummaryProps> = ({
  subtotalKobo,
  serviceFeeKobo,
  totalAmountKobo,
  ticketCount,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorRole('surface-container', '#1D1B20'),
          borderColor: colorRole('outline-variant', '#49454F'),
        },
        style,
      ]}
      accessibilityRole="summary"
    >
      <Text variant="title-medium" colorRoleName="on-surface" style={styles.header}>
        Order Summary
      </Text>

      <View style={styles.row}>
        <Text variant="body-medium" colorRoleName="on-surface-variant">
          Tickets {ticketCount ? `(${ticketCount}x)` : ''}
        </Text>
        <Text variant="body-medium" colorRoleName="on-surface">
          {formatKoboToNaira(subtotalKobo)}
        </Text>
      </View>

      <View style={styles.row}>
        <Text variant="body-medium" colorRoleName="on-surface-variant">
          Service Fee
        </Text>
        <Text variant="body-medium" colorRoleName="on-surface">
          {formatKoboToNaira(serviceFeeKobo)}
        </Text>
      </View>

      <View
        style={[
          styles.divider,
          { backgroundColor: colorRole('outline-variant', '#49454F') },
        ]}
      />

      <View style={styles.row}>
        <Text variant="title-medium" colorRoleName="on-surface" style={styles.totalLabel}>
          Total Amount
        </Text>
        <Text variant="headline-small" colorRoleName="primary" style={styles.totalValue}>
          {formatKoboToNaira(totalAmountKobo)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: spacingVal('md', 16),
    borderWidth: 1,
  },
  header: {
    fontWeight: '700',
    marginBottom: spacingVal('sm', 12),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingVal('xs', 8),
  },
  divider: {
    height: 1,
    marginVertical: spacingVal('xs', 8),
  },
  totalLabel: {
    fontWeight: '700',
  },
  totalValue: {
    fontWeight: '800',
  },
});

