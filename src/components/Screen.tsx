import React from 'react';
import { ScrollView, View, StyleSheet as RNStyleSheet, RefreshControlProps } from 'react-native';
import { colors } from '../theme/tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BikeraBackground } from './BikeraBackground';
import { AppHeader } from './AppHeader';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  // accepts either a style object or legacy className string (ignored)
  contentClassName?: string | object;
  showHeader?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
};

export function Screen({ children, scroll = true, contentClassName, showHeader = true, refreshControl }: ScreenProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface1 }}>
      <BikeraBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {showHeader && <AppHeader />}
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}
            style={{ flex: 1 }}
            refreshControl={refreshControl}
          >
            <View style={contentClassName ? (RNStyleSheet.flatten(contentClassName as any) as any) : { paddingHorizontal: 16, paddingTop: 8 }}>{children}</View>
          </ScrollView>
        ) : (
          <View style={contentClassName ? (RNStyleSheet.flatten(contentClassName as any) as any) : { paddingHorizontal: 16, paddingTop: 8, flex: 1 }}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

