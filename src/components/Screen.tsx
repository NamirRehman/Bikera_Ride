import React from 'react';
import { ScrollView, View, StyleSheet as RNStyleSheet, RefreshControlProps, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BikeraBackground } from './BikeraBackground';
import { AppHeader } from './AppHeader';
import { FocusReveal } from './motion';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  contentClassName?: StyleProp<ViewStyle> | string;
  showHeader?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Soft content enter animation on first focus (default off — avoids tab jank) */
  animate?: boolean;
};

export function Screen({
  children,
  scroll = true,
  contentStyle,
  contentClassName,
  showHeader = true,
  refreshControl,
  animate = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const incoming = contentStyle ?? (typeof contentClassName === 'string' ? undefined : contentClassName);
  const resolvedContentStyle = incoming
    ? RNStyleSheet.flatten(incoming)
    : { paddingHorizontal: 16, paddingTop: 8 };

  const body = animate ? (
    <FocusReveal style={scroll ? undefined : { flex: 1 }}>{children}</FocusReveal>
  ) : (
    children
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface1 }}>
      <BikeraBackground />
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: scroll ? 0 : insets.bottom }}>
        {showHeader && <AppHeader />}
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ paddingTop: 8, paddingBottom: Math.max(insets.bottom, 24) + 88 }}
            style={{ flex: 1 }}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={resolvedContentStyle}>{body}</View>
          </ScrollView>
        ) : (
          <View style={[resolvedContentStyle, { flex: 1 }]}>{body}</View>
        )}
      </View>
    </View>
  );
}
