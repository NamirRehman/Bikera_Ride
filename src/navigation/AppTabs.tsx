import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';

import type { AppTabsParamList, MoreStackParamList } from './types';
import { colors } from '../theme/tokens';

const getDashboardScreen = () => require('../screens/DashboardScreen').DashboardScreen;
const getTrackScreen = () => require('../screens/TrackScreen').TrackScreen;
const getFriendsScreen = () => require('../screens/FriendsScreen').FriendsScreen;
const getHistoryScreen = () => require('../screens/HistoryScreen').HistoryScreen;
const getMoreHomeScreen = () => require('../screens/MoreHomeScreen').MoreHomeScreen;
const getLeaderboardScreen = () => require('../screens/LeaderboardScreen').LeaderboardScreen;
const getWalletScreen = () => require('../screens/WalletScreen').WalletScreen;
const getProfileScreen = () => require('../screens/ProfileScreen').ProfileScreen;

const Tab = createBottomTabNavigator<AppTabsParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreStackNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreHome" getComponent={getMoreHomeScreen} />
      <MoreStack.Screen name="Leaderboard" getComponent={getLeaderboardScreen} />
      <MoreStack.Screen name="Wallet" getComponent={getWalletScreen} />
      <MoreStack.Screen name="Profile" getComponent={getProfileScreen} />
    </MoreStack.Navigator>
  );
}

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const baseHeight = 64;
  const tabBarHeight = baseHeight + insets.bottom;

  const iconFor = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'Dashboard':
        return focused ? 'home' : 'home-outline';
      case 'Track':
        return focused ? 'navigate' : 'navigate-outline';
      case 'Friends':
        return focused ? 'people' : 'people-outline';
      case 'History':
        return focused ? 'time' : 'time-outline';
      case 'More':
        return focused ? 'grid' : 'grid-outline';
      default:
        return focused ? 'ellipse' : 'ellipse-outline';
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        freezeOnBlur: true,
        lazy: true,
        tabBarActiveTintColor: colors.brandPurple,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarAccessibilityLabel:
          route.name === 'Dashboard' ? 'Home' :
          route.name === 'Track' ? 'Track ride' :
          route.name === 'Friends' ? 'Friends' :
          route.name === 'History' ? 'Ride history' :
          route.name === 'More' ? 'More' : route.name,
        tabBarStyle: {
          backgroundColor: colors.surface2,
          borderTopWidth: 1,
          borderTopColor: colors.border2,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: -2 },
              }
            : {
                elevation: 8,
              }
          ),
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarLabel:
          route.name === 'Dashboard' ? 'Home' :
          route.name === 'Track' ? 'Track' :
          route.name === 'Friends' ? 'Friends' :
          route.name === 'History' ? 'History' :
          route.name === 'More' ? 'More' : route.name,
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
            <Ionicons
              name={iconFor(route.name, focused) as any}
              size={22}
              color={focused ? colors.brandPurple : color}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" getComponent={getDashboardScreen} />
      <Tab.Screen name="Track" getComponent={getTrackScreen} />
      <Tab.Screen name="Friends" getComponent={getFriendsScreen} />
      <Tab.Screen name="History" getComponent={getHistoryScreen} />
      <Tab.Screen
        name="More"
        component={MoreStackNavigator}
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
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapFocused: {
    backgroundColor: 'rgba(66, 192, 251, 0.16)',
  },
});
