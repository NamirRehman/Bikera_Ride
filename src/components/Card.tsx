import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';
import { GlassSurface } from './glass-surface';

export function Card({
  children,
  style,
  glass = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glass?: boolean;
}) {
  return (
    <GlassSurface enabled={glass} style={[styles.card, style]}>
      <View style={styles.inner}>{children}</View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.border1,
    borderWidth: 1,
    borderRadius: radii['3xl'],
    padding: 0,
    marginVertical: 8,
    overflow: 'hidden',
  },
  inner: {
    padding: 18,
    ...shadows.soft,
  },
});


