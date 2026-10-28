import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';

import type { AppTabsParamList, MoreStackParamList } from './types';
import { AnimatedTabBar } from '../components/AnimatedTabBar';
import { rideAutoStart } from '../services/rideAutoStart';

const getDashboardScreen = () => require('../screens/DashboardScreen').DashboardScreen;
const getTrackScreen = () => require('../screens/TrackScreen').TrackScreen;
const getFriendsScreen = () => require('../screens/FriendsScreen').FriendsScreen;
const getLeaderboardScreen = () => require('../screens/LeaderboardScreen').LeaderboardScreen;
const getHistoryScreen = () => require('../screens/HistoryScreen').HistoryScreen;
const getMoreHomeScreen = () => require('../screens/MoreHomeScreen').MoreHomeScreen;
const getWalletScreen = () => require('../screens/WalletScreen').WalletScreen;
const getProfileScreen = () => require('../screens/ProfileScreen').ProfileScreen;
const getRideFilesScreen = () => require('../screens/RideFilesScreen').RideFilesScreen;
const getScanBikeScreen = () => require('../screens/ScanBikeScreen').ScanBikeScreen;

const Tab = createBottomTabNavigator<AppTabsParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

const stackAnimation = Platform.select({
  ios: 'default' as const,
  android: 'slide_from_right' as const,
  default: 'fade_from_bottom' as const,
});

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: stackAnimation,
        animationDuration: 280,
        gestureEnabled: true,
        contentStyle: { backgroundColor: '#000000' },
      }}
    >
      <MoreStack.Screen name="MoreHome" getComponent={getMoreHomeScreen} />
      <MoreStack.Screen name="History" getComponent={getHistoryScreen} />
      <MoreStack.Screen name="Wallet" getComponent={getWalletScreen} />
      <MoreStack.Screen name="Profile" getComponent={getProfileScreen} />
      <MoreStack.Screen name="RideFiles" getComponent={getRideFilesScreen} />
      <MoreStack.Screen name="ScanBike" getComponent={getScanBikeScreen} />
    </MoreStack.Navigator>
  );
}

export function AppTabs() {
  const [bootReady, setBootReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof AppTabsParamList>('Dashboard');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const openTrack = await rideAutoStart.armSessionLaunch();
      if (cancelled) return;
      setInitialRoute(openTrack ? 'Track' : 'Dashboard');
      setBootReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!bootReady) {
    return <View style={styles.boot} />;
  }

  return (
    <Tab.Navigator
      key={initialRoute}
      initialRouteName={initialRoute}
      tabBar={(props) => <AnimatedTabBar {...props} />}
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        lazy: true,
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 220,
          },
        },
        sceneStyle: { backgroundColor: '#000000' },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        getComponent={getDashboardScreen}
        options={{ tabBarAccessibilityLabel: 'Home' }}
      />
      <Tab.Screen
        name="Track"
        getComponent={getTrackScreen}
        options={{ freezeOnBlur: false, tabBarAccessibilityLabel: 'Ride' }}
      />
      <Tab.Screen
        name="Friends"
        getComponent={getFriendsScreen}
        options={{ tabBarAccessibilityLabel: 'Friends' }}
      />
      <Tab.Screen
        name="Leaderboard"
        getComponent={getLeaderboardScreen}
        options={{ tabBarAccessibilityLabel: 'Leaderboard' }}
      />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
        options={{ tabBarAccessibilityLabel: 'More' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.dispatch(
              CommonActions.navigate({
                name: 'More',
                params: { screen: 'MoreHome' },
              })
            );
          },
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
