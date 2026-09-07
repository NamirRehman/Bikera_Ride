import React from 'react';
import { Text, StyleSheet, TextStyle, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../theme/tokens';
import { StyleSheet as RNStyleSheet } from 'react-native';

let MaskedView: any = null;
try {
  // optional dependency, gracefully fallback if not installed
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MaskedView = require('@react-native-masked-view/masked-view').default;
} catch (e) {
  MaskedView = null;
}

export function GradientText({
  children,
  style,
  colors = gradients.gradientBrand,
}: {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  colors?: readonly string[];
}) {
  const flatStyle = RNStyleSheet.flatten(style as any) || undefined;

  if (!MaskedView) {
    return <Text style={flatStyle as any}>{children}</Text>;
  }

  return (
    <MaskedView maskElement={<Text style={RNStyleSheet.flatten([flatStyle as any, styles.mask])}>{children}</Text>}>
      <LinearGradient colors={[...colors] as [ColorValue, ColorValue, ...ColorValue[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={RNStyleSheet.flatten([flatStyle as any, { opacity: 0 }])}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  mask: { backgroundColor: 'transparent' },
});

export default GradientText;
