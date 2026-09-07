import React from 'react';
import { Pressable, Text, View, StyleSheet, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { colors, radii, shadows, gradients } from '../theme/tokens';
import { ThreeDotLoader } from './ThreeDotLoader';

export function ConnectIIButton() {
  const { login, isAuthenticated, checkingAuth } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  if (isAuthenticated) {
    return null; // Don't show button if already authenticated
  }

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      console.error('[ConnectIIButton] Login error:', error);
    } finally {
      // Don't set to false immediately - let checkingAuth handle it
      // This ensures the button stays in loading state during the entire process
    }
  };

  const isLoading = checkingAuth || isLoggingIn;

  return (
    <Pressable
      onPress={handleLogin}
      disabled={isLoading}
      style={[styles.container, isLoading && styles.containerDisabled]}
    >
      <LinearGradient
        colors={[...gradients.button] as [ColorValue, ColorValue, ...ColorValue[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThreeDotLoader color="white" size="small" />
            <Text style={styles.text}>Connecting...</Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <Text style={styles.text}>Connect Internet Identity</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 320,
  },
  containerDisabled: {
    opacity: 0.7,
  },
  gradient: {
    borderRadius: radii.xl,
    paddingVertical: 16,
    paddingHorizontal: 24,
    ...shadows.soft,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

