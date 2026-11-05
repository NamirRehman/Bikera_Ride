import React from 'react';
import { UIManager } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';

import { isNativeLiquidGlassSupported } from '../components/glass-surface';
import { colors } from '../theme/tokens';
import { NativeTabLayoutContext } from './native-tab-layout';
import type { NativeAppTabsProps } from './native-app-tabs';
import type { AppTabsParamList } from './types';

// Check native registration too: an older installed binary may bundle an older
// react-native-screens even when the JavaScript dependency has been updated.
export const NATIVE_TABS_SUPPORTED = isNativeLiquidGlassSupported() &&
  ['RNSBottomTabs', 'RNSBottomTabsScreen', 'RNSSafeAreaView'].every((name) =>
    UIManager.hasViewManagerConfig(name)
  );

const Tab = createNativeBottomTabNavigator<AppTabsParamList>();
const getDashboardScreen = () => require('../screens/DashboardScreen').DashboardScreen;
const getTrackScreen = () => require('../screens/TrackScreen').TrackScreen;
const getFriendsScreen = () => require('../screens/FriendsScreen').FriendsScreen;
const getLeaderboardScreen = () => require('../screens/LeaderboardScreen').LeaderboardScreen;

export function NativeAppTabs({ initialRouteName, MoreStack }: NativeAppTabsProps) {
  return (
    <NativeTabLayoutContext.Provider value={true}>
      <Tab.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          lazy: true,
          tabBarActiveTintColor: colors.brandPurple,
          tabBarControllerMode: 'tabBar',
          tabBarMinimizeBehavior: 'never',
          // Leave the material, pill, fonts and hit targets to UITabBarController.
          // A custom background/blur would override the system's glass appearance.
          tabBarBlurEffect: 'systemDefault',
        }}
      >
        <Tab.Screen
          name="Dashboard"
          getComponent={getDashboardScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => ({ type: 'sfSymbol', name: focused ? 'house.fill' : 'house' }),
          }}
        />
        <Tab.Screen
          name="Track"
          getComponent={getTrackScreen}
          options={{ title: 'Ride', tabBarIcon: { type: 'sfSymbol', name: 'bicycle' } }}
        />
        <Tab.Screen
          name="Friends"
          getComponent={getFriendsScreen}
          options={{
            title: 'Friends',
            tabBarIcon: ({ focused }) => ({ type: 'sfSymbol', name: focused ? 'person.2.fill' : 'person.2' }),
          }}
        />
        <Tab.Screen
          name="Leaderboard"
          getComponent={getLeaderboardScreen}
          options={{
            title: 'Ranks',
            tabBarIcon: ({ focused }) => ({ type: 'sfSymbol', name: focused ? 'trophy.fill' : 'trophy' }),
          }}
        />
        <Tab.Screen
          name="More"
          component={MoreStack}
          options={{
            title: 'More',
            tabBarIcon: ({ focused }) => ({ type: 'sfSymbol', name: focused ? 'square.grid.2x2.fill' : 'square.grid.2x2' }),
          }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              navigation.dispatch(CommonActions.navigate({ name: 'More', params: { screen: 'MoreHome' } }));
            },
          })}
        />
      </Tab.Navigator>
    </NativeTabLayoutContext.Provider>
  );
}
