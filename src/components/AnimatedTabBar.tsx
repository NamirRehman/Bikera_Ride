import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/tokens';

const SPRING = { damping: 18, stiffness: 240, mass: 0.75 };

const TAB_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconFocused: keyof typeof Ionicons.glyphMap }
> = {
  Dashboard: { label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  Track: { label: 'Track', icon: 'navigate-outline', iconFocused: 'navigate' },
  Friends: { label: 'Friends', icon: 'people-outline', iconFocused: 'people' },
  Leaderboard: { label: 'Ranks', icon: 'trophy-outline', iconFocused: 'trophy' },
  More: { label: 'More', icon: 'grid-outline', iconFocused: 'grid' },
};

function TabItem({
  routeName,
  focused,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel?: string;
}) {
  const progress = useSharedValue(focused ? 1 : 0);
  const meta =
    TAB_META[routeName] ??
    ({ label: routeName, icon: 'ellipse-outline', iconFocused: 'ellipse' } as const);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.12]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -1]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.55, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [2, 0]) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel ?? meta.label}
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
      >
        {meta.label}
      </Animated.Text>
    </Pressable>
  );
}

export function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const barWidth = useSharedValue(0);
  const index = useSharedValue(state.index);
  const tabCount = state.routes.length;

  useEffect(() => {
    index.value = withSpring(state.index, SPRING);
  }, [state.index, index]);

  const onBarLayout = (e: LayoutChangeEvent) => {
    barWidth.value = e.nativeEvent.layout.width;
  };

  const indicatorStyle = useAnimatedStyle(() => {
    const w = barWidth.value;
    if (w <= 0 || tabCount <= 0) return { opacity: 0 };
    const slot = w / tabCount;
    const pillW = Math.min(56, slot * 0.72);
    return {
      opacity: 1,
      width: pillW,
      transform: [
        {
          translateX: index.value * slot + (slot - pillW) / 2,
        },
      ],
    };
  });

  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={styles.bar} onLayout={onBarLayout}>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
        {state.routes.map((route, routeIndex) => {
          const { options } = descriptors[route.key];
          const focused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
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
