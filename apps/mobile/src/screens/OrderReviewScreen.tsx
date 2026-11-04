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
import { useTheme } from '../theme/ThemeContext';
import * as WebBrowser from 'expo-web-browser';
import { getInAppBrowserPreference } from '../utils/browserPreference';
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
  const { colors } = useTheme();
  const { holdToken, showtimeId } = route.params;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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

  const checkAndNavigateToTicket = async (bookingId: string) => {
    setIsVerifying(true);
    try {
      // 1. Trigger server verification with Flutterwave
      const verif = await apiRequest<{ confirmed: boolean; bookingId: string }>(
        `/v1/bookings/${bookingId}/verify-payment`,
        { method: 'POST' }
      );

      if (verif.confirmed) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        navigation.replace('Ticket', { ticketToken: bookingId });
        return;
      }

      // 2. Poll up to 4 attempts if webhook or gateway takes a few seconds
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const booking = await apiRequest<{ status: string; id: string }>(`/v1/bookings/${bookingId}`);
        if (booking.status === 'CONFIRMED') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          navigation.replace('Ticket', { ticketToken: bookingId });
          return;
        }
      }
    } catch (e) {
      console.warn('Payment verification poll warning:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const openPaymentGateway = async (url: string, bookingId: string) => {
    const useInApp = await getInAppBrowserPreference();
    if (useInApp) {
      try {
        const result = await WebBrowser.openAuthSessionAsync(url, 'leadrow://');
        if (result.type === 'success') {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {}
          navigation.replace('Ticket', { ticketToken: bookingId });
          return;
        }
        // When auth session closes or user manually dismisses
        await checkAndNavigateToTicket(bookingId);
      } catch {
        Linking.openURL(url).catch(() => {});
        await checkAndNavigateToTicket(bookingId);
      }
    } else {
      Linking.openURL(url).catch(() => {});
      await checkAndNavigateToTicket(bookingId);
    }
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
        // Automatically launch Flutterwave hosted checkout
        await openPaymentGateway(res.paymentUrl, res.bookingId);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Order Review" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hold Expiry Notice */}
          <Card style={[styles.noticeCard, { borderColor: colors.primary }]}>
            <View style={styles.noticeTitleRow}>
              <Ionicons name="time" size={18} color={colors.primary} style={{ marginRight: 6 }} />
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
              <Ionicons name="person-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
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

          {checkoutData?.paymentUrl ? (
            <View style={{ gap: 12 }}>
              <Button
                label={isVerifying ? 'Verifying Confirmation...' : 'View Confirmed Ticket'}
                isLoading={isVerifying}
                onPress={() => checkAndNavigateToTicket(checkoutData.bookingId)}
                variant="primary"
                size="lg"
                style={styles.payBtn}
              />
              <Button
                label="Re-open Flutterwave Checkout"
                onPress={() => openPaymentGateway(checkoutData.paymentUrl!, checkoutData.bookingId)}
                variant="outline"
                size="lg"
                style={styles.payBtn}
              />
            </View>
          ) : (
            <Button
              label={isProcessing ? 'Processing Checkout...' : isVerifying ? 'Verifying Payment...' : 'Proceed to Payment'}
              isLoading={isProcessing || isVerifying}
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
    marginBottom: spacingVal('xl', 24),
  },
  payBtn: {
    width: '100%',
  },
});


