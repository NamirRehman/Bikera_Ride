import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, View, StyleSheet } from 'react-native';

import type { RootStackParamList } from './types';
import { useAuth } from '../contexts/AuthContext';
import { AppTabs } from './AppTabs';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { colors } from '../theme/tokens';

const getLandingScreen = () => require('../screens/LandingScreen').LandingScreen;
const getComingSoonScreen = () => require('../screens/ComingSoonScreen').ComingSoonScreen;
const getPublicProfileScreen = () => require('../screens/PublicProfileScreen').PublicProfileScreen;

const Stack = createNativeStackNavigator<RootStackParamList>();

const stackAnimation = Platform.select({
  ios: 'default' as const,
  android: 'slide_from_right' as const,
  default: 'fade_from_bottom' as const,
});

export function RootNavigator() {
  const { isAuthenticated, isRegistered, isGuest, checkingAuth } = useAuth();
  const canAccessApp = (isAuthenticated && isRegistered === true) || isGuest;

  // Hold a dark boot screen while session restores — avoids Landing → Home flash
  if (checkingAuth) {
    return (
      <View style={styles.boot}>
        <ThreeDotLoader color={colors.brandPurple} size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: stackAnimation,
        animationDuration: 280,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: '#000000' },
      }}
    >
      {!canAccessApp ? (
        <>
          <Stack.Screen
            name="Landing"
            getComponent={getLandingScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="ComingSoon"
            getComponent={getComingSoonScreen}
            options={{ animation: 'fade_from_bottom' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="AppTabs"
            component={AppTabs}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="PublicProfile"
            getComponent={getPublicProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
