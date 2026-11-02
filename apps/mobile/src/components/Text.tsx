// apps/mobile/src/components/Text.tsx
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { colorRole, typographyStyle } from '../tokens';

export type TypographyVariant =
  | 'display-large'
  | 'display-medium'
  | 'display-small'
  | 'headline-large'
  | 'headline-medium'
  | 'headline-small'
  | 'title-large'
  | 'title-medium'
  | 'title-small'
  | 'body-large'
  | 'body-medium'
  | 'body-small'
  | 'label-large'
  | 'label-medium'
  | 'label-small';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  colorRoleName?: string;
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body-medium',
  colorRoleName = 'on-surface',
  style,
  children,
  ...rest
}) => {
  const typo = typographyStyle(variant);
  const color = colorRole(colorRoleName, '#ffffff');

  return (
    <RNText
      style={[styles.base, typo, { color }, style]}
      accessibilityRole="text"
      allowFontScaling={true}
      {...rest}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: 'Inter-Regular',
  },
});

