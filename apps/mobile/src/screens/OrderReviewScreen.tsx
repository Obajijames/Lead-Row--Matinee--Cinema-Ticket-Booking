// apps/mobile/src/screens/OrderReviewScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colorRole, spacingVal } from '../tokens';
import {
  Text,
  ScreenHeader,
  Card,
  Button,
  PriceSummary,
  Input,
} from '../components';
import { apiRequest } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderReview'>;

interface CheckoutResult {
  bookingId: string;
  idempotencyKey: string;
  status: string;
  subtotalKobo: number;
  serviceFeeKobo: number;
  totalAmountKobo: number;
  currency: string;
  paymentUrl: string | null;
  providerRef: string | null;
}

export const OrderReviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { holdToken, showtimeId } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutResult | null>(null);

  // Customer contact state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();

  const validateInputs = (): boolean => {
    let isValid = true;
    setNameError(undefined);
    setEmailError(undefined);

    const trimmedName = customerName.trim();
    const trimmedEmail = customerEmail.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Please enter your full name (at least 2 characters)');
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }

    return isValid;
  };

  const handleCheckout = async () => {
    if (!validateInputs()) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }

    try {
      setIsProcessing(true);
      const idempotencyKey = `idemp-mob-${Date.now()}`;

      const res = await apiRequest<CheckoutResult>('/v1/bookings/checkout', {
        method: 'POST',
        body: JSON.stringify({
          holdToken,
          showtimeId,
          idempotencyKey,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
        }),
      });

      setCheckoutData(res);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      if (res.paymentUrl) {
        // Automatically launch Flutterwave hosted checkout in the device browser
        Linking.openURL(res.paymentUrl).catch(() => {});

        Alert.alert(
          'Flutterwave Checkout Opened',
          `Order #${res.bookingId.slice(0, 8)} initialized for ₦${(
            res.totalAmountKobo / 100
          ).toLocaleString()}.\n\nFlutterwave test payment page has been opened in your browser for ${customerName.trim()} (${customerEmail.trim()}).\n\nComplete payment there, then return to view your ticket.`,
          [
            {
              text: 'Re-open Checkout',
              onPress: () => {
                if (res.paymentUrl) Linking.openURL(res.paymentUrl);
              },
            },
            {
              text: 'View Ticket',
              onPress: () => navigation.navigate('Ticket', { ticketToken: res.bookingId }),
            },
          ]
        );
      } else {
        Alert.alert(
          'Booking Order Created',
          `Your reservation #${res.bookingId.slice(0, 8)} is initialized. Total: ₦${(
            res.totalAmountKobo / 100
          ).toLocaleString()}`,
          [
            {
              text: 'View Ticket',
              onPress: () => navigation.navigate('Ticket', { ticketToken: res.bookingId }),
            },
            {
              text: 'Return Home',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err.message || 'Could not complete checkout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorRole('background', '#0B0B10') }]}>
      <ScreenHeader title="Order Review" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hold Expiry Notice */}
          <Card style={styles.noticeCard}>
            <View style={styles.noticeTitleRow}>
              <Ionicons name="time" size={18} color={colorRole('primary', '#d7960a')} style={{ marginRight: 6 }} />
              <Text variant="title-small" colorRoleName="primary" style={styles.noticeTitle}>
                10-Minute Hold Active
              </Text>
            </View>
            <Text variant="body-small" colorRoleName="on-surface-variant">
              Your seats are temporarily reserved. Complete payment before the session expires to guarantee your booking.
            </Text>
          </Card>

          {/* Customer Contact Details */}
          <Card style={styles.contactCard}>
            <View style={styles.contactHeaderRow}>
              <Ionicons name="person-circle-outline" size={20} color={colorRole('primary', '#d7960a')} style={{ marginRight: 8 }} />
              <Text variant="title-small" colorRoleName="on-surface" style={styles.contactTitle}>
                Ticket Recipient Details
              </Text>
            </View>
            <Text variant="body-small" colorRoleName="on-surface-variant" style={{ marginBottom: 12 }}>
              Your electronic ticket, admission QR code, and receipt will be issued to these details.
            </Text>

            <Input
              label="Full Name"
              placeholder="e.g. John Doe"
              leadingIcon="person-outline"
              value={customerName}
              onChangeText={(text) => {
                setCustomerName(text);
                if (nameError) setNameError(undefined);
              }}
              error={nameError}
              containerStyle={{ marginBottom: 12 }}
            />

            <Input
              label="Email Address"
              placeholder="e.g. john@example.com"
              leadingIcon="mail-outline"
              value={customerEmail}
              onChangeText={(text) => {
                setCustomerEmail(text);
                if (emailError) setEmailError(undefined);
              }}
              error={emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              helperText="We will send your admission QR code here"
            />
          </Card>

          {/* Financial Breakdown */}
          <View style={styles.summaryContainer}>
            <PriceSummary
              subtotalKobo={checkoutData ? checkoutData.subtotalKobo : 450000}
              serviceFeeKobo={checkoutData ? checkoutData.serviceFeeKobo : 50000}
              totalAmountKobo={checkoutData ? checkoutData.totalAmountKobo : 500000}
            />
          </View>

          {/* Payment Provider Notice */}
          <Card style={styles.paymentCard}>
            <Text variant="title-small" colorRoleName="on-surface" style={styles.paymentTitle}>
              Payment Method
            </Text>
            <Text variant="body-medium" colorRoleName="on-surface-variant">
              Flutterwave Hosted Checkout (Test Mode)
            </Text>
            <Text variant="body-small" colorRoleName="outline" style={{ marginTop: 4 }}>
              Card, Bank Transfer, and USSD supported.
            </Text>
          </Card>

          {checkoutData?.paymentUrl ? (
            <View style={{ gap: 12 }}>
              <Button
                label="Re-open Flutterwave Checkout"
                onPress={() => Linking.openURL(checkoutData.paymentUrl!)}
                variant="primary"
                size="lg"
                style={styles.payBtn}
              />
              <Button
                label="View Ticket Status"
                onPress={() => navigation.navigate('Ticket', { ticketToken: checkoutData.bookingId })}
                variant="outline"
                size="lg"
                style={styles.payBtn}
              />
            </View>
          ) : (
            <Button
              label={isProcessing ? 'Processing Checkout...' : 'Proceed to Payment'}
              isLoading={isProcessing}
              onPress={handleCheckout}
              variant="primary"
              size="lg"
              style={styles.payBtn}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacingVal('md', 16),
  },
  noticeCard: {
    marginBottom: spacingVal('md', 16),
    borderColor: '#d7960a',
  },
  noticeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingVal('xxs', 4),
  },
  noticeTitle: {
    fontWeight: '700',
  },
  contactCard: {
    marginBottom: spacingVal('md', 16),
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingVal('xxs', 4),
  },
  contactTitle: {
    fontWeight: '700',
  },
  summaryContainer: {
    marginBottom: spacingVal('md', 16),
  },
  paymentCard: {
    marginBottom: spacingVal('xl', 24),
  },
  paymentTitle: {
    fontWeight: '700',
    marginBottom: spacingVal('xxs', 4),
  },
  payBtn: {
    width: '100%',
  },
});


