import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Text, View, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Principal } from '@dfinity/principal';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import StatsHero from '../components/StatsHero';
import QuickActions from '../components/QuickActions';
import { useAuth } from '../contexts/AuthContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { PressableScale, FadeInView } from '../components/motion';
import { colors } from '../theme/tokens';
import { LoadingBlock } from '../components/LoadingBlock';
import { GuestBanner } from '../components/GuestBanner';
import {
  getBikeraXpActor,
  getBikeraImeraActor,
  getBikeraUserActor,
  getShadowClient,
  getHost,
} from '../utils/actors';
import { HttpAgent } from '@dfinity/agent';
import { useCachedData } from '../hooks/useCachedData';
import { startupGate } from '../services/startupGate';

interface DashboardStats {
  xp: number | null;
  level: number | null;
  imera: number | null;
  streak: number | null;
  todayDistance: number | null;
  xpToNextLevel: number | null;
}

export function DashboardScreen() {
  const { username, principal, getIdentity, isGuest } = useAuth();
  const navigation = useNavigation<any>();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    xp: null,
    level: null,
    imera: null,
    streak: null,
    todayDistance: null,
    xpToNextLevel: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  // Memoize computed values
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Memoize quick actions to prevent re-creation
  const quickActions = useMemo(() => [
    { label: 'Track ride', icon: 'navigate-outline', onPress: () => navigation.navigate('Track') },
    { label: 'Friends', icon: 'people-outline', onPress: () => navigation.navigate('Friends') },
    { label: 'Leaderboard', icon: 'trophy-outline', onPress: () => navigation.navigate('Leaderboard') },
    { label: 'Wallet', icon: 'wallet-outline', onPress: () => navigation.navigate('More', { screen: 'Wallet' }) },
  ], [navigation]);

  // Memoize formatted stats
  const formattedDistance = useMemo(
    () => (stats.todayDistance !== null ? stats.todayDistance.toFixed(1) : '0.0'),
    [stats.todayDistance]
  );

  const formattedXP = useMemo(
    () => (stats.xp !== null ? stats.xp.toLocaleString() : '0'),
    [stats.xp]
  );

  const formattedImera = useMemo(() => {
    const value = stats.imera ?? 0;
    if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
    return value.toFixed(2);
  }, [stats.imera]);

  // Helper functions
  const nsToMs = (v: any): number => {
    if (typeof v === 'bigint') {
      return Number(v / 1_000_000n);
    }
    return Math.floor(Number(v) / 1_000_000);
  };

  const toNum = (v: any): number => (typeof v === 'bigint' ? Number(v) : Number(v));

  // Fetch dashboard stats with caching
  const fetchDashboardData = useCallback(async () => {
    if (!principal) {
      return null;
    }

    const identity = getIdentity();
    if (!identity) {
      console.warn('[DASHBOARD] No identity available');
      return null;
    }

    const identityPrincipal = identity.getPrincipal().toText();
    const principalToUse = identityPrincipal !== principal ? identityPrincipal : principal;
    const p = Principal.fromText(principalToUse);

    // Create agent from identity for shadow worker
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
    const imeraActor = getBikeraImeraActor({}, identity);
    const userActor = getBikeraUserActor({}, identity);

    // Add timeout wrapper
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, defaultValue: T): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => {
          setTimeout(() => {
            console.warn('[DASHBOARD] Request timed out after', timeoutMs, 'ms');
            resolve(defaultValue);
          }, timeoutMs);
        }),
      ]);
    };

    // Load all snapshots in parallel (optimized - reduced timeout for faster failure)
    const [xpSnapshot, dashboardSnapshot, imeraBalance, activitySessions, userProfile] = await Promise.all([
      withTimeout(shadow.getXPSnapshot(p, true).catch(() => null as any), 8000, null as any),
      withTimeout(shadow.getUserDashboardSnapshot(p, true).catch(() => null as any), 8000, null as any),
      withTimeout(imeraActor.icrc1_balance_of({ owner: p, subaccount: [] }).catch(() => 0n), 8000, 0n),
      withTimeout(shadow.getActivitySessions(p, BigInt(20), BigInt(0)).catch(() => [] as any[]), 8000, [] as any[]),
      withTimeout(userActor.getCurrentUserProfile(p).catch(() => null as any), 8000, null as any),
    ]);

    // Extract XP data
    let xp = 0;
    let level = 1;
    let xpToNextLevel = 0;
    if (xpSnapshot) {
      xp = toNum(xpSnapshot.totalXP || 0n);
      level = toNum(xpSnapshot.level || 1n);
      const nextLevelXP = toNum(xpSnapshot.nextLevelXP || 0n);
      xpToNextLevel = Math.max(0, nextLevelXP - xp);
    } else {
      try {
        const xpActor = getBikeraXpActor({}, identity);
        const [totalXP, currentLevel, nextLevelXP] = await Promise.all([
          xpActor.getTotalXP(p),
          xpActor.getLevel(p),
          xpActor.getXPToNextLevel(p),
        ]);
        xp = toNum(totalXP);
        level = toNum(currentLevel);
        const nextXP = toNum(nextLevelXP);
        xpToNextLevel = Math.max(0, nextXP - xp);
      } catch (e) {
        console.error('Failed to fetch XP fallback:', e);
      }
    }

    const imera = toNum(imeraBalance) / 100000000;

    let streak = 0;
    if (dashboardSnapshot?.stats?.streakDays) {
      streak = toNum(dashboardSnapshot.stats.streakDays);
    } else if (dashboardSnapshot?.stats?.currentStreak) {
      streak = toNum(dashboardSnapshot.stats.currentStreak);
    }

    let todayDistance = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();

    (activitySessions as any[]).forEach((session: any) => {
      const startTime = nsToMs(session.startTime || 0n);
      if (startTime >= todayStart) {
        const distanceMeters = toNum(session.distance || 0n);
        todayDistance += distanceMeters;
      }
    });

    const todayDistanceKm = todayDistance / 1000;

    let profileDisplayName: string | null = null;
    if (userProfile) {
      const profileOpt = Array.isArray(userProfile) && userProfile.length > 0 ? userProfile[0] : userProfile;
      if (profileOpt) {
        const displayNameRaw = (profileOpt as any).displayName;
        if (displayNameRaw) {
          profileDisplayName = Array.isArray(displayNameRaw) && displayNameRaw.length > 0
            ? displayNameRaw[0]
            : (typeof displayNameRaw === 'string' ? displayNameRaw : null);
        }
      }
    }

    return {
      stats: {
        xp,
        level,
        imera,
        streak,
        todayDistance: todayDistanceKm,
        xpToNextLevel,
      },
      displayName: profileDisplayName,
    };
  }, [principal, getIdentity]);

  const { data: dashboardData, loading: dashboardLoading, refetch } = useCachedData({
    type: 'dashboard',
    identifier: principal || undefined,
    fetcher: fetchDashboardData,
    enabled: !!principal,
    tier: 'bootstrap',
    refetchOnFocus: false,
    refetchOnForeground: false,
    minRefetchIntervalMs: 90_000,
  });

  // Update state when cached data is available; unlock cold-start gate for other screens
  useEffect(() => {
    if (!principal) {
      startupGate.unlock('guest-home');
      return;
    }
    if (dashboardData) {
      setStats(dashboardData.stats);
      setDisplayName(dashboardData.displayName);
      startupGate.unlock('dashboard');
    } else if (!dashboardLoading) {
      startupGate.unlock('dashboard-empty');
    }
  }, [principal, dashboardData, dashboardLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue100} />
      }
    >
      <SectionHeader
        title={`${greeting}, ${displayName || username || (isGuest ? 'Guest' : 'Biker')}`}
        subtitle={principal ? `ID: ${principal.slice(0, 10)}…` : isGuest ? 'Exploring without signing in' : undefined}
      />

      <GuestBanner message="Home, Track, Friends, Ranks, and More all work. Sign in is at the top of More if you want to save rides and rewards." />

      <View style={styles.content}>
        <FadeInView variant="up">
          {dashboardLoading && principal ? (
            <LoadingBlock message="Loading stats…" color={colors.brandBlue100} />
          ) : principal && !dashboardData ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Couldn't load stats</Text>
              <Text style={styles.errorSubtext}>Check your connection and try again.</Text>
              <PrimaryButton label="Retry" onPress={() => refetch()} style={styles.retryButton} />
            </View>
          ) : (
            <StatsHero
              distance={formattedDistance}
              xp={formattedXP}
              imera={formattedImera}
            />
          )}
        </FadeInView>

        <FadeInView delay={80} style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <QuickActions actions={quickActions} />
        </FadeInView>

        <FadeInView delay={140}>
          <PressableScale
            onPress={() => navigation.navigate('Track')}
            style={styles.rideCard}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="Start tracking a ride"
          >
            <LinearGradient
              colors={[colors.brandIndigo, colors.brandPurple, colors.brandBlue200]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rideGradient}
            >
              <View style={styles.rideTop}>
                <View style={styles.rideIcon}>
                  <Ionicons name="bicycle" size={24} color="#0B1220" />
                </View>
                <View style={styles.rideCopy}>
                  <Text style={styles.rideTitle}>Ready to ride</Text>
                  <Text style={styles.rideSubtitle}>
                    {isGuest
                      ? 'Track locally as a guest. Sign in later to save rides to your account.'
                      : 'Open GPS tracking and start earning as you move.'}
                  </Text>
                </View>
              </View>
              <View style={styles.rideButton}>
                <Text style={styles.rideButtonText}>Start tracking</Text>
                <Ionicons name="arrow-forward" size={18} color="#0B1220" />
              </View>
            </LinearGradient>
          </PressableScale>
        </FadeInView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 10,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  retryButton: {
    minWidth: 140,
  },
  loadingContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  miningCard: {
    marginTop: 24,
    backgroundColor: 'rgba(6, 7, 23, 0.6)', // Glass-like surface
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rideCard: {
    marginTop: 24,
    borderRadius: 24,
  },
  rideGradient: {
    borderRadius: 24,
    padding: 20,
  },
  rideTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  rideIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rideCopy: {
    flex: 1,
  },
  rideTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  rideSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 18,
  },
  rideButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideButtonText: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  miningLoadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miningLoadingText: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 13,
  },
  miningEmptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  miningEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  miningEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  miningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  completedBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderColor: 'rgba(156, 163, 175, 0.4)',
  },
  activeText: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '800',
  },
  completedText: {
    color: '#9ca3af',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brandBlue100,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miningStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  miningStatItem: {
    alignItems: 'center',
  },
  miningStatLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  miningStatValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  miningInfo: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});

