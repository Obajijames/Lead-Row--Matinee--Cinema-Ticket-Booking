// apps/mobile/src/screens/WaitingRoomScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colorRole, spacingVal, radiusVal } from '../tokens';
import { useTheme } from '../theme/ThemeContext';
import {
  Text,
  ScreenHeader,
  Card,
  Button,
} from '../components';
import { apiRequest } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'WaitingRoom'>;

interface QueueStatusResponse {
  admitted: boolean;
  token?: string;
  position?: number;
  estimatedWaitSeconds?: number;
  retryAfterSeconds?: number;
}

export const WaitingRoomScreen: React.FC<Props> = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showtimeId } = route.params;
  const [position, setPosition] = useState<number>(1);
  const [estimatedWait, setEstimatedWait] = useState<number>(30);
  const [isAdmitted, setIsAdmitted] = useState<boolean>(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollQueueStatus = async () => {
    try {
      const res = await apiRequest<QueueStatusResponse>(`/v1/showtimes/${showtimeId}/queue/status`);

      if (res.admitted && res.token) {
        setIsAdmitted(true);
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

        // Automatically navigate to SeatMap with admission token
        setTimeout(() => {
          navigation.replace('SeatMap', { showtimeId });
        }, 1200);
        return;
      }

      if (res.position) setPosition(res.position);
      if (res.estimatedWaitSeconds) setEstimatedWait(res.estimatedWaitSeconds);

      // Schedule next poll with server-guided interval + jitter
      const nextInterval = (res.retryAfterSeconds || 10) * 1000;
      pollTimerRef.current = setTimeout(pollQueueStatus, nextInterval);
    } catch {
      // Retry in 10 seconds on network hiccup
      pollTimerRef.current = setTimeout(pollQueueStatus, 10000);
    }
  };

  useEffect(() => {
    pollQueueStatus();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [showtimeId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Virtual Waiting Room"
        onBack={() => navigation.navigate('Home')}
      />

      <View style={styles.content}>
        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            {isAdmitted ? (
              <Ionicons name="checkmark-circle" size={56} color="#00E676" />
            ) : (
              <Ionicons name="time" size={52} color={colors.primary} />
            )}
          </View>

          <Text variant="title-large" colorRoleName="on-surface" style={styles.title}>
            {isAdmitted ? "You're In!" : 'High Demand Showtime'}
          </Text>

          <Text variant="body-medium" colorRoleName="on-surface-variant" style={styles.subtitle}>
            {isAdmitted
              ? 'Opening seat map selection for your session...'
              : 'To give everyone a fair chance without crashing inventory, you have been placed in our virtual queue.'}
          </Text>

          {!isAdmitted && (
            <View style={[styles.statsContainer, { backgroundColor: colors.surfaceContainerHigh }]}>
              <View style={styles.statBox}>
                <Text variant="headline-medium" colorRoleName="primary" style={styles.statValue}>
                  #{position}
                </Text>
                <Text variant="label-small" colorRoleName="outline">
                  YOUR POSITION
                </Text>
              </View>

              <View style={[styles.statDivider, { backgroundColor: colors.outlineVariant }]} />

              <View style={styles.statBox}>
                <Text variant="headline-medium" colorRoleName="on-surface" style={styles.statValue}>
                  ~{Math.ceil(estimatedWait / 60)}m
                </Text>
                <Text variant="label-small" colorRoleName="outline">
                  ESTIMATED WAIT
                </Text>
              </View>
            </View>
          )}

          <Text variant="body-small" colorRoleName="outline" style={styles.noticeText}>
            Please keep this screen open. Your place is reserved automatically.
          </Text>
        </Card>

        <Button
          label="Leave Queue & Return Home"
          variant="outline"
          size="md"
          onPress={() => navigation.navigate('Home')}
          style={styles.exitBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacingVal('md', 16),
    justifyContent: 'center',
  },
  card: {
    padding: spacingVal('xl', 24),
    alignItems: 'center',
    backgroundColor: '#161622',
    borderColor: '#2D2D3D',
    borderWidth: 1,
    borderRadius: radiusVal('lg', 16),
  },
  iconContainer: {
    marginBottom: spacingVal('lg', 20),
  },
  celebrateEmoji: {
    fontSize: 48,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacingVal('xs', 8),
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacingVal('xl', 24),
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2C',
    borderRadius: radiusVal('md', 12),
    paddingVertical: spacingVal('md', 16),
    paddingHorizontal: spacingVal('lg', 20),
    width: '100%',
    marginBottom: spacingVal('lg', 20),
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '800',
    marginBottom: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2D2D3D',
  },
  noticeText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  exitBtn: {
    marginTop: spacingVal('xl', 24),
  },
});
