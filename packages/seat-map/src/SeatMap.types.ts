// packages/seat-map/src/SeatMap.types.ts
import { StyleProp, ViewStyle, TextStyle } from 'react-native';

export type SeatStatus = 'AVAILABLE' | 'SELECTED' | 'HELD' | 'SOLD';
export type SeatTier = 'STANDARD' | 'VIP' | 'WHEELCHAIR_ACCESSIBLE';

export interface SeatItem {
  id: string;
  rowLabel: string;
  seatNumber: number;
  status: SeatStatus;
  seatType: SeatTier;
  price?: number;
}

export interface SeatThemeColors {
  availableBg?: string;
  availableBorder?: string;
  availableText?: string;

  selectedBg?: string;
  selectedBorder?: string;
  selectedText?: string;

  heldBg?: string;
  heldBorder?: string;
  heldText?: string;

  soldBg?: string;
  soldBorder?: string;
  soldText?: string;

  vipBorder?: string;
  screenColor?: string;
}

export interface SeatMapProps {
  /** Array of seat items representing the auditorium layout */
  seats: SeatItem[];
  /** Array of currently selected seat IDs */
  selectedSeatIds: string[];
  /** Callback triggered when a seat is toggled */
  onToggleSeat: (seatId: string) => void;
  /** Maximum number of seats allowed to be selected simultaneously */
  maxSelectable?: number;
  /** Callback when user exceeds max selection */
  onMaxSelectionReached?: (max: number) => void;
  /** Optional custom theme colors */
  theme?: SeatThemeColors;
  /** Whether to render the curved screen indicator at the top (default: true) */
  showScreen?: boolean;
  /** Screen label text (default: 'CINEMA SCREEN') */
  screenLabel?: string;
  /** Whether to render the status and category legend at the bottom (default: true) */
  showLegend?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom seat width in points (default: 32) */
  seatSize?: number;
}

