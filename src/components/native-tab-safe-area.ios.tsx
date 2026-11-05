import React from 'react';
import type { ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-screens/experimental';

/** Native insets include the system tab bar and update on rotation. */
export function NativeTabSafeArea(props: ViewProps) {
  return <SafeAreaView {...props} edges={{ bottom: true, left: true, right: true }} />;
}
