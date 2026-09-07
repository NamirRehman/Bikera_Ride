import React, { useState, useEffect, useCallback } from 'react';
import { Pressable, Text, View, StyleSheet, ScrollView, TextInput, Alert, Modal, Switch, Clipboard, KeyboardAvoidingView, Platform, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Principal } from '@dfinity/principal';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { colors } from '../theme/tokens';
import { getBikeraUserActor, getBikeraXpActor, getBikeraImeraActor, getShadowClient, getHost } from '../utils/actors';
import { HttpAgent } from '@dfinity/agent';
import { useCachedData } from '../hooks/useCachedData';
import { invalidateProfileCache } from '../utils/cacheHelpers';
import { useToastHelpers } from '../contexts/ToastContext';
import { WalletScreen } from './WalletScreen';
import { WEB_APP_URL } from '../config';

function SettingRow({ icon, label, value, onPress, isDestructive = false, rightComponent }: any) {
  return (
    <Pressable onPress={onPress} style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon} size={20} color={isDestructive ? colors.error : colors.textSecondary} />
        </View>
        <Text style={[styles.settingLabel, isDestructive && { color: colors.error }]}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {rightComponent || <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
      </View>
    </Pressable>
  );
}

export function ProfileScreen() {
  const { principal, username: authUsername, logout, getIdentity } = useAuth();
  const { mode, setMode } = useTheme();
  const { success, error, info } = useToastHelpers();

  // UI State
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet'>('profile');
  const [loading, setLoading] = useState(true);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Profile Data
  const [profile, setProfile] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [xpData, setXpData] = useState<any>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalDistance, setTotalDistance] = useState(0);
  const [totalIMERA, setTotalIMERA] = useState(0);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formAvatar, setFormAvatar] = useState('');
  const [formStrava, setFormStrava] = useState('');
  const [formTwitter, setFormTwitter] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formWebsite, setFormWebsite] = useState('');

  // Preferences State
  const [prefTheme, setPrefTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [prefUnits, setPrefUnits] = useState<'metric' | 'imperial'>('metric');
  const [prefEmailNotif, setPrefEmailNotif] = useState(true);
  const [prefPushNotif, setPrefPushNotif] = useState(true);
  const [prefAchievementsNotif, setPrefAchievementsNotif] = useState(true);
  const [prefRewardsNotif, setPrefRewardsNotif] = useState(true);
  const [prefSocialNotif, setPrefSocialNotif] = useState(true);
  const [prefMarketingNotif, setPrefMarketingNotif] = useState(false);
  const [prefAutoStart, setPrefAutoStart] = useState(false);
  const [prefVoiceGuidance, setPrefVoiceGuidance] = useState(false);
  const [prefDataSharing, setPrefDataSharing] = useState(true);

  // Privacy State
  const [privacyVisibility, setPrivacyVisibility] = useState<'public' | 'friends' | 'private'>('friends');
  const [privacyShowDistance, setPrivacyShowDistance] = useState(true);
  const [privacyShowSpeed, setPrivacyShowSpeed] = useState(true);
  const [privacyShowLocation, setPrivacyShowLocation] = useState(false);
  const [privacyAllowFriendReq, setPrivacyAllowFriendReq] = useState(true);
  const [privacyShowAchievements, setPrivacyShowAchievements] = useState(true);

  // Action States
  const [isUpdating, setIsUpdating] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch profile data with caching
  const fetchProfileData = useCallback(async () => {
    if (!principal) {
      return null;
    }

    const identity = getIdentity();
    if (!identity) {
      return null;
    }

    const identityPrincipal = identity.getPrincipal().toText();
    const principalToUse = identityPrincipal !== principal ? identityPrincipal : principal;
    const userId = Principal.fromText(principalToUse);

    const host = getHost();
    const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
    const agent = new HttpAgent({
      host,
      identity,
      fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init),
    });

    if (isDevelopment) {
      await agent.fetchRootKey();
    }

    const shadow = getShadowClient(agent);
    const userActor = getBikeraUserActor({}, identity);
    const imeraActor = getBikeraImeraActor({}, identity);

    const [profileOpt, stats, xpSnapshot, imeraBalance] = await Promise.all([
      userActor.getCurrentUserProfile(userId).catch(() => []),
      shadow.getUserDashboardSnapshot(userId, true).then(snapshot => snapshot?.stats || null).catch(() => null),
      shadow.getXPSnapshot(userId, true).catch(() => null),
      imeraActor.icrc1_balance_of({ owner: userId, subaccount: [] }).catch(() => 0n),
    ]);

    return {
      profile: Array.isArray(profileOpt) && profileOpt.length > 0 ? profileOpt[0] : null,
      stats,
      xpSnapshot,
      imeraBalance,
    };
  }, [principal, getIdentity]);

  const { data: profileData, loading: profileLoading, refetch } = useCachedData({
    type: 'profile',
    identifier: principal || undefined,
    fetcher: fetchProfileData,
    enabled: !!principal,
  });

  // Update state when cached data is available
  useEffect(() => {
    if (profileData) {
      const profile = profileData.profile;
      if (profile) {
        setProfile(profile);
        setFormUsername(profile.username || '');
        const emailRaw = profile.email;
        const emailVal = Array.isArray(emailRaw) && emailRaw.length > 0 ? emailRaw[0] : (typeof emailRaw === 'string' ? emailRaw : '');
        setFormEmail(emailVal || '');
        const displayNameRaw = profile.displayName;
        const displayNameVal = Array.isArray(displayNameRaw) && displayNameRaw.length > 0 ? displayNameRaw[0] : (typeof displayNameRaw === 'string' ? displayNameRaw : '');
        setFormDisplayName(displayNameVal || '');
        const bioRaw = profile.bio;
        const bioVal = Array.isArray(bioRaw) && bioRaw.length > 0 ? bioRaw[0] : (typeof bioRaw === 'string' ? bioRaw : '');
        setFormBio(bioVal || '');
        const avatarRaw = profile.avatar;
        const avatarVal = Array.isArray(avatarRaw) && avatarRaw.length > 0 ? avatarRaw[0] : (typeof avatarRaw === 'string' ? avatarRaw : '');
        setFormAvatar(avatarVal || '');
        const links = profile.socialLinks || {};
        const getOpt = (v: any) => (Array.isArray(v) && v.length > 0 ? v[0] : (typeof v === 'string' ? v : ''));
        setFormStrava(getOpt(links.strava));
        setFormTwitter(getOpt(links.twitter));
        setFormInstagram(getOpt(links.instagram));
        setFormWebsite(getOpt(links.website));

        try {
          const prefs = profile.preferences || {};
          setPrefTheme((prefs.theme || 'auto') as any);
          setPrefUnits((prefs.units || 'metric') as any);
          const notif = prefs.notifications || {};
          setPrefEmailNotif(Boolean(notif.email));
          setPrefPushNotif(Boolean(notif.push));
          setPrefAchievementsNotif(Boolean(notif.achievements));
          setPrefRewardsNotif(Boolean(notif.rewards));
          setPrefSocialNotif(Boolean(notif.social));
          setPrefMarketingNotif(Boolean(notif.marketing));
          setPrefAutoStart(Boolean(prefs.autoStart));
          setPrefVoiceGuidance(Boolean(prefs.voiceGuidance));
          setPrefDataSharing(Boolean(prefs.dataSharing));
        } catch (e) {
          console.warn('[PROFILE] Error loading preferences:', e);
        }

        try {
          const prv = profile.privacySettings || {};
          setPrivacyVisibility((prv.profileVisibility || 'friends') as any);
          setPrivacyShowDistance(Boolean(prv.showDistance));
          setPrivacyShowSpeed(Boolean(prv.showSpeed));
          setPrivacyShowLocation(Boolean(prv.showLocation));
          setPrivacyAllowFriendReq(Boolean(prv.allowFriendRequests));
          setPrivacyShowAchievements(Boolean(prv.showAchievements));
        } catch (e) {
          console.warn('[PROFILE] Error loading privacy settings:', e);
        }

        setTotalDistance(Number(profile.totalDistance || 0));
        setTotalXP(Number(profile.totalXP || 0));
        setTotalIMERA(Number(profile.totalIMERA || 0));
      }

      if (profileData.stats) {
        setUserStats(profileData.stats);
      }

      if (profileData.xpSnapshot) {
        setXpData(profileData.xpSnapshot);
        setLevel(Number(profileData.xpSnapshot.level || 1));
        setTotalXP(Number(profileData.xpSnapshot.totalXP || 0));
      }

      if (profileData.imeraBalance) {
        const imeraNum = Number(profileData.imeraBalance) / 100_000_000;
        setTotalIMERA(imeraNum);
      }

      setLoading(false);
    } else if (!profileLoading && principal) {
      setLoading(false);
    }
  }, [profileData, profileLoading, principal]);

  useEffect(() => {
    setLoading(profileLoading);
  }, [profileLoading]);

  const handleUpdateProfile = async () => {
    if (!principal) {
      error('Authentication Error', 'Please authenticate first');
      return;
    }

    try {
      setIsUpdating(true);
      const identity = getIdentity();
      if (!identity) {
        error('Authentication Error', 'Please authenticate first');
        return;
      }

      const userActor = getBikeraUserActor({}, identity);
      const res: any = await userActor.updateProfile(
        formUsername ? [formUsername] : [],
        formEmail ? [formEmail] : [],
        formDisplayName ? [formDisplayName] : [],
        formBio ? [formBio] : [],
        formAvatar ? [formAvatar] : [],
        [
          {
            strava: formStrava ? [formStrava] : [],
            twitter: formTwitter ? [formTwitter] : [],
            instagram: formInstagram ? [formInstagram] : [],
            website: formWebsite ? [formWebsite] : [],
          },
        ],
        Principal.fromText(principal)
      );

      if (res && typeof res === 'object' && 'ok' in res) {
        // Invalidate cache after successful update
        await invalidateProfileCache(principal);
        await refetch();

        success('Success', 'Profile updated successfully');
        setShowUpdateForm(false);
      } else if (res && typeof res === 'object' && 'err' in res) {
        error('Update Failed', String(res.err));
      } else {
        error('Error', 'Unexpected response from the network');
      }
    } catch (e: any) {
      console.error('[PROFILE] Update failed:', e);
      error('Error', String(e?.message || e));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!principal) {
      error('Authentication Error', 'Please authenticate first');
      return;
    }

    try {
      setSavingPrefs(true);
      const identity = getIdentity();
      if (!identity) {
        error('Authentication Error', 'Please authenticate first');
        return;
      }

      const userActor = getBikeraUserActor({}, identity);
      const res: any = await userActor.updatePreferences(
        {
          theme: prefTheme,
          language: 'en',
          units: prefUnits,
          notifications: {
            email: prefEmailNotif,
            push: prefPushNotif,
            achievements: prefAchievementsNotif,
            rewards: prefRewardsNotif,
            social: prefSocialNotif,
            marketing: prefMarketingNotif,
          },
          autoStart: prefAutoStart,
          voiceGuidance: prefVoiceGuidance,
          dataSharing: prefDataSharing,
        },
        Principal.fromText(principal)
      );

      if (res && typeof res === 'object' && 'ok' in res) {
        success('Success', 'Preferences saved');
      } else if (res && typeof res === 'object' && 'err' in res) {
        error('Error', String(res.err));
      }
    } catch (e: any) {
      console.error('[PROFILE] Save preferences failed:', e);
      error('Error', String(e?.message || e));
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!principal) {
      error('Authentication Error', 'Please authenticate first');
      return;
    }

    try {
      setSavingPrivacy(true);
      const identity = getIdentity();
      if (!identity) {
        error('Authentication Error', 'Please authenticate first');
        return;
      }

      const userActor = getBikeraUserActor({}, identity);
      const res: any = await userActor.updatePrivacySettings(
        {
          profileVisibility: privacyVisibility,
          showDistance: privacyShowDistance,
          showSpeed: privacyShowSpeed,
          showLocation: privacyShowLocation,
          allowFriendRequests: privacyAllowFriendReq,
          showAchievements: privacyShowAchievements,
        },
        Principal.fromText(principal)
      );

      if (res && typeof res === 'object' && 'ok' in res) {
        success('Success', 'Privacy settings saved');
      } else if (res && typeof res === 'object' && 'err' in res) {
        error('Error', String(res.err));
      }
    } catch (e: any) {
      console.error('[PROFILE] Save privacy failed:', e);
      error('Error', String(e?.message || e));
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleDeleteAccount = async () => {
    console.log('[PROFILE] handleDeleteAccount called, confirmation:', deleteConfirmation);

    if (deleteConfirmation !== 'DELETE') {
      console.log('[PROFILE] Confirmation text does not match DELETE');
      error('Configuration Required', 'Please type DELETE to confirm');
      return;
    }

    // Proceed directly with deletion - the "DELETE" confirmation is sufficient
    // Nested Alert.alert doesn't work well on mobile when already in a modal
    console.log('[PROFILE] Confirmation verified, proceeding with deletion');

    try {
      setIsDeleting(true);
      const identity = getIdentity();
      if (!identity || !principal) {
        console.error('[PROFILE] No identity or principal found');
        error('Authentication Error', 'Please authenticate first');
        setIsDeleting(false);
        return;
      }

      console.log('[PROFILE] Calling eraseUserDataGDPR with principal:', principal);
      const userActor = getBikeraUserActor({}, identity);

      // Add timeout to prevent hanging
      const deletePromise = userActor.eraseUserDataGDPR(Principal.fromText(principal));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Delete operation timed out')), 30000)
      );

      const res: any = await Promise.race([deletePromise, timeoutPromise]);

      console.log('[PROFILE] eraseUserDataGDPR response:', res);

      if (res && typeof res === 'object' && 'err' in res) {
        console.error('[PROFILE] Delete failed with error:', res.err);
        const errorMsg = String(res.err);
        setIsDeleting(false);
        setShowDeleteModal(false);
        setDeleteConfirmation('');
        // Use setTimeout to ensure modal is closed before showing alert
        setTimeout(() => {
          error('Error', errorMsg);
        }, 300);
      } else {
        console.log('[PROFILE] Account deleted successfully');
        setIsDeleting(false);
        setShowDeleteModal(false);
        setDeleteConfirmation('');

        // Logout to clear auth state - this will automatically trigger RootNavigator
        // to switch to LandingScreen since isAuthenticated will become false
        console.log('[PROFILE] Logging out after account deletion');
        try {
          await logout();
          console.log('[PROFILE] Logout completed, RootNavigator should switch to LandingScreen');

          // Show success message after a delay to ensure modal is closed
          setTimeout(() => {
            Alert.alert(
              'Account Deleted',
              'Your account has been successfully deleted. You will be redirected to the landing screen.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('[PROFILE] User acknowledged account deletion');
                  },
                },
              ]
            );
          }, 500);
        } catch (logoutError) {
          console.error('[PROFILE] Logout error after deletion:', logoutError);
          // Still try to show success message
          setTimeout(() => {
            success('Success', 'Your account has been deleted. Please restart the app.');
          }, 300);
        }
      }
    } catch (e: any) {
      console.error('[PROFILE] Delete failed with exception:', e);
      const errorMsg = String(e?.message || e);
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
      // Use setTimeout to ensure modal is closed before showing alert
      setTimeout(() => {
        error('Error', errorMsg);
      }, 300);
    }
  };

  const copyPrincipal = async () => {
    if (!principal) return;
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(principal);
        } else if (typeof document !== 'undefined') {
          const ta = document.createElement('textarea');
          ta.value = principal;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        success('Copied', 'Principal copied to clipboard');
      } catch {
        // ignore
      }
      return;
    }
    Clipboard.setString(principal);
    success('Copied', 'Principal copied to clipboard');
  };

  const copyText = async (value: string, title: string, message: string) => {
    if (!value) return;
    if (Platform.OS === 'web') {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else if (typeof document !== 'undefined') {
          const ta = document.createElement('textarea');
          ta.value = value;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        success(title, message);
      } catch {
        // ignore
      }
      return;
    }
    Clipboard.setString(value);
    success(title, message);
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const formatIMERA = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ThreeDotLoader color={colors.brandPurple} size="large" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </Screen>
    );
  }

  const displayUsername = profile?.username || authUsername || 'Biker';
  const displayLevel = level || 1;

  return (
    <Screen>
      {/* Top Header with Username */}
      <View style={styles.topHeader}>
        <Text style={styles.topUsername}>{displayUsername}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>Profile</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'wallet' && styles.activeTab]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.activeTabText]}>Wallet</Text>
        </Pressable>
      </View>

      {activeTab === 'wallet' ? (
        <WalletScreen embedded={true} />
      ) : (
        <>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {(() => {
                const avatarRaw = profile?.avatar;
                const avatarVal = Array.isArray(avatarRaw) && avatarRaw.length > 0 ? avatarRaw[0] : (typeof avatarRaw === 'string' ? avatarRaw : '');
                if (avatarVal && typeof avatarVal === 'string' && avatarVal.length > 0) {
                  // If it's a URL, show icon, otherwise show initials
                  if (avatarVal.startsWith('http')) {
                    return <Ionicons name="person" size={40} color="#fff" />;
                  }
                  return <Text style={styles.avatarText}>{avatarVal.substring(0, 2).toUpperCase()}</Text>;
                }
                return <Ionicons name="person" size={40} color="#fff" />;
              })()}
              {profile?.isVerified && (
                <View style={styles.proBadge}>
                  <Text style={styles.proText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.username}>{displayUsername}</Text>
            <Text style={styles.userHandle}>Level {displayLevel} • {profile?.isActive ? 'Active' : 'Inactive'}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsScrollContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 0, gap: 12 }}>
              <LinearGradient colors={[colors.brandPurple, colors.brandViolet]} style={styles.statCard}>
                <Text style={styles.statLabel}>Total XP</Text>
                <Text style={styles.statValue}>{totalXP.toLocaleString()}</Text>
              </LinearGradient>
              <LinearGradient colors={[colors.brandBlue300, colors.brandBlue100]} style={styles.statCard}>
                <Text style={styles.statLabel}>iMERA</Text>
                <Text style={styles.statValue}>{formatIMERA(totalIMERA)}</Text>
              </LinearGradient>
              <View style={[styles.statCard, { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderAccent }]}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{formatDistance(totalDistance)}</Text>
              </View>
            </ScrollView>
          </View>

          {/* Account Info */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Account</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <SettingRow
                icon="person-outline"
                label="Username"
                value={displayUsername}
                onPress={() => setShowUpdateForm(true)}
              />
              <View style={styles.separator} />
              <SettingRow
                icon="mail-outline"
                label="Email"
                value={formEmail || '—'}
                onPress={() => setShowUpdateForm(true)}
              />
              <View style={styles.separator} />
              <SettingRow
                icon="document-text-outline"
                label="Principal"
                value={principal ? `${principal.slice(0, 8)}...${principal.slice(-8)}` : '—'}
                onPress={copyPrincipal}
                rightComponent={
                  <Pressable onPress={copyPrincipal}>
                    <Ionicons name="copy-outline" size={18} color={colors.brandPurple} />
                  </Pressable>
                }
              />
              <View style={styles.separator} />
              <SettingRow
                icon="create-outline"
                label="Edit Profile"
                onPress={() => setShowUpdateForm(true)}
              />
            </Card>
          </View>

          {/* Account extras */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Help</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <SettingRow
                icon="globe-outline"
                label="Bikera website"
                value="bikera.app"
                onPress={() => Linking.openURL(WEB_APP_URL).catch(() => {})}
              />
              <View style={styles.separator} />
              <SettingRow
                icon="copy-outline"
                label="Web app URL"
                value="Tap to copy"
                onPress={() => copyText(WEB_APP_URL, 'Copied', 'Web app URL copied')}
                rightComponent={
                  <Pressable onPress={() => copyText(WEB_APP_URL, 'Copied', 'Web app URL copied')}>
                    <Ionicons name="copy-outline" size={18} color={colors.brandPurple} />
                  </Pressable>
                }
              />
            </Card>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Preferences</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <SettingRow
                icon="moon-outline"
                label="Theme"
                value={prefTheme.toUpperCase()}
                onPress={() => {
                  const next = prefTheme === 'auto' ? 'dark' : prefTheme === 'dark' ? 'light' : 'auto';
                  setPrefTheme(next);
                  if (next !== 'auto') setMode(next);
                }}
              />
              <View style={styles.separator} />
              <SettingRow
                icon="resize-outline"
                label="Units"
                value={prefUnits.toUpperCase()}
                onPress={() => setPrefUnits(prefUnits === 'metric' ? 'imperial' : 'metric')}
              />
              <View style={styles.separator} />
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.switchIcon} />
                  <Text style={styles.switchLabel}>Email notifications</Text>
                </View>
                <Switch value={prefEmailNotif} onValueChange={setPrefEmailNotif} />
              </View>
              <View style={styles.separator} />
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} style={styles.switchIcon} />
                  <Text style={styles.switchLabel}>Push notifications</Text>
                </View>
                <Switch value={prefPushNotif} onValueChange={setPrefPushNotif} />
              </View>
              <View style={styles.separator} />
              <Pressable style={styles.saveButton} onPress={handleSavePreferences} disabled={savingPrefs}>
                {savingPrefs ? (
                  <ThreeDotLoader color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Preferences</Text>
                )}
              </Pressable>
            </Card>
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Privacy</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Ionicons name="eye-outline" size={20} color={colors.textSecondary} style={styles.switchIcon} />
                  <Text style={styles.switchLabel}>Show distance</Text>
                </View>
                <Switch value={privacyShowDistance} onValueChange={setPrivacyShowDistance} />
              </View>
              <View style={styles.separator} />
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} style={styles.switchIcon} />
                  <Text style={styles.switchLabel}>Show speed</Text>
                </View>
                <Switch value={privacyShowSpeed} onValueChange={setPrivacyShowSpeed} />
              </View>
              <View style={styles.separator} />
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Ionicons name="location-outline" size={20} color={colors.textSecondary} style={styles.switchIcon} />
                  <Text style={styles.switchLabel}>Show location</Text>
                </View>
                <Switch value={privacyShowLocation} onValueChange={setPrivacyShowLocation} />
              </View>
              <View style={styles.separator} />
              <Pressable style={styles.saveButton} onPress={handleSavePrivacy} disabled={savingPrivacy}>
                {savingPrivacy ? (
                  <ThreeDotLoader color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Privacy</Text>
                )}
              </Pressable>
            </Card>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <SettingRow icon="log-out-outline" label="Sign Out" isDestructive onPress={logout} />
              <View style={styles.separator} />
              <SettingRow
                icon="trash-outline"
                label="Delete Account (GDPR)"
                isDestructive
                onPress={() => {
                  console.log('[PROFILE] Delete Account button pressed');
                  setShowDeleteModal(true);
                  console.log('[PROFILE] showDeleteModal set to true');
                }}
              />
            </Card>
          </View>

          <Text style={styles.versionText}>Bikera v1.0.4 (Beta)</Text>
        </>
      )}

      {/* Update Profile Modal */}
      <Modal visible={showUpdateForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Profile</Text>
              <Pressable onPress={() => setShowUpdateForm(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Username</Text>
                <TextInput
                  style={styles.formInput}
                  value={formUsername}
                  onChangeText={setFormUsername}
                  placeholder="yourname"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Display Name</Text>
                <TextInput
                  style={styles.formInput}
                  value={formDisplayName}
                  onChangeText={setFormDisplayName}
                  placeholder="Your Name"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Bio</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={formBio}
                  onChangeText={setFormBio}
                  placeholder="Tell us about yourself"
                  multiline
                  numberOfLines={4}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Avatar URL</Text>
                <TextInput
                  style={styles.formInput}
                  value={formAvatar}
                  onChangeText={setFormAvatar}
                  placeholder="https://..."
                />
              </View>
              <Text style={styles.formSectionTitle}>Social Links</Text>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Strava</Text>
                <TextInput
                  style={styles.formInput}
                  value={formStrava}
                  onChangeText={setFormStrava}
                  placeholder="Strava profile URL"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Twitter</Text>
                <TextInput
                  style={styles.formInput}
                  value={formTwitter}
                  onChangeText={setFormTwitter}
                  placeholder="Twitter profile URL"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Instagram</Text>
                <TextInput
                  style={styles.formInput}
                  value={formInstagram}
                  onChangeText={setFormInstagram}
                  placeholder="Instagram profile URL"
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Website</Text>
                <TextInput
                  style={styles.formInput}
                  value={formWebsite}
                  onChangeText={setFormWebsite}
                  placeholder="Website URL"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable style={styles.modalCancelButton} onPress={() => setShowUpdateForm(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveButton, isUpdating && styles.modalSaveButtonDisabled]}
                onPress={handleUpdateProfile}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ThreeDotLoader color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Update</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          console.log('[PROFILE] Delete modal onRequestClose called');
          setShowDeleteModal(false);
        }}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.deleteModalKeyboardView}
        >
          <Pressable
            style={styles.deleteModalBackdrop}
            onPress={() => {
              console.log('[PROFILE] Delete modal backdrop pressed');
              setShowDeleteModal(false);
            }}
          >
            <View />
          </Pressable>
          <ScrollView
            contentContainerStyle={styles.deleteModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.deleteModalScrollView}
          >
            <View style={[styles.modalContent, styles.deleteModalContent]}>
              <View style={styles.deleteModalHeader}>
                <Ionicons name="warning" size={32} color={colors.error} />
                <Text style={styles.deleteModalTitle}>Delete Account</Text>
              </View>
              <View style={styles.deleteModalBody}>
                <Text style={styles.deleteModalText}>
                  This will permanently delete all your data including profile, ride history, achievements, and tokens.
                </Text>
                <Text style={styles.deleteModalWarning}>This action cannot be undone!</Text>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type DELETE to confirm</Text>
                  <View style={styles.deleteInputContainer}>
                    <TextInput
                      style={styles.formInput}
                      value={deleteConfirmation}
                      onChangeText={(text) => {
                        console.log('[PROFILE] Delete confirmation text changed:', text);
                        setDeleteConfirmation(text);
                      }}
                      placeholder="DELETE"
                      autoCapitalize="characters"
                      returnKeyType="done"
                      maxLength={6}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.modalCancelButton}
                  onPress={() => {
                    console.log('[PROFILE] Cancel button pressed in delete modal');
                    setShowDeleteModal(false);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalDeleteButton,
                    (deleteConfirmation !== 'DELETE' || isDeleting) && styles.modalDeleteButtonDisabled,
                  ]}
                  onPress={() => {
                    console.log('[PROFILE] Delete Forever button pressed, confirmation:', deleteConfirmation);
                    handleDeleteAccount();
                  }}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? (
                    <ThreeDotLoader color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalDeleteText}>Delete Forever</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 16,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  topUsername: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border1,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.brandPurple,
    borderColor: colors.brandPurple,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  walletContainer: {
    gap: 16,
  },
  walletSection: {
    gap: 12,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  principalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  principalText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textPrimary,
  },
  copyButton: {
    padding: 4,
  },
  walletNote: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface3,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brandPurple,
    marginBottom: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  proBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: colors.brandBlue100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userHandle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsScrollContainer: {
    marginBottom: 24,
  },
  statCard: {
    width: 140,
    padding: 16,
    borderRadius: 20,
    justifyContent: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border1,
    marginLeft: 56,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switchIcon: {
    width: 32,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brandPurple,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  referredList: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  referredHeader: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  referredRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  referredText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
  referralCodeRow: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  referralCodeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  referralCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  referralCodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '60%',
  },
  referralCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border1,
    maxWidth: '100%',
    flexShrink: 1,
  },
  referralCodePillPressed: {
    backgroundColor: colors.border1,
  },
  referralCodeValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  referralCopyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  versionText: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: 12,
    marginBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  deleteModalKeyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  deleteModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  deleteModalScrollView: {
    flex: 1,
    width: '100%',
  },
  deleteModalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    justifyContent: 'flex-end',
    flexGrow: 1,
    width: '100%',
  },
  modalContent: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 0,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  formInput: {
    backgroundColor: colors.surface1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: colors.border1,
    minHeight: 50,
    width: '100%',
  },
  formTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border1,
    marginTop: 0,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface1,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.brandPurple,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteModalContent: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 0,
    maxHeight: '85%',
  },
  deleteModalHeader: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border1,
  },
  deleteModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.error,
  },
  deleteModalBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  deleteInputContainer: {
    width: '100%',
  },
  deleteModalText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  deleteModalWarning: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalDeleteButtonDisabled: {
    opacity: 0.5,
  },
  modalDeleteText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
