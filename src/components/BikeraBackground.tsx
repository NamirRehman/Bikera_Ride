import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/tokens';

/**
 * Flat fill. A full-screen gradient plus glow circles was redrawn on every
 * tab switch and every scroll.
 */
export const BikeraBackground = memo(function BikeraBackground() {
  return <View pointerEvents="none" style={styles.fill} />;
});

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface1,
  },
});
