// apps/mobile/src/utils/bookingStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKING_IDS_KEY = '@leadrow_user_booking_ids';
const USER_EMAIL_KEY = '@leadrow_user_email';

export async function saveUserBookingId(bookingId: string): Promise<void> {
  if (!bookingId) return;
  try {
    const existing = await getUserBookingIds();
    if (!existing.includes(bookingId)) {
      const updated = [bookingId, ...existing];
      await AsyncStorage.setItem(BOOKING_IDS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to save booking ID locally:', err);
  }
}

export async function getUserBookingIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKING_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveUserEmail(email: string): Promise<void> {
  if (!email) return;
  try {
    await AsyncStorage.setItem(USER_EMAIL_KEY, email.trim().toLowerCase());
  } catch (err) {
    console.warn('Failed to save user email locally:', err);
  }
}

export async function getUserEmail(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_EMAIL_KEY);
  } catch {
    return null;
  }
}

