// apps/mobile/src/components/Input.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colorRole, spacingVal, typographyStyle, radiusTokens } from '../tokens';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingPress?: () => void;
  rightSlot?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  inputContainerStyle,
  leadingIcon,
  trailingIcon,
  onTrailingPress,
  rightSlot,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColorRole = (): string => {
    if (error) return 'error';
    if (isFocused) return 'primary';
    return 'outline-variant';
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="label-medium" colorRoleName="on-surface-variant" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colorRole('surface-container-high', '#1C1C26'),
            borderColor: colorRole(getBorderColorRole(), '#2D2D35'),
          },
          inputContainerStyle,
        ]}
      >
        {leadingIcon && (
          <Ionicons
            name={leadingIcon}
            size={20}
            color={colorRole(isFocused ? 'primary' : 'outline', isFocused ? '#d7960a' : '#8A8A9E')}
            style={styles.leadingIcon}
          />
        )}

        <TextInput
          style={[
            styles.input,
            typographyStyle('body-medium'),
            { color: colorRole('on-surface', '#FFFFFF') },
            style,
          ]}
          placeholderTextColor={colorRole('outline', '#8A8A9E')}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          accessibilityLabel={label || rest.placeholder}
          {...rest}
        />

        {rightSlot || (trailingIcon ? (
          <Pressable
            onPress={onTrailingPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Input action"
            style={styles.trailingBtn}
          >
            <Ionicons
              name={trailingIcon}
              size={18}
              color={colorRole('outline', '#8A8A9E')}
            />
          </Pressable>
        ) : null)}
      </View>

      {error ? (
        <Text variant="body-small" colorRoleName="error" style={styles.helper}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="body-small" colorRoleName="on-surface-variant" style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacingVal('md', 16),
  },
  label: {
    marginBottom: spacingVal('xxs', 4),
    fontWeight: '600',
  },
  inputContainer: {
    minHeight: 48,
    borderRadius: radiusTokens.md, // 12
    borderWidth: 1.5,
    paddingHorizontal: spacingVal('md', 16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingIcon: {
    marginRight: spacingVal('xs', 8),
  },
  input: {
    flex: 1,
    paddingVertical: spacingVal('xs', 8),
  },
  trailingBtn: {
    padding: spacingVal('xxs', 4),
    marginLeft: spacingVal('xs', 8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    marginTop: spacingVal('xxs', 4),
    paddingHorizontal: spacingVal('xxs', 4),
  },
});

