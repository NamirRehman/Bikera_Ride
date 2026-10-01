import React, { useEffect } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const SPRING = { damping: 16, stiffness: 220, mass: 0.7 };
const ENTER_MS = 320;
const ENTER_EASING = Easing.out(Easing.cubic);

export const screenEntering = FadeIn.duration(ENTER_MS).easing(ENTER_EASING);
export const screenEnteringUp = FadeInUp.duration(ENTER_MS).easing(ENTER_EASING).springify().damping(18);
export const listItemEntering = (index: number) =>
  FadeInDown.delay(Math.min(index, 8) * 45)
    .duration(280)
    .easing(ENTER_EASING)
    .springify()
    .damping(18);

type FadeInViewProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  /** Prefer 'up' for headers/heroes; default fade for generic content */
  variant?: 'fade' | 'up' | 'down';
};

export function FadeInView({
  children,
  style,
  delay = 0,
  variant = 'fade',
}: FadeInViewProps) {
  const entering =
    variant === 'up'
      ? FadeInUp.delay(delay).duration(ENTER_MS).easing(ENTER_EASING)
      : variant === 'down'
        ? FadeInDown.delay(delay).duration(ENTER_MS).easing(ENTER_EASING)
        : FadeIn.delay(delay).duration(ENTER_MS).easing(ENTER_EASING);

  return (
    <Animated.View entering={entering} exiting={FadeOut.duration(160)} style={style}>
      {children}
    </Animated.View>
  );
}

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

/**
 * Press feedback via scale — cheaper and clearer than opacity-only taps.
 * Layout styles stay on Pressable so % widths / flexWrap grids work.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      style={style}
      {...rest}
    >
      <Animated.View style={[{ width: '100%' }, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

type AnimatedTabIconProps = {
  focused: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
};

/** Tab focus: soft scale + background fade */
export function AnimatedTabIcon({ focused, children, style, focusedStyle }: AnimatedTabIconProps) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.08]) }],
    opacity: interpolate(progress.value, [0, 1], [0.85, 1]),
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1]) }],
  }));

  return (
    <Animated.View style={[style, wrapStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 18,
          },
          focusedStyle,
          bgStyle,
        ]}
      />
      {children}
    </Animated.View>
  );
}

type FocusRevealProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Soft fade when a tab screen gains focus — only if not already painted. */
export function FocusReveal({ children, style }: FocusRevealProps) {
  const isFocused = useIsFocused();
  const progress = useSharedValue(1);
  const mountedFlag = useSharedValue(0);

  useEffect(() => {
    if (!isFocused) return;
    if (mountedFlag.value === 0) {
      mountedFlag.value = 1;
      progress.value = 1;
      return;
    }
    progress.value = 0.94;
    progress.value = withTiming(1, { duration: 180, easing: ENTER_EASING });
  }, [isFocused, progress, mountedFlag]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0.94, 1], [4, 0]) }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export const AnimatedListItem = Animated.View;

