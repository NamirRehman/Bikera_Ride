import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../theme/tokens';

/**
 * Placeholder rows painted immediately. The pulse runs on the UI thread,
 * so it keeps moving while list data is still being fetched.
 */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={pulse}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.avatar} />
          <View style={styles.lines}>
            <View style={[styles.line, { width: '62%' }]} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border1,
    padding: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(66,192,251,0.16)',
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  lineShort: {
    width: '38%',
    height: 10,
  },
});
