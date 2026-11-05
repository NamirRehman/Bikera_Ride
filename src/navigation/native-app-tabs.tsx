import type { ComponentType } from 'react';
import type { AppTabsParamList } from './types';

export type NativeAppTabsProps = {
  initialRouteName: keyof AppTabsParamList;
  MoreStack: ComponentType;
};

// Metro selects the .ios implementation on iPhones. Other platforms keep JS tabs.
export const NATIVE_TABS_SUPPORTED = false;

export function NativeAppTabs(_props: NativeAppTabsProps) {
  return null;
}
