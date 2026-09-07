import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Principal } from '@dfinity/principal';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { colors } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { getBikeraUserActor, getBikeraXpActor } from '../utils/actors';

interface UserXPProfile {
  userId: any;
  totalXP: bigint | number;
  currentLevel: number;
  xpToNextLevel: bigint | number;
  totalDistance: bigint | number;
  lastActivity: bigint | number;
  achievements: string[];
  referralCount: number;
  streakDays: number;
  lastStreakDay?: bigint | number | null;
}

interface PublicUserProfile {
  username: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  createdAt?: number;
  lastActivity?: number;
  preferences?: any;
  socialLinks?: { twitter?: string; instagram?: string; strava?: string; website?: string };
  privacy?: { profileVisibility?: string; showDistance?: boolean; showAchievements?: boolean };
  isVerified?: boolean;
}

const nsToMs = (v: any): number => (typeof v === 'bigint' ? Number(v / 1_000_000n) : Math.floor(Number(v) / 1_000_000));
const metersToKm = (v: any): number => Number(v) / 1000;

export function PublicProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { principal: viewerPrincipal, getIdentity } = useAuth();

  const principalParam = route.params?.principal || route.params?.principalParam || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xp, setXp] = useState<UserXPProfile | null>(null);
  const [user, setUser] = useState<PublicUserProfile | null>(null);
  const [isFriend, setIsFriend] = useState<boolean>(false);
  const [isSelf, setIsSelf] = useState<boolean>(false);

  const principalObj = useMemo(() => {
    try {
      return principalParam ? Principal.fromText(principalParam) : null;
    } catch (e) {
      return null;
    }
  }, [principalParam]);

  const viewerPrincipalText = useMemo(() => {
    return viewerPrincipal || '';
  }, [viewerPrincipal]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!principalObj) {
        setError('Invalid principal');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const identity = getIdentity();
        const xpActor: any = getBikeraXpActor({}, identity);
        const userActor: any = getBikeraUserActor({}, identity);

        const promises: any[] = [
          xpActor.getPublicUserXPProfile(principalObj).catch(() => null),
          userActor.getUserProfile(principalObj).catch(() => null),
        ];

        let viewerFriendsPromise: Promise<any> | null = null;
        if (viewerPrincipalText) {
          try {
            const vp = Principal.fromText(viewerPrincipalText);
            viewerFriendsPromise = userActor.getFriends(vp).catch(() => []);
            promises.push(viewerFriendsPromise);
          } catch {}
        }

        const results = await Promise.all(promises);
        const xpData = results[0];
        const userOpt = results[1];
        const friendsArr = results.length > 2 ? results[2] : null;

        if (cancelled) return;

        const unwrapOpt = (opt: any) =>
          Array.isArray(opt) && opt.length > 0 ? opt[0] : opt && typeof opt === 'object' && !Array.isArray(opt) ? opt : null;

        const up = unwrapOpt(userOpt);

        // Self / friend checks
        const viewerIsSelf = viewerPrincipalText && principalParam && viewerPrincipalText === principalParam;
        setIsSelf(!!viewerIsSelf);

        if (!viewerIsSelf && Array.isArray(friendsArr)) {
          try {
            const targetText = principalParam || '';
            const isFr = friendsArr.some((x: any) => (x?.toText ? x.toText() : String(x)) === targetText);
            setIsFriend(!!isFr);
          } catch {
            setIsFriend(false);
          }
        } else if (viewerIsSelf) {
          setIsFriend(true);
        }

        setXp(xpData as UserXPProfile);

        if (up) {
          const toText = (v: any) => (Array.isArray(v) && v.length > 0 ? v[0] : typeof v === 'string' ? v : '');
          const prefs = up.preferences || {};
          const links = up.socialLinks || {};
          const privacy = up.privacySettings || {};

          setUser({
            username: up.username || '',
            displayName: toText(up.displayName),
            bio: toText(up.bio),
            avatar: toText(up.avatar),
            createdAt: typeof up.createdAt === 'bigint' ? Number(up.createdAt / 1_000_000n) : Number(up.createdAt),
            lastActivity:
              typeof up.lastActivity === 'bigint' ? Number(up.lastActivity / 1_000_000n) : Number(up.lastActivity),
            preferences: prefs,
            socialLinks: {
              twitter: toText(links.twitter),
              instagram: toText(links.instagram),
              strava: toText(links.strava),
              website: toText(links.website),
            },
            privacy: {
              profileVisibility: privacy.profileVisibility,
              showDistance: !!privacy.showDistance,
              showAchievements: !!privacy.showAchievements,
            },
            isVerified: !!up.isVerified,
          });
        } else {
          setUser(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error('[PUBLIC_PROFILE] Failed to load:', e);
          setError(e?.message || 'Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [principalObj, viewerPrincipalText, principalParam]);

  const allow = (field: string) => {
    const vis = (user?.privacy?.profileVisibility || 'public').toLowerCase();
    const canViewDetails = isSelf || vis === 'public' || (vis === 'friends' && isFriend);
    if (!canViewDetails) return false;
    if (field === 'totalDistance') return !!user?.privacy?.showDistance;
    if (field === 'achievements') return !!user?.privacy?.showAchievements;
    return true;
  };

  const formatDateAgo = (ns: any) => {
    const ms = nsToMs(ns);
    const diff = Date.now() - ms;
    const days = Math.floor(diff / (24 * 3600 * 1000));
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / (3600 * 1000));
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}m ago`;
  };

  const handleSocialLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error('[PUBLIC_PROFILE] Failed to open link:', err);
        Alert.alert('Error', 'Failed to open link');
      });
    }
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

  if (error) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (!xp && !user) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No profile found.</Text>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const vis = (user?.privacy?.profileVisibility || 'public').toLowerCase();
  const canViewDetails = isSelf || vis === 'public' || (vis === 'friends' && isFriend);

  if (!canViewDetails) {
    const message = vis === 'private' ? 'This profile is private.' : 'This profile is visible to friends only.';
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed" size={32} color={colors.textSecondary} />
          <Text style={styles.errorText}>{message}</Text>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const avatarRaw = user?.avatar;
  const avatarVal = Array.isArray(avatarRaw) && avatarRaw.length > 0 ? avatarRaw[0] : typeof avatarRaw === 'string' ? avatarRaw : '';
  const displayName = user?.displayName || user?.username || 'User';
  const avatarInitials = (user?.displayName?.charAt(0) || user?.username?.charAt(0) || '?').toUpperCase();

  return (
    <Screen>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {avatarVal && avatarVal.startsWith('http') ? (
                  <View style={styles.avatarImageContainer}>
                    <Text style={styles.avatarText}>{avatarInitials}</Text>
                  </View>
                ) : avatarVal && typeof avatarVal === 'string' && avatarVal.length > 0 ? (
                  <Text style={styles.avatarText}>{avatarVal.substring(0, 2).toUpperCase()}</Text>
                ) : (
                  <Text style={styles.avatarText}>{avatarInitials}</Text>
                )}
                {user?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName}</Text>
                {xp && (
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Lvl {xp.currentLevel}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{user?.username}</Text>
              <View style={styles.metaRow}>
                {user?.lastActivity && (
                  <Text style={styles.metaText}>Last active {formatDateAgo(user.lastActivity * 1_000_000)}</Text>
                )}
                {user?.createdAt && (
                  <Text style={styles.metaText}>
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
              {user?.socialLinks && (
                <View style={styles.socialLinks}>
                  {user.socialLinks.twitter && (
                    <Pressable onPress={() => handleSocialLink(user.socialLinks!.twitter!)}>
                      <Text style={styles.socialLink}>Twitter</Text>
                    </Pressable>
                  )}
                  {user.socialLinks.instagram && (
                    <Pressable onPress={() => handleSocialLink(user.socialLinks!.instagram!)}>
                      <Text style={styles.socialLink}>Instagram</Text>
                    </Pressable>
                  )}
                  {user.socialLinks.strava && (
                    <Pressable onPress={() => handleSocialLink(user.socialLinks!.strava!)}>
                      <Text style={styles.socialLink}>Strava</Text>
                    </Pressable>
                  )}
                  {user.socialLinks.website && (
                    <Pressable onPress={() => handleSocialLink(user.socialLinks!.website!)}>
                      <Text style={styles.socialLink}>Website</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Stats Grid */}
        {(!user || allow('username')) && xp && (
          <Card style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total XP</Text>
                <Text style={styles.statValue}>{Number(xp.totalXP).toLocaleString()}</Text>
              </View>
              {allow('totalDistance') && (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Distance</Text>
                  <Text style={styles.statValue}>{metersToKm(xp.totalDistance).toFixed(1)} km</Text>
                </View>
              )}
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Current Streak</Text>
                <Text style={styles.statValue}>{xp.streakDays} days</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>XP To Next Level</Text>
                <Text style={styles.statValue}>{Number(xp.xpToNextLevel).toLocaleString()}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Achievements */}
        {xp && allow('achievements') && (
          <Card style={styles.achievementsCard}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {xp.achievements.length === 0 ? (
              <Text style={styles.emptyText}>No achievements yet.</Text>
            ) : (
              <View style={styles.achievementsList}>
                {xp.achievements.map((achievement, idx) => (
                  <View key={idx} style={styles.achievementItem}>
                    <Text style={styles.achievementText}>{achievement}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: colors.brandPurple,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  profileCard: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brandPurple,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: colors.brandBlue300,
  },
  avatarImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: colors.surface3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 2,
  },
  profileInfo: {
    flex: 1,
    gap: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  levelBadge: {
    backgroundColor: colors.brandPurple,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    opacity: 0.8,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bio: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 4,
    lineHeight: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  socialLink: {
    fontSize: 14,
    color: colors.brandPurple,
    textDecorationLine: 'underline',
  },
  statsCard: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  achievementsCard: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    backgroundColor: colors.surface1,
    borderRadius: 12,
    padding: 12,
  },
  achievementText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
