import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { GlassViewProps } from 'expo-glass-effect';

import { colors } from '../theme/tokens';

function loadGlassView(): React.ComponentType<GlassViewProps> | null {
  if (Platform.OS !== 'ios' || Number.parseInt(String(Platform.Version), 10) < 26) return null;

  // An older development/store binary may not contain the new native module.
  // Check before importing the package, which registers its native views eagerly.
  if (!requireOptionalNativeModule('ExpoGlassEffect')) return null;

  const glass = require('expo-glass-effect') as typeof import('expo-glass-effect');
  return glass.isLiquidGlassAvailable() && glass.isGlassEffectAPIAvailable()
    ? glass.GlassView
    : null;
}

const NativeGlassView = loadGlassView();
const GlassContext = createContext(false);

// UIKit handles Reduce Transparency itself. Navigator choice must stay stable
// when this accessibility preference changes, or mounted ride state gets reset.
export function isNativeLiquidGlassSupported() {
  return NativeGlassView !== null;
}

export function GlassProvider({ children }: { children: React.ReactNode }) {
  // Stay solid until the accessibility preference is known.
  const [reduceTransparency, setReduceTransparency] = useState(true);

  useEffect(() => {
    if (!NativeGlassView) return;
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => {
      preferenceChanged = true;
      setReduceTransparency(value);
    });
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (active && !preferenceChanged) setReduceTransparency(value);
      })
      .catch(() => {
        // Keep the solid fallback if the preference cannot be read.
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return (
    <GlassContext.Provider value={NativeGlassView !== null && !reduceTransparency}>
      {children}
    </GlassContext.Provider>
  );
}

export function useLiquidGlass() {
  return useContext(GlassContext);
}

/** Native iOS glass with the caller's original surface as the fallback. */
export function GlassSurface({
  children,
  style,
  enabled = true,
  ...props
}: ViewProps & { enabled?: boolean }) {
  const available = useLiquidGlass();

  if (available && enabled && NativeGlassView) {
    return (
      <NativeGlassView
        {...props}
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={colors.glassTint}
        style={[style, styles.glass]}
      >
        {children}
      </NativeGlassView>
    );
  }

  return <View {...props} style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: 'transparent',
    // Glass draws its own rim; clipping it also clips the native highlight.
    overflow: 'visible',
    borderCurve: 'continuous',
    borderColor: colors.glassBorder,
  },
});
