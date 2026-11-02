// apps/mobile/src/tokens/index.ts
// Direct TypeScript export of Lead Row Design Tokens for React Native components

import { TextStyle } from 'react-native';
import tokensData from './tokens.json';
import { getActiveThemeColor } from '../theme/ThemeContext';

export interface ColorRole {
  hex: string;
  primitiveVariable: string | null;
}

export interface ShadowToken {
  boxShadow: string;
  offsetX: number;
  offsetY: number;
  radius: number;
  spread: number;
  color: string;
}

export interface TypographyToken {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: number | string;
  letterSpacing: number;
}

export interface DesignTokens {
  colors: {
    primitives: Record<string, string>;
    roles: Record<string, ColorRole>;
  };
  spacing: Record<string, number>;
  shadows: Record<string, ShadowToken>;
  typography: Record<string, TypographyToken>;
}

export const tokens: DesignTokens = tokensData as DesignTokens;

/**
 * Returns the hex string for a given design token color role.
 * Dynamically resolves against the active theme (Dark mood or Daylight).
 */
export function colorRole(roleName: string, fallback = '#ffffff'): string {
  return getActiveThemeColor(roleName, fallback);
}

/**
 * Maps a design token typography variant to React Native TextStyle.
 */
export function typographyStyle(variantName: string): TextStyle {
  const token = tokens.typography[variantName];
  if (!token) {
    return { fontSize: 14, lineHeight: 20, fontFamily: 'Inter-Regular' };
  }

  const weightStr = String(token.fontWeight);
  let fontWeightVal: TextStyle['fontWeight'] = '400';
  let fontFamily = 'Inter-Regular';

  if (['700', '800', '900', 'Bold', 'bold'].includes(weightStr)) {
    fontWeightVal = '700';
    fontFamily = 'Inter-Bold';
  } else if (['600', 'SemiBold', 'semibold'].includes(weightStr)) {
    fontWeightVal = '600';
    fontFamily = 'Inter-SemiBold';
  } else if (['500', 'Medium', 'medium'].includes(weightStr)) {
    fontWeightVal = '500';
    fontFamily = 'Inter-Medium';
  } else {
    fontWeightVal = '400';
    fontFamily = 'Inter-Regular';
  }

  return {
    fontFamily,
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    fontWeight: fontWeightVal,
    letterSpacing: token.letterSpacing,
  };
}

/**
 * Returns pixel spacing value for a spacing token name.
 */
export function spacingVal(key: string, fallback = 8): number {
  return tokens.spacing[key] ?? fallback;
}

export const radiusTokens: Record<string, number> = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

/**
 * Returns pixel border radius value.
 */
export function radiusVal(key: string, fallback = 8): number {
  return radiusTokens[key] ?? fallback;
}
