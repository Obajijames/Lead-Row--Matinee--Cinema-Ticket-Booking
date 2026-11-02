// apps/mobile/src/components/BottomSheet.tsx
import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ViewStyle,
  StyleProp,
  Platform,
  DimensionValue,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radiusVal, spacingVal } from '../tokens';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: DimensionValue;
  showCloseButton?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '85%',
  showCloseButton = true,
  contentContainerStyle,
}) => {
  const { colors } = useTheme();

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.selectionAsync();
      } catch {}
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
    >
      {/* Semi-transparent Backdrop with Tap-to-Dismiss */}
      <TouchableWithoutFeedback onPress={handleClose} accessibilityRole="button" accessibilityLabel="Dismiss modal backdrop">
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet Container */}
      <View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: colors.surfaceContainer,
            maxHeight,
          },
          contentContainerStyle,
        ]}
        accessibilityLabel={title ? `${title} sheet` : 'Bottom sheet'}
      >
        {/* Grab Handle Bar */}
        <View style={styles.handleWrapper}>
          <View style={[styles.grabHandle, { backgroundColor: colors.outlineVariant }]} />
        </View>

        {/* Optional Header Row */}
        {(title || showCloseButton) && (
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: spacingVal('sm', 12) }}>
              {title && (
                <Text variant="title-medium" colorRoleName="on-surface" style={styles.titleText}>
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text variant="body-small" colorRoleName="on-surface-variant" style={styles.subtitleText}>
                  {subtitle}
                </Text>
              )}
            </View>

            {showCloseButton && (
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.closeButton, { backgroundColor: colors.surfaceContainerHigh }]}
                accessibilityRole="button"
                accessibilityLabel="Close bottom sheet"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Sheet Content */}
        <View style={styles.contentWrapper}>{children}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: radiusVal('xl', 24),
    borderTopRightRadius: radiusVal('xl', 24),
    paddingTop: spacingVal('xs', 8),
    paddingHorizontal: spacingVal('md', 16),
    paddingBottom: spacingVal('xl', 24),
  },
  handleWrapper: {
    alignItems: 'center',
    paddingVertical: spacingVal('xs', 8),
  },
  grabHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingVal('md', 16),
    marginTop: spacingVal('xxs', 4),
  },
  titleText: {
    fontWeight: '800',
  },
  subtitleText: {
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    flexShrink: 1,
  },
});
