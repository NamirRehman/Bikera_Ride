import React from 'react';
import { Text, View, StyleSheet, Image, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { colors, radii, shadows, gradients } from '../theme/tokens';
import { ThreeDotLoader } from './ThreeDotLoader';
import { PressableScale } from './motion';

let icpLogo: number | null = null;
try {
  icpLogo = require('../../assets/icp-logo.png');
} catch {
  icpLogo = null;
}

export function ConnectIIButton({ variant = 'menu' }: { variant?: 'menu' | 'hero' }) {
  const { login, isAuthenticated, isLoggingIn } = useAuth();
  const [pending, setPending] = React.useState(false);

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async () => {
    setPending(true);
    try {
      await login();
    } catch (error) {
      console.error('[ConnectIIButton] Login error:', error);
    } finally {
      setPending(false);
    }
  };

  const isLoading = isLoggingIn || pending;
  const label = isLoading ? 'Opening Internet Identity…' : 'Sign in with Internet Identity';

  const logo = icpLogo ? (
    <Image source={icpLogo} style={styles.logo} accessibilityLabel="ICP logo" />
  ) : (
    <Text style={styles.logoFallback}>∞</Text>
  );

  if (variant === 'hero') {
    return (
      <PressableScale
        onPress={handleLogin}
        disabled={isLoading}
        style={[styles.heroWrap, isLoading && styles.disabled]}
        scaleTo={0.96}
        accessibilityRole="button"
        accessibilityLabel="Sign in with Internet Identity"
        accessibilityHint="Opens Internet Identity. Use your passkey or security device, then return to Bikera."
      >
        <LinearGradient
          colors={[...gradients.button] as [ColorValue, ColorValue, ...ColorValue[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroButton}
        >
          {isLoading ? (
            <ThreeDotLoader color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.heroLogo}>{logo}</View>
          )}
          <Text style={styles.heroText}>{label}</Text>
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={handleLogin}
      disabled={isLoading}
      style={[styles.menuWrap, isLoading && styles.disabled]}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Internet Identity"
    >
      <LinearGradient
        colors={[...gradients.button] as [ColorValue, ColorValue, ...ColorValue[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.menuButton}
      >
        {isLoading ? (
          <View style={styles.menuRow}>
            <ThreeDotLoader color="white" size="small" />
            <Text style={styles.menuText}>Connecting...</Text>
          </View>
        ) : (
          <View style={styles.menuRow}>
            <View style={styles.menuLogo}>{logo}</View>
            <Text style={styles.menuText}>{label}</Text>
          </View>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    width: '100%',
    maxWidth: 320,
  },
  heroButton: {
    minHeight: 56,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  heroText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  menuWrap: {
    width: '100%',
  },
  menuButton: {
    borderRadius: radii.xl,
    paddingVertical: 16,
    paddingHorizontal: 24,
    ...shadows.soft,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  menuLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  logo: {
    width: 28,
    height: 28,
  },
  logoFallback: {
    color: colors.brandPurple,
    fontSize: 18,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
});
