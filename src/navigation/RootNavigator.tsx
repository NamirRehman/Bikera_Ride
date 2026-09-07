import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { RootStackParamList } from './types';
import { useAuth } from '../contexts/AuthContext';
import { AppTabs } from './AppTabs';

const getLandingScreen = () => require('../screens/LandingScreen').LandingScreen;
const getComingSoonScreen = () => require('../screens/ComingSoonScreen').ComingSoonScreen;
const getPublicProfileScreen = () => require('../screens/PublicProfileScreen').PublicProfileScreen;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { isAuthenticated, isRegistered, checkingProfile } = useAuth();
  void checkingProfile;

  const canAccessApp = isAuthenticated && isRegistered === true;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!canAccessApp ? (
        <>
          <Stack.Screen name="Landing" getComponent={getLandingScreen} />
          <Stack.Screen name="ComingSoon" getComponent={getComingSoonScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} />
          <Stack.Screen name="PublicProfile" getComponent={getPublicProfileScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
