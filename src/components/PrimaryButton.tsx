import React from 'react';
import { Pressable, Text, ViewStyle, StyleSheet as RNStyleSheet, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, radii, shadows, colors } from '../theme/tokens';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const pressStyle = RNStyleSheet.flatten(style as any) || undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [pressStyle, pressed && !disabled && { opacity: 0.88 }]}
    >
      <LinearGradient
        colors={[...gradients.button] as [ColorValue, ColorValue, ...ColorValue[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radii.xl,
          paddingVertical: 14,
          paddingHorizontal: 16,
          opacity: disabled ? 0.5 : 1,
          ...shadows.soft,
        }}
      >
        <Text style={{ color: 'white', fontSize: 16, fontWeight: '800', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}


