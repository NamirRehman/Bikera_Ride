import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Platform } from 'react-native';
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
  const baseHeight = Platform.OS === 'ios' ? 60 : 60;
  const tabBarHeight = baseHeight + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 10),
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: -2 },
              }
            : {
                elevation: 6,
              }
          ),
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ color, focused }) => {
          const icon = (() => {
            switch (route.name) {
              case 'Dashboard':
                return 'home-outline';
              case 'Track':
                return 'navigate-outline';
              case 'Friends':
                return 'people-outline';
              case 'History':
                return 'time-outline';
              case 'More':
                return 'grid-outline';
              default:
                return 'ellipse-outline';
            }
          })();
          if (focused) {
            return (
              <LinearGradient
                colors={[
                  colors.brandPurple,
                  colors.brandViolet,
                  colors.brandBlue300,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrap}
              >
                <Ionicons name={icon as any} size={24} color="#fff" />
              </LinearGradient>
            );
          }
          return <Ionicons name={icon as any} size={22} color={color} />;
        },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? -4 : 0,
  },
});
