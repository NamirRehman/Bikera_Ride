import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Pressable, Image } from 'react-native';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
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

export function LandingScreen() {
  const {
    isAuthenticated,
    principal,
    username,
    isRegistered,
    checkingAuth,
    checkingProfile,
    setRegistrationStatus,
    setCheckingProfile,
    getIdentity,
  } = useAuth();
  const { error } = useToastHelpers();
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Fetch user profile when connected
  useEffect(() => {
    const fetchProfile = async () => {
      // Don't check profile if not authenticated or no principal
      if (!isAuthenticated || !principal) {
        // Reset registration status and close modal if not authenticated
        if (!isAuthenticated) {
          setRegistrationStatus(false);
          setShowRegisterModal(false);
          setCheckingProfile(false);
        }
        return;
      }

      // Skip profile check if user is already registered (to prevent unnecessary checks after registration)
      if (isRegistered === true) {
        console.log('User is already registered, skipping profile check');
        return;
      }

      setCheckingProfile(true);
      try {
        console.log('Checking user profile for principal:', principal);
        // Use authenticated identity for the actor (following DesertID_Frontend pattern)
        const identity = getIdentity();
        if (!identity) {
          console.error('Failed to get authenticated identity');
          setRegistrationStatus(false);
          setCheckingProfile(false);
          return;
        }
        const userActor = getBikeraUserActor({}, identity);
        const profileOpt: any = await userActor.getCurrentUserProfile(Principal.fromText(principal));

        console.log('Profile response:', profileOpt);

        // Handle different response formats
        let exists = false;
        let profile: any = null;

        if (Array.isArray(profileOpt)) {
          exists = profileOpt.length > 0;
          profile = exists ? profileOpt[0] : null;
        } else if (profileOpt && typeof profileOpt === 'object') {
          // Check if it's an Option type with Some/None
          if ('Some' in profileOpt) {
            exists = true;
            profile = profileOpt.Some;
          } else if ('None' in profileOpt) {
            exists = false;
          } else {
            // Direct profile object
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

          console.log('User is registered:', profileUsername);
          await setRegistrationStatus(true, profileUsername, email);
        } else {
          console.log('User is not registered');
          setRegistrationStatus(false);
        }
      } catch (e: any) {
        console.error('getCurrentUserProfile failed:', e);
        error('Profile Error', 'Failed to load your profile from the IC network.');
        // Check if it's a certificate verification error
        const errorMessage = e?.message || String(e) || '';
        const errorBody = e?.body || '';
        const fullError = errorMessage + errorBody;

        if (fullError.includes('403') || fullError.includes('Forbidden') || fullError.includes('certificate') || fullError.includes('signature')) {
          console.error('═══════════════════════════════════════════════════════════');
          console.error('⚠️  CERTIFICATE VERIFICATION ERROR');
          console.error('═══════════════════════════════════════════════════════════');
          console.error('Production Internet Identity cannot be used with local canisters.');
          console.error('');
          console.error('SOLUTIONS:');
          console.error('1. Deploy local Internet Identity:');
          console.error('   git clone https://github.com/dfinity/internet-identity.git');
          console.error('   cd internet-identity');
          console.error('   dfx deploy');
          console.error('   Then use the local II canister URL in login()');
          console.error('');
          console.error('2. Use production canisters instead of local ones');
          console.error('   (Set __DEV__ = false or use production build)');
          console.error('═══════════════════════════════════════════════════════════');
        }
        // On error, assume user is not registered
        setRegistrationStatus(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, principal, isRegistered, setRegistrationStatus, setCheckingProfile, getIdentity]);

  // Show registration modal if connected but not registered
  useEffect(() => {
    // Only show modal if authenticated, has principal, not registered, and not checking
    if (isAuthenticated && principal && isRegistered === false && !checkingProfile) {
      // Auto-show registration modal after a brief delay
      const timer = setTimeout(() => {
        setShowRegisterModal(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Close modal if conditions are not met (not authenticated, no principal, or already registered)
      if (!isAuthenticated || !principal || isRegistered === true) {
        setShowRegisterModal(false);
      }
    }
  }, [isAuthenticated, principal, isRegistered, checkingProfile]);

  return (
    <Screen scroll={true} contentClassName={styles.screenContent} showHeader={false}>
      {/* Hero Section */}
      <LinearGradient
        colors={[colors.brandPurple, colors.brandViolet, colors.brandBlue100]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          {/* App Icon */}
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
            Track rides, mine through activity, and carry the same Internet Identity into Bikera on mobile and web.
          </Text>

          {checkingAuth ? (
            <View style={styles.loadingContainer}>
              <ThreeDotLoader color="white" size="large" />
              <Text style={styles.loadingText}>Checking authentication...</Text>
            </View>
          ) : !isAuthenticated ? (
            <View style={styles.buttonContainer}>
              <ConnectIIButton />
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
              <Pressable
                onPress={() => setShowRegisterModal(true)}
                style={({ pressed }) => [
                  styles.registerButton,
                  pressed && styles.registerButtonPressed,
                ]}
              >
                <Text style={styles.registerButtonText}>
                  {checkingProfile ? 'Checking…' : 'Complete Registration'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Features Section */}
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

      {/* About Section */}
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

      {/* Registration Modal */}
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
    overflow: 'hidden',
    width: '100%',
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    paddingVertical: 56,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
  },
  appIconContainer: {
    marginBottom: 28,
    alignItems: 'center',
  },
  appIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  appIconImage: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 20,
    paddingHorizontal: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    maxWidth: 340,
    lineHeight: 26,
    fontSize: 17,
    marginBottom: 40,
    paddingHorizontal: 12,
    fontWeight: '400',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    marginBottom: 0,
  },
  featureCardContent: {
    margin: -18, // Offset Card's inner padding (18px)
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
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
