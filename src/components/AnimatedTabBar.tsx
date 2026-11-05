import React, { memo, useContext, useEffect } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import Animated, {
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/tokens';

const SPRING = { duration: 400, dampingRatio: 1, reduceMotion: ReduceMotion.System };

const TAB_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }
> = {
  Dashboard: { label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  // Shown to riders as "Ride"; the route keeps its name so existing navigate('Track') calls work.
  Track: { label: 'Ride', icon: 'bicycle-outline', iconFocused: 'bicycle' },
  Friends: { label: 'Friends', icon: 'people-outline', iconFocused: 'people' },
  Leaderboard: { label: 'Ranks', icon: 'trophy-outline', iconFocused: 'trophy' },
  More: { label: 'More', icon: 'grid-outline', iconFocused: 'grid' },
};

const TabItem = memo(function TabItem({
  routeName,
  focused,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  const reducedMotion = useReducedMotion();
  const meta =
    TAB_META[routeName] ??
    ({ label: routeName, icon: 'ellipse-outline', iconFocused: 'ellipse' } as const);

  useEffect(() => {
    progress.set(withSpring(focused ? 1 : 0, SPRING));
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: reducedMotion ? [] : [
      { scale: interpolate(progress.get(), [0, 1], [1, 1.12]) },
      { translateY: interpolate(progress.get(), [0, 1], [0, -1]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 1], [0.55, 1]),
    transform: reducedMotion ? [] : [{ translateY: interpolate(progress.get(), [0, 1], [2, 0]) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      accessibilityLabel={accessibilityLabel ?? meta.label}
      testID={testID}
      style={styles.tabItem}
      hitSlop={6}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? meta.iconFocused : meta.icon}
          size={22}
          color={focused ? colors.brandPurple : colors.textTertiary}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.brandPurple : colors.textTertiary },
          labelStyle,
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.5}
      >
        {meta.label}
      </Animated.Text>
    </Pressable>
  );
});

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const barWidth = useSharedValue(0);
  const index = useSharedValue(state.index);
  const tabCount = state.routes.length;

  useEffect(() => {
    index.set(withSpring(state.index, SPRING));
  }, [state.index, index]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    barWidth.set(e.nativeEvent.layout.width);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const w = barWidth.get();
    if (w <= 0 || tabCount <= 0) return { opacity: 0 };
    const slot = w / tabCount;
    const pillW = Math.min(56, slot * 0.72);
    return {
      opacity: 1,
      width: pillW,
      transform: [
        {
          translateX: index.get() * slot + (slot - pillW) / 2,
        },
      ],
    };
  });

  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, {
        paddingBottom: bottomPad,
        paddingLeft: Math.max(insets.left, 8),
        paddingRight: Math.max(insets.right, 8),
      }]}
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
    >
      <View style={styles.bar} onLayout={onBarLayout}>
        <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]} />
        {state.routes.map((route, routeIndex) => {
          const { options } = descriptors[route.key];
          const focused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) {
              return;
            }
            if (!focused) {
              // Start on the UI thread before the destination mounts. Assigning
              // the raw index here used to skip the indicator's spring entirely.
              index.set(withSpring(routeIndex, SPRING));
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              routeName={route.name}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(6, 7, 23, 0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 0,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(66, 192, 251, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(66, 192, 251, 0.28)',
  },
  tabItem: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
