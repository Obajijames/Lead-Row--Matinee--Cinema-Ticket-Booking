// apps/mobile/src/api/client.ts
import { Platform, NativeModules } from 'react-native';

declare const process: any;

// Production live Vercel REST API as the authoritative fallback
const DEFAULT_API_URL = 'https://lead-row-cinema-ticket-booking-api.vercel.app';

export function getApiBaseUrl(): string {
  // 1. Explicitly configured via EXPO_PUBLIC_API_URL
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Fallback to production cloud API
  return DEFAULT_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    unavailableSeats?: string[];
  };
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add 8-second request timeout to prevent screens getting stuck on skeleton loading
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json: ApiResponse<T> = await response.json();

    if (!response.ok || !json.success) {
      const errorMsg = json.error?.message || `Request failed with status ${response.status}`;
      const error: any = new Error(errorMsg);
      error.code = json.error?.code;
      error.unavailableSeats = json.error?.unavailableSeats;
      error.status = response.status;
      throw error;
    }

    return json.data;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error(
        `Connection timed out. Cannot reach backend at ${baseUrl}. Ensure your phone and PC are on the same Wi-Fi network.`
      );
    }

    if (err.message && err.message.includes('Network request failed')) {
      throw new Error(
        `Network error: Cannot reach server at ${baseUrl}. Check your Wi-Fi or firewall settings.`
      );
    }

    throw err;
  }
}
