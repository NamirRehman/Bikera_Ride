import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, shadows } from '../theme/tokens';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={StyleSheet.flatten([styles.card, style || {}])}>
      <View style={styles.inner}>{children}</View>
    </View>
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


