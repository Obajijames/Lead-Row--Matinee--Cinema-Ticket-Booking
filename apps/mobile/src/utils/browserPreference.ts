// apps/mobile/src/utils/browserPreference.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

const STORAGE_KEY = '@lead_row_in_app_browser_enabled';

/**
 * Returns true if in-app browser is enabled, false if external browser is preferred.
 * Defaults to TRUE per user requirements.
 */
export async function getInAppBrowserPreference(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val === null) {
      return true; // Default is active
    }
    return val === 'true';
  } catch {
    return true;
  }
}

export async function setInAppBrowserPreference(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save in-app browser preference', e);
  }
}

/**
 * React hook for consuming and toggling the in-app browser preference.
 */
export function useInAppBrowserPreference() {
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getInAppBrowserPreference().then((pref) => {
      if (isMounted) {
        setIsInAppBrowser(pref);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const togglePreference = async (newValue?: boolean) => {
    const nextVal = typeof newValue === 'boolean' ? newValue : !isInAppBrowser;
    setIsInAppBrowser(nextVal);
    await setInAppBrowserPreference(nextVal);
  };

  return { isInAppBrowser, togglePreference, isLoading };
}
