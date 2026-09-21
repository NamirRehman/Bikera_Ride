import React from 'react';
import { ScrollView, View, StyleSheet as RNStyleSheet, RefreshControlProps, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BikeraBackground } from './BikeraBackground';
import { AppHeader } from './AppHeader';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  showHeader?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function Screen({ children, scroll = true, contentStyle, showHeader = true, refreshControl }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const resolvedContentStyle = contentStyle
    ? RNStyleSheet.flatten(contentStyle)
    : { paddingHorizontal: 16, paddingTop: 8 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface1 }}>
      <BikeraBackground />
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: scroll ? 0 : insets.bottom }}>
        {showHeader && <AppHeader />}
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ paddingTop: 10, paddingBottom: Math.max(insets.bottom, 24) + 76 }}
            style={{ flex: 1 }}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
          >
            <View style={resolvedContentStyle}>{children}</View>
          </ScrollView>
        ) : (
          <View style={[resolvedContentStyle, { flex: 1 }]}>{children}</View>
        )}
      </View>
    </View>
  );
}
