import React, { useMemo, useEffect, useState, useCallback, memo } from 'react';
import { Text, View, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Principal } from '@dfinity/principal';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import StatsHero from '../components/StatsHero';
import QuickActions from '../components/QuickActions';
import { useAuth } from '../contexts/AuthContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radii } from '../theme/tokens';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { LoadingBlock } from '../components/LoadingBlock';
import {
  getBikeraXpActor,
  getBikeraImeraActor,
  getBikeraUserActor,
  getBikeraMainActor,
  getShadowClient,
  getHost,
} from '../utils/actors';
import { HttpAgent } from '@dfinity/agent';
import { useCachedData } from '../hooks/useCachedData';
import { dataCache } from '../services/dataCache';
import { useToastHelpers } from '../contexts/ToastContext';
import { appStateManager } from '../services/appStateManager';

interface DashboardStats {
  xp: number | null;
  level: number | null;
  imera: number | null;
  streak: number | null;
  todayDistance: number | null;
  xpToNextLevel: number | null;
}

interface MiningRound {
  id: number;
  status: 'active' | 'completed' | 'pending';
  startTime: number;
  endTime: number;
  participants: number;
  totalMined: number;
  progress: number;
  timeRemaining: string;
}

export function DashboardScreen() {
  const { username, principal, getIdentity } = useAuth();
  const { error, success } = useToastHelpers();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    xp: null,
    level: null,
    imera: null,
    streak: null,
    todayDistance: null,
    xpToNextLevel: null,
  });
  const [miningRound, setMiningRound] = useState<MiningRound | null>(null);
  const [miningLoading, setMiningLoading] = useState(true);
  const [callerText, setCallerText] = useState<string | null>(null);
  const [callerTextLoading, setCallerTextLoading] = useState(true);
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
    { label: 'Leaderboard', icon: 'trophy-outline', onPress: () => navigation.navigate('More', { screen: 'Leaderboard' }) },
    { label: 'Wallet', icon: 'wallet-outline', onPress: () => navigation.navigate('More', { screen: 'Wallet' }) },
  ], [navigation]);

  // Memoize formatted stats
  const formattedDistance = useMemo(() => 
    stats.todayDistance !== null ? `${stats.todayDistance.toFixed(1)} km` : '0.0 km',
    [stats.todayDistance]
  );

  const formattedXP = useMemo(() => 
    stats.xp !== null ? stats.xp.toLocaleString() : '0',
    [stats.xp]
  );

  // Helper functions
  const nsToMs = (v: any): number => {
    if (typeof v === 'bigint') {
      return Number(v / 1_000_000n);
    }
    return Math.floor(Number(v) / 1_000_000);
  };

  const toNum = (v: any): number => (typeof v === 'bigint' ? Number(v) : Number(v));

  // Format time remaining
  const formatTimeRemaining = (endTime: number): string => {
    const now = Date.now();
    const remaining = endTime - now;
    if (remaining <= 0) return 'Round ending...';
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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
    const [xpSnapshot, rewardsSnapshot, dashboardSnapshot, imeraBalance, activitySessions, userProfile] = await Promise.all([
      withTimeout(shadow.getXPSnapshot(p, true).catch(() => null), 8000, null),
      withTimeout(shadow.getRewardsSnapshot(p, true).catch(() => null), 8000, null),
      withTimeout(shadow.getUserDashboardSnapshot(p, true).catch(() => null), 8000, null),
      withTimeout(imeraActor.icrc1_balance_of({ owner: p, subaccount: [] }).catch(() => 0n), 8000, 0n),
      withTimeout(shadow.getActivitySessions(p, BigInt(20), BigInt(0)).catch(() => []), 8000, []), // Reduced from 50 to 20
      withTimeout(userActor.getCurrentUserProfile(p).catch(() => null), 8000, null),
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
  });

  // Update state when cached data is available
  useEffect(() => {
    if (dashboardData) {
      setStats(dashboardData.stats);
      setDisplayName(dashboardData.displayName);
      setLoading(false);
    } else if (!dashboardLoading && principal) {
      setLoading(false);
    }
  }, [dashboardData, dashboardLoading, principal]);

  // Set loading state
  useEffect(() => {
    setLoading(dashboardLoading);
  }, [dashboardLoading]);

  // Refresh stats every 3 minutes (further reduced for better performance)
  // Cache will handle stale-while-revalidate pattern
  useEffect(() => {
    if (!principal) return;

    const interval = setInterval(() => {
      // Only refetch if app is in foreground
      if (appStateManager.isActive()) {
        refetch();
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [principal, refetch]);

  // Fetch mining round (optimized - less frequent updates)
  useEffect(() => {
    let cancelled = false;

    const fetchMiningRound = async (showLoader: boolean = false) => {
      // Skip if app is in background
      if (!appStateManager.isActive() && !showLoader) {
        return;
      }

      try {
        // Only show loader on initial load or when explicitly requested
        if (showLoader) {
          setMiningLoading(true);
        }
        const mainActor = getBikeraMainActor();

        // Check if automated mining is active
        const active: any = await mainActor.isAutomatedMiningActive();
        const isActiveBool = Boolean(active);
        if (!isActiveBool) {
          if (!cancelled) {
            setMiningRound(null);
            if (showLoader) {
              setMiningLoading(false);
            }
          }
          return;
        }

        const opt: any = await mainActor.getCurrentRound();
        const r = Array.isArray(opt) && opt.length > 0 ? opt[0] : null;
        if (!r) {
          if (!cancelled) {
            setMiningRound(null);
            if (showLoader) {
              setMiningLoading(false);
            }
          }
          return;
        }

        const startMs = nsToMs((r as any).startTime);
        const endMs = nsToMs((r as any).endTime);
        const now = Date.now();
        let status: 'active' | 'completed' | 'pending' = 'active';
        if ((r as any).isCompleted) status = 'completed';
        else if (now < startMs) status = 'pending';

        const participants = Array.isArray((r as any).activeUsers) ? (r as any).activeUsers.length : 0;
        const totalMined = toNum((r as any).totalMined);
        const progress = endMs && startMs
          ? Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100))
          : 0;

        const round: MiningRound = {
          id: toNum((r as any).id),
          status,
          startTime: startMs,
          endTime: endMs,
          participants,
          totalMined,
          progress,
          timeRemaining: formatTimeRemaining(endMs),
        };

        if (!cancelled) {
          setMiningRound(round);
        }
      } catch (err) {
        console.error('Failed to load mining round:', err);
        error('Mining Error', 'Failed to load current mining round data.');
        if (!cancelled) {
          setMiningRound(null);
        }
      } finally {
        if (!cancelled && showLoader) {
          setMiningLoading(false);
        }
      }
    };

    // Initial load - show loader
    fetchMiningRound(true);

    // Update time remaining every second (only if app is active)
    const timeInterval = setInterval(() => {
      if (miningRound && appStateManager.isActive()) {
        setMiningRound((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            timeRemaining: formatTimeRemaining(prev.endTime),
            progress: Math.min(100, Math.max(0, ((Date.now() - prev.startTime) / (prev.endTime - prev.startTime)) * 100)),
          };
        });
      }
    }, 1000);

    // Refresh mining round every 30 seconds (reduced frequency, silently, no loader)
    const refreshInterval = setInterval(() => {
      if (appStateManager.isActive()) {
        fetchMiningRound(false);
      }
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(timeInterval);
      clearInterval(refreshInterval);
    };
  }, []);

  // Fetch caller text (optimized - less frequent, only when active)
  useEffect(() => {
    let cancelled = false;

    const fetchCallerText = async () => {
      // Skip if app is in background
      if (!appStateManager.isActive()) {
        return;
      }

      // Only fetch if we have an identity (so we can identify the caller)
      const identity = getIdentity();
      if (!identity) {
        if (!cancelled) {
          setCallerTextLoading(false);
          setCallerText(null);
        }
        return;
      }

      try {
        setCallerTextLoading(true);

        // Create agent with identity to get the actual caller information
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

        // Create actor with identity
        const mainActor = getBikeraMainActor({ agent });
        const text = await mainActor.getCallerText();

        if (!cancelled) {
          setCallerText(text);
        }
      } catch (err) {
        console.error('Failed to load caller text:', err);
        // Don't show error toast on background refresh
        if (appStateManager.isActive()) {
          error('Connection Error', 'Failed to communicate with the IC network.');
        }
        if (!cancelled) {
          setCallerText(null);
        }
      } finally {
        if (!cancelled) {
          setCallerTextLoading(false);
        }
      }
    };

    fetchCallerText();

    // Refresh caller text every 60 seconds (reduced frequency)
    const interval = setInterval(() => {
      if (appStateManager.isActive()) {
        fetchCallerText();
      }
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [principal]); // Re-fetch when principal changes

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
        title={`${greeting}, ${displayName || username || 'Biker'}`}
        subtitle={principal ? `ID: ${principal.slice(0, 10)}…` : undefined}
      />

      <View style={styles.content}>
        {loading ? (
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
          />
        )}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <QuickActions actions={quickActions} />
        </View>

        <View style={styles.miningCard}>
          <Text style={styles.sectionTitle}>Ready to ride</Text>
          <Text style={styles.miningInfo}>
            Track a ride, check your balance, and climb the leaderboard with friends.
          </Text>
          <PrimaryButton label="Start tracking" onPress={() => navigation.navigate('Track')} style={styles.retryButton} />
        </View>

        <View style={styles.callerTextCard}>
          <Text style={styles.sectionTitle}>Caller Information</Text>
          {callerTextLoading ? (
            <View style={styles.callerTextLoadingContainer}>
              <ThreeDotLoader color={colors.brandBlue100} size="small" />
              <Text style={styles.callerTextLoadingText}>Loading caller text...</Text>
            </View>
          ) : callerText ? (
            <View style={styles.callerTextContainer}>
              <Text style={styles.callerTextLabel}>Caller Text:</Text>
              <Text style={styles.callerTextValue}>{callerText}</Text>
            </View>
          ) : (
            <View style={styles.callerTextEmptyContainer}>
              <Text style={styles.callerTextEmptyText}>No caller text available</Text>
            </View>
          )}
        </View>
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
  callerTextCard: {
    marginTop: 24,
    backgroundColor: 'rgba(6, 7, 23, 0.6)', // Glass-like surface
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  callerTextLoadingContainer: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerTextLoadingText: {
    color: colors.textSecondary,
    marginTop: 8,
    fontSize: 13,
  },
  callerTextContainer: {
    paddingVertical: 12,
  },
  callerTextLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  callerTextValue: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  callerTextEmptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  callerTextEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});

