# react-native-cinema-seat-map 🎟️

A high-performance, accessible, and customizable cinema seat-picker component for **React Native** and **Expo**.

Built to handle **300+ seats** with zero frame drops, intuitive spring-animated touch feedback, wheelchair-accessible markers, and customizable status styling.

---

## ✨ Features

- ⚡ **High Performance**: Smoothly scrolls and renders 300+ seats across multiple rows without virtualized lag.
- 🎨 **5 Seat States Supported**:
  - `AVAILABLE`: Ready for immediate selection.
  - `SELECTED`: Active user selection with brand primary color highlight.
  - `HELD`: Reserved by another user during active checkout sessions.
  - `SOLD`: Confirmed and permanently booked seats.
  - `WHEELCHAIR_ACCESSIBLE`: Clearly indicated accessible seating.
  - `VIP`: Luxury recliner tier with gold border accents.
- 🎛️ **Theming**: Configurable colors for all seat states, borders, and the curved cinema screen.
- ♿ **Accessibility Built-in**: Follows WCAG AA standards with descriptive `accessibilityLabel` per seat, high-contrast labels, and minimum 44pt touch bounding targets.
- 📱 **Cross-Platform**: Works seamlessly across iOS, Android, and Web.

---

## 📦 Installation

```bash
# npm
npm install react-native-cinema-seat-map

# yarn
yarn add react-native-cinema-seat-map

# pnpm
pnpm add react-native-cinema-seat-map
```

---

## 🚀 Quick Start

```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SeatMap, SeatItem } from 'react-native-cinema-seat-map';

const sampleSeats: SeatItem[] = [
  { id: 'a1', rowLabel: 'A', seatNumber: 1, seatType: 'WHEELCHAIR_ACCESSIBLE', status: 'AVAILABLE' },
  { id: 'a2', rowLabel: 'A', seatNumber: 2, seatType: 'STANDARD', status: 'AVAILABLE' },
  { id: 'a3', rowLabel: 'A', seatNumber: 3, seatType: 'STANDARD', status: 'HELD' },
  { id: 'a4', rowLabel: 'A', seatNumber: 4, seatType: 'STANDARD', status: 'SOLD' },
  { id: 'b1', rowLabel: 'B', seatNumber: 1, seatType: 'VIP', status: 'AVAILABLE' },
  { id: 'b2', rowLabel: 'B', seatNumber: 2, seatType: 'VIP', status: 'AVAILABLE' },
];

export default function CinemaBookingScreen() {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);

  const handleToggleSeat = (seatId: string) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  };

  return (
    <View style={styles.container}>
      <SeatMap
        seats={sampleSeats}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={handleToggleSeat}
        maxSelectable={6}
        onMaxSelectionReached={(max) => alert(`You can select at most ${max} seats.`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
```

---

## 📖 Component Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `seats` | `SeatItem[]` | **Required** | Array of seat definitions for the theater. |
| `selectedSeatIds` | `string[]` | **Required** | Array of currently selected seat IDs. |
| `onToggleSeat` | `(seatId: string) => void` | **Required** | Callback when an available or selected seat is tapped. |
| `maxSelectable` | `number` | `undefined` | Cap on how many seats a user can select simultaneously. |
| `onMaxSelectionReached` | `(max: number) => void` | `undefined` | Callback fired when user tries to select beyond `maxSelectable`. |
| `theme` | `SeatThemeColors` | Default Dark | Custom color overrides for seat states and borders. |
| `showScreen` | `boolean` | `true` | Renders the top curved cinema screen banner. |
| `screenLabel` | `string` | `'CINEMA SCREEN'` | Text displayed below the curved screen arc. |
| `showLegend` | `boolean` | `true` | Renders the status and tier explanation legend at the bottom. |
| `seatSize` | `number` | `32` | Width and height of each seat cell in points. |
| `style` | `ViewStyle` | `undefined` | Custom outer container styling. |

---

## 🎨 Theme Customization

You can fully customize the colors to match your brand:

```tsx
<SeatMap
  seats={sampleSeats}
  selectedSeatIds={selectedSeatIds}
  onToggleSeat={handleToggleSeat}
  theme={{
    availableBg: '#1E1E2E',
    selectedBg: '#E50914', // Netflix Red
    selectedBorder: '#FF2E3A',
    heldBg: '#FF8800',
    soldBg: '#12121A',
    vipBorder: '#FFD700',
    screenColor: '#E50914',
  }}
/>
```

---

## 📄 License

MIT © [Lead Row Team](https://github.com/your-username)

