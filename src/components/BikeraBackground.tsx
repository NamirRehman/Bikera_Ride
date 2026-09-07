import React, { memo } from 'react';
import { View, StyleSheet, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, overlays, radii } from '../theme/tokens';

export const BikeraBackground = memo(function BikeraBackground() {
  return (
    <View style={{ position: 'absolute', inset: 0 }}>
      <LinearGradient
        colors={[...gradients.background] as [ColorValue, ColorValue, ...ColorValue[]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      />
      {/* soft brand glow top-right - more subtle */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 200,
          height: 200,
          borderRadius: 9999,
          backgroundColor: colors.brandPurple,
          opacity: 0.14,
        }}
      />
      {/* soft brand glow bottom-left - more subtle */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 240,
          height: 240,
          borderRadius: 9999,
          backgroundColor: colors.brandBlue300,
          opacity: 0.12,
        }}
      />
      {/* subtle overlay - reduced opacity */}
      <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' }} />
    </View>
  );
});

