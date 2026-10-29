import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ThreeDotLoaderProps {
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

const EASE = Easing.inOut(Easing.ease);

/**
 * UI-thread loader. The old Animated loop restarted on the JS thread, so it
 * froze whenever a canister response was being decoded.
 */
function Dot({
  color,
  size,
  delay,
  marginRight,
}: {
  color: string;
  size: number;
  delay: number;
  marginRight: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: EASE }),
          withTiming(0, { duration: 600, easing: EASE })
        ),
        -1,
        false
      )
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value * 0.5,
    transform: [{ translateY: -8 * progress.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          marginRight,
        },
        style,
      ]}
    />
  );
}

export function ThreeDotLoader({ color = '#fff', size = 'medium' }: ThreeDotLoaderProps) {
  const dotSize = size === 'small' ? 6 : size === 'large' ? 10 : 8;
  const spacing = size === 'small' ? 4 : size === 'large' ? 8 : 6;

  return (
    <View style={styles.container}>
      <Dot color={color} size={dotSize} delay={0} marginRight={spacing} />
      <Dot color={color} size={dotSize} delay={200} marginRight={spacing} />
      <Dot color={color} size={dotSize} delay={400} marginRight={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
