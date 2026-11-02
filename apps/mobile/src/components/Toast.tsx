// apps/mobile/src/components/Toast.tsx
import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radiusVal, spacingVal } from '../tokens';
import { Text } from './Text';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  visible: boolean;
  message: string;
  title?: string;
  variant?: ToastVariant;
  durationMs?: number;
  onDismiss: () => void;
  position?: 'top' | 'bottom';
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  title,
  variant = 'info',
  durationMs = 4000,
  onDismiss,
  position = 'top',
  actionLabel,
  onAction,
  style,
}) => {
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (visible && durationMs > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  const variantConfig: Record<
    ToastVariant,
    { icon: keyof typeof Ionicons.glyphMap; color: string; border: string; bg: string }
  > = {
    success: {
      icon: 'checkmark-circle',
      color: '#4caf50',
      border: 'rgba(76, 175, 80, 0.45)',
      bg: isDark ? 'rgba(28, 44, 30, 0.95)' : '#E8F5E9',
    },
    error: {
      icon: 'alert-circle',
      color: '#fb0d36',
      border: 'rgba(251, 13, 54, 0.45)',
      bg: isDark ? 'rgba(44, 20, 24, 0.95)' : '#FFEBEE',
    },
    warning: {
      icon: 'warning',
      color: '#d7960a',
      border: 'rgba(215, 150, 10, 0.45)',
      bg: isDark ? 'rgba(44, 36, 20, 0.95)' : '#FFF8E1',
    },
    info: {
      icon: 'information-circle',
      color: '#01B4E4',
      border: 'rgba(1, 180, 228, 0.45)',
      bg: isDark ? 'rgba(16, 36, 52, 0.95)' : '#E1F5FE',
    },
  };

  const currentVariant = variantConfig[variant];

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    onDismiss();
  };

  const handleAction = () => {
    if (onAction) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.selectionAsync();
        } catch {}
      }
      onAction();
    }
  };

  const enteringAnim = position === 'top' ? FadeInDown.duration(300) : FadeInUp.duration(300);
  const exitingAnim = position === 'top' ? FadeOutUp.duration(250) : FadeOutDown.duration(250);

  return (
    <Animated.View
      entering={enteringAnim}
      exiting={exitingAnim}
      style={[
        styles.toastWrapper,
        position === 'top' ? styles.topPosition : styles.bottomPosition,
        {
          backgroundColor: currentVariant.bg,
          borderColor: currentVariant.border,
        },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={title ? `${title}: ${message}` : message}
    >
      <View style={styles.contentRow}>
        <Ionicons
          name={currentVariant.icon}
          size={22}
          color={currentVariant.color}
          style={styles.leadingIcon}
        />

        <View style={styles.textContainer}>
          {title && (
            <Text
              variant="label-medium"
              colorRoleName="on-surface"
              style={[styles.titleText, { color: isDark ? '#FFFFFF' : '#1D1B20' }]}
            >
              {title}
            </Text>
          )}
          <Text
            variant="body-small"
            colorRoleName="on-surface-variant"
            style={[styles.messageText, { color: isDark ? 'rgba(255, 255, 255, 0.88)' : '#49454F' }]}
          >
            {message}
          </Text>
        </View>

        {actionLabel && (
          <TouchableOpacity
            onPress={handleAction}
            style={styles.actionBtn}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            activeOpacity={0.7}
          >
            <Text variant="label-medium" style={{ color: currentVariant.color, fontWeight: '700' }}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={isDark ? 'rgba(255,255,255,0.7)' : '#49454F'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: spacingVal('md', 16),
    right: spacingVal('md', 16),
    zIndex: 9999,
    borderRadius: radiusVal('md', 12),
    borderWidth: 1.5,
    paddingHorizontal: spacingVal('md', 16),
    paddingVertical: spacingVal('sm', 12),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  topPosition: {
    top: Platform.OS === 'ios' ? 54 : 40,
  },
  bottomPosition: {
    bottom: Platform.OS === 'ios' ? 34 : 20,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingIcon: {
    marginRight: spacingVal('sm', 12),
  },
  textContainer: {
    flex: 1,
    paddingRight: spacingVal('xs', 8),
  },
  titleText: {
    fontWeight: '800',
    marginBottom: 2,
  },
  messageText: {
    lineHeight: 18,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

