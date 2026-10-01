import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Image } from 'react-native';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import GradientText from '../components/GradientText';
import { ConnectIIButton } from '../components/ConnectIIButton';
import { RegistrationModal } from '../components/RegistrationModal';
import { colors } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { getBikeraUserActor } from '../utils/actors';
import { Principal } from '@dfinity/principal';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { useToastHelpers } from '../contexts/ToastContext';
import { PressableScale } from '../components/motion';

export function LandingScreen() {
  const {
    isAuthenticated,
    principal,
    username,
    isRegistered,
    checkingProfile,
    enterGuestMode,
    setRegistrationStatus,
    setCheckingProfile,
    getIdentity,
  } = useAuth();
  const { error } = useToastHelpers();
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !principal) {
        if (!isAuthenticated) {
          setRegistrationStatus(false);
          setShowRegisterModal(false);
          setCheckingProfile(false);
        }
        return;
      }

      if (isRegistered === true) {
        return;
      }

      setCheckingProfile(true);
      try {
        const identity = getIdentity();
        if (!identity) {
          setRegistrationStatus(false);
          setCheckingProfile(false);
          return;
        }
        const userActor = getBikeraUserActor({}, identity);
        const profileOpt: any = await userActor.getCurrentUserProfile(Principal.fromText(principal));

        let exists = false;
        let profile: any = null;

        if (Array.isArray(profileOpt)) {
          exists = profileOpt.length > 0;
          profile = exists ? profileOpt[0] : null;
        } else if (profileOpt && typeof profileOpt === 'object') {
          if ('Some' in profileOpt) {
            exists = true;
            profile = profileOpt.Some;
          } else if ('None' in profileOpt) {
            exists = false;
          } else {
            exists = true;
            profile = profileOpt;
          }
        } else {
          exists = !!profileOpt;
          profile = profileOpt;
        }

        if (exists && profile) {
          const profileUsername: string | undefined = profile?.username;
          const emailRaw: any = profile?.email;
          const email: string = Array.isArray(emailRaw) && emailRaw.length > 0 ? emailRaw[0] : (typeof emailRaw === 'string' ? emailRaw : '');
          await setRegistrationStatus(true, profileUsername, email);
        } else {
          setRegistrationStatus(false);
        }
      } catch (e: any) {
        console.error('getCurrentUserProfile failed:', e);
        error('Profile Error', 'Failed to load your profile from the IC network.');
        setRegistrationStatus(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, principal, isRegistered, setRegistrationStatus, setCheckingProfile, getIdentity, error]);

  useEffect(() => {
    if (isAuthenticated && principal && isRegistered === false && !checkingProfile) {
      const timer = setTimeout(() => {
        setShowRegisterModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    if (!isAuthenticated || !principal || isRegistered === true) {
      setShowRegisterModal(false);
    }
  }, [isAuthenticated, principal, isRegistered, checkingProfile]);

  return (
    <Screen scroll={true} contentStyle={styles.screenContent} showHeader={false}>
      <LinearGradient
        colors={[colors.brandPurple, colors.brandViolet, colors.brandBlue100]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIconWrapper}>
              <Image
                source={require('../../assets/favicon.png')}
                style={styles.appIconImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <GradientText style={styles.heroTitle}>Move, Earn, Thrive</GradientText>
          <Text style={styles.heroSubtitle}>
            Sign in with Internet Identity to track rides and earn iMERA.
          </Text>

          {!isAuthenticated ? (
            <View style={styles.buttonContainer}>
              <ConnectIIButton variant="hero" />

              <Text style={styles.loginHint}>
                Use your Internet Identity passkey. If Samsung Pass opens, pick that passkey — not a website password. Tap X if the page stays blank.
              </Text>

              <PressableScale
                onPress={() => { void enterGuestMode(); }}
                style={styles.guestLink}
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel="Continue as guest without signing in"
              >
                <Text style={styles.guestLinkText}>Continue as guest</Text>
              </PressableScale>
            </View>
          ) : checkingProfile ? (
            <View style={styles.loadingContainer}>
              <ThreeDotLoader color="white" size="large" />
              <Text style={styles.loadingText}>Checking profile...</Text>
            </View>
          ) : isRegistered === true ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.successCheckmark}>✓</Text>
              </View>
              <Text style={styles.successText}>Welcome back, {username || 'User'}!</Text>
              <Text style={styles.successSubtext}>You're all set to track rides and view your progress.</Text>
            </View>
          ) : (
            <View style={styles.registerPromptContainer}>
              <Text style={styles.registerPromptText}>
                You're almost there! Complete your registration to start earning.
              </Text>
              <PressableScale
                onPress={() => setShowRegisterModal(true)}
                style={styles.registerButton}
                scaleTo={0.96}
              >
                <Text style={styles.registerButtonText}>
                  {checkingProfile ? 'Checking…' : 'Complete Registration'}
                </Text>
              </PressableScale>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={styles.featuresSection}>
        <SectionHeader
          title="Why Bikera?"
          subtitle="Earn while you ride"
        />
        <View style={styles.featuresGrid}>
          <Card style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <View style={styles.featureCardHeader}>
                <LinearGradient
                  colors={[colors.brandPurple + '20', colors.brandBlue100 + '20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featureIconGradient}
                >
                  <Text style={styles.featureEmoji}>🚴</Text>
                </LinearGradient>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Track Rides</Text>
                  <Text style={styles.featureDescription}>
                    Record your cycling activities and keep ride progress tied to your account.
                  </Text>
                </View>
              </View>
            </View>
          </Card>
          <Card style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <View style={styles.featureCardHeader}>
                <LinearGradient
                  colors={[colors.brandPurple + '20', colors.brandBlue100 + '20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featureIconGradient}
                >
                  <Text style={styles.featureEmoji}>💰</Text>
                </LinearGradient>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Balances & wallet</Text>
                  <Text style={styles.featureDescription}>
                    See your iMERA balance, XP, and reward activity in one place.
                  </Text>
                </View>
              </View>
            </View>
          </Card>
          <Card style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <View style={styles.featureCardHeader}>
                <LinearGradient
                  colors={[colors.brandPurple + '20', colors.brandBlue100 + '20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featureIconGradient}
                >
                  <Text style={styles.featureEmoji}>🏆</Text>
                </LinearGradient>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Friends & leaderboard</Text>
                  <Text style={styles.featureDescription}>
                    Connect with friends, check balances, and climb the leaderboard.
                  </Text>
                </View>
              </View>
            </View>
          </Card>
          <Card style={styles.featureCard}>
            <View style={styles.featureCardContent}>
              <View style={styles.featureCardHeader}>
                <LinearGradient
                  colors={[colors.brandPurple + '20', colors.brandBlue100 + '20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.featureIconGradient}
                >
                  <Text style={styles.featureEmoji}>🔒</Text>
                </LinearGradient>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Secure</Text>
                  <Text style={styles.featureDescription}>
                    Powered by Internet Computer blockchain for true decentralization.
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>
      </View>

      <View style={styles.infoSection}>
        <SectionHeader
          title="About Bikera Ride"
          subtitle="Track, balance, friends, and history"
        />
        <Card style={styles.infoCard}>
          <Text style={styles.infoText}>
            Bikera Ride focuses on ride tracking, balances, wallet, leaderboards, friends, history, and profile.
          </Text>
          <Text style={styles.infoTextSecondary}>
            Sign in with Internet Identity to use your rider account.
          </Text>
        </Card>
      </View>

      <RegistrationModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  heroContainer: {
    borderRadius: 24,
    marginBottom: 32,
    width: '100%',
  },
  heroContent: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  appIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  appIconImage: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 10,
    paddingHorizontal: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 22,
    fontSize: 16,
    marginBottom: 20,
    paddingHorizontal: 8,
    fontWeight: '400',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  guestLink: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestLinkText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  loginHint: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 320,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
    paddingVertical: 8,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successCheckmark: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  successText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  successSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  registerPromptContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 20,
    width: '100%',
    paddingVertical: 8,
  },
  registerPromptText: {
    color: '#fff',
    fontSize: 17,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 24,
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    minWidth: 240,
    alignItems: 'center',
  },
  registerButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ scale: 0.98 }],
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresGrid: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 24,
    width: '100%',
  },
  featureCard: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
    padding: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border1,
    overflow: 'hidden',
    marginBottom: 0,
  },
  featureCardContent: {
    margin: -18,
    padding: 20,
    width: '100%',
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  featureIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brandPurple + '30',
    flexShrink: 0,
  },
  featureEmoji: {
    fontSize: 36,
    textAlign: 'center',
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  featureDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: colors.surfaceCard,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border1,
    marginTop: 20,
  },
  infoText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    fontWeight: '400',
  },
  infoTextSecondary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
});
