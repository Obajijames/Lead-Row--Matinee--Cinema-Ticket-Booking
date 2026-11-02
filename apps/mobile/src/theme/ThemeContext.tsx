// apps/mobile/src/theme/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  cardBg: string;
  cardBorder: string;
  inputBg: string;
  statusBar: 'light' | 'dark';
}

export const darkThemeColors: ThemeColors = {
  background: '#0B0B10',
  surface: '#0B0B10',
  surfaceContainerLow: '#12121A',
  surfaceContainer: '#1C1C26',
  surfaceContainerHigh: '#222230',
  surfaceContainerHighest: '#2D2D3D',
  onSurface: '#FFFFFF',
  onSurfaceVariant: '#A0A0B0',
  outline: '#8A8A9E',
  outlineVariant: '#2D2D35',
  primary: '#D7960A',
  onPrimary: '#000000',
  primaryContainer: 'rgba(215, 150, 10, 0.22)',
  cardBg: '#161622',
  cardBorder: '#2D2D3D',
  inputBg: '#1C1C26',
  statusBar: 'light',
};

export const lightThemeColors: ThemeColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceContainerLow: '#F0F2F5',
  surfaceContainer: '#FFFFFF',
  surfaceContainerHigh: '#E5E7EB',
  surfaceContainerHighest: '#D1D5DB',
  onSurface: '#111827',
  onSurfaceVariant: '#4B5563',
  outline: '#6B7280',
  outlineVariant: '#E5E7EB',
  primary: '#D7960A',
  onPrimary: '#FFFFFF',
  primaryContainer: '#FEF3C7',
  cardBg: '#FFFFFF',
  cardBorder: '#E5E7EB',
  inputBg: '#F3F4F6',
  statusBar: 'dark',
};

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ThemeColors;
  colorRole: (roleName: string, fallback?: string) => string;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'dark',
  setThemeMode: () => {},
  isDark: true,
  colors: darkThemeColors,
  colorRole: () => '#FFFFFF',
});

let currentThemeColors = darkThemeColors;

export function getActiveThemeColor(roleName: string, fallback?: string): string {
  const c = currentThemeColors;
  switch (roleName) {
    case 'background':
      return c.background;
    case 'surface':
      return c.surface;
    case 'surface-container-low':
      return c.surfaceContainerLow;
    case 'surface-container':
      return c.surfaceContainer;
    case 'surface-container-high':
      return c.surfaceContainerHigh;
    case 'surface-container-highest':
      return c.surfaceContainerHighest;
    case 'on-surface':
      return c.onSurface;
    case 'on-surface-variant':
      return c.onSurfaceVariant;
    case 'outline':
      return c.outline;
    case 'outline-variant':
      return c.outlineVariant;
    case 'primary':
      return c.primary;
    case 'on-primary':
      return c.onPrimary;
    case 'primary-container':
      return c.primaryContainer;
    case 'error':
      return '#FB0D36';
    case 'success':
      return '#34D399';
    default:
      return fallback || c.onSurface;
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  const isDark =
    themeMode === 'system' ? systemColorScheme !== 'light' : themeMode === 'dark';

  const colors = isDark ? darkThemeColors : lightThemeColors;
  currentThemeColors = colors;

  const colorRole = (roleName: string, fallback?: string): string => {
    return getActiveThemeColor(roleName, fallback);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        isDark,
        colors,
        colorRole,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

