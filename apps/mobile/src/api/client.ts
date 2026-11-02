// apps/mobile/src/api/client.ts
import { Platform, NativeModules } from 'react-native';

declare const process: any;

// Fallback to developer machine's current local Wi-Fi IP address
const DEFAULT_HOST_IP = '10.150.119.53';

export function getApiBaseUrl(): string {
  // 1. Explicitly configured via EXPO_PUBLIC_API_URL
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Development dynamic host detection from Metro bundle URL
  if (__DEV__) {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      // Matches http://192.168.x.x:8081 or exp://192.168.x.x:8081
      const match = scriptURL.match(/^(?:https?|exps?):\/\/([^/:]+)/);
      if (match && match[1]) {
        const host = match[1];
        // If not a tunnel/cloud URL, use the detected LAN host
        if (!host.includes('ngrok') && !host.includes('expo') && host !== 'localhost' && host !== '127.0.0.1') {
          return `http://${host}:4000`;
        }
      }
    }

    if (Platform.OS === 'android') {
      // If running on an emulator without scriptURL
      return `http://${DEFAULT_HOST_IP}:4000`;
    }
  }

  // 3. Physical phone on LAN or fallback
  return `http://${DEFAULT_HOST_IP}:4000`;
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
