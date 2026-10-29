import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Text, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Principal } from '@dfinity/principal';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import StatsHero from '../components/StatsHero';
import QuickActions from '../components/QuickActions';
import WalletSummary from '../components/WalletSummary';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { PressableScale } from '../components/motion';
import { colors, radii } from '../theme/tokens';
import { GuestBanner } from '../components/GuestBanner';
import {
  getBikeraUserActor,
  getBikeraXpActor,
  getBikeraImeraActor,
  getBikeraRewardsActor,
} from '../utils/actors';
import { useCachedData } from '../hooks/useCachedData';
import { startupGate } from '../services/startupGate';
import { fetchTodayDistanceKm } from '../services/todayDistance';
import { formatDistanceKm, formatImera, formatXP, fromE8s, E8S_PER_TOKEN } from '../utils/formatStats';

interface DashboardTransaction {
  id: string;
  amount: number;
  timestamp: number;
}

interface DashboardStats {
  xp: number | null;
  level: number | null;
  imera: number | null;
  streak: number | null;
  todayDistance: number | null;
  xpToNextLevel: number | null;
  transactions: DashboardTransaction[];
}

function toNum(v: any): number {
  return typeof v === 'bigint' ? Number(v) : Number(v);
}

function readDisplayName(profile: any): string | null {
  const raw = profile?.displayName;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? raw[0] : null;
  return typeof raw === 'string' ? raw : null;
}

function unwrapSnapshot(raw: any): any | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.length > 0 ? raw[0] : null;
  return raw;
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
    transactions: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  // Memoize computed values
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Quick actions with bicycle icon for Ride
  const quickActions = useMemo(
    () => [
      {
        label: 'Ride',
        icon: 'bicycle-outline',
        onPress: () => navigation.navigate('Track'),
      },
      {
        label: 'Friends',
        icon: 'people-outline',
        onPress: () => navigation.navigate('Friends'),
      },
      {
        label: 'Leaderboard',
        icon: 'trophy-outline',
        onPress: () => navigation.navigate('Leaderboard'),
      },
      {
        label: 'Wallet',
        icon: 'wallet-outline',
        onPress: () => navigation.navigate('More', { screen: 'Wallet' }),
      },
      {
        label: 'Scan a Bike',
        icon: 'qr-code-outline',
        onPress: () => navigation.navigate('More', { screen: 'ScanBike' }),
      },
    ],
    [navigation]
  );

  // Formatted stats
  const formattedDistance = useMemo(
    () => formatDistanceKm(stats.todayDistance ?? 0),
    [stats.todayDistance]
  );

  const formattedXP = useMemo(() => formatXP(stats.xp ?? 0), [stats.xp]);
  const formattedImera = useMemo(() => formatImera(stats.imera ?? 0), [stats.imera]);

  // Profile, stats and latest transactions
  const fetchDashboardData = useCallback(async () => {
    if (!principal) return null;

    const identity = getIdentity();
    if (!identity) {
      if (__DEV__) console.warn('[DASHBOARD] No identity available');
      return null;
    }

    const identityPrincipal = identity.getPrincipal().toText();
    const principalToUse = identityPrincipal !== principal ? identityPrincipal : principal;
    const p = Principal.fromText(principalToUse);

    try {
      const userActor = getBikeraUserActor({}, identity);
      const xpActor = getBikeraXpActor({}, identity);
      const imeraActor = getBikeraImeraActor({}, identity);
      const rewardsActor = getBikeraRewardsActor({}, identity);

      const [profileRaw, xpProfile, imeraBalance, todayKm, rewardsSnapshot] = await Promise.all([
        userActor.getCurrentUserProfile(p).catch(() => null),
        xpActor.getPublicUserXPProfile(p).catch(() => null),
        imeraActor.icrc1_balance_of({ owner: p, subaccount: [] }).catch(() => 0n),
        fetchTodayDistanceKm(p, identity).catch((error) => {
          if (__DEV__) console.warn('[DASHBOARD] Today distance summary failed:', error);
          return null;
        }),
        (rewardsActor as any).getRewardsSnapshot?.(p).catch(() => null),
      ]);
      const profile = profileRaw ? unwrapSnapshot(profileRaw) : null;

      const recentRewards = Array.isArray(rewardsSnapshot?.recentRewards)
        ? rewardsSnapshot.recentRewards
        : [];
      const transactions: DashboardTransaction[] = recentRewards
        .map((reward: any, index: number) => {
          const raw = Number(reward.amount || 0);
          const amount = raw >= E8S_PER_TOKEN / 1000 ? fromE8s(raw) : raw;
          return {
            id: `reward-${index}-${reward.roundId ?? index}`,
            amount,
            timestamp: Number(reward.timestamp || 0) / 1_000_000 || Date.now(),
          };
        })
        .sort((a: DashboardTransaction, b: DashboardTransaction) => b.timestamp - a.timestamp)
        .slice(0, 5);

      return {
        stats: {
          xp: xpProfile ? toNum(xpProfile.totalXP || 0n) : toNum(profile?.totalXP ?? 0),
          level: xpProfile ? toNum(xpProfile.currentLevel || 1n) : null,
          imera: fromE8s(imeraBalance),
          streak: xpProfile ? toNum(xpProfile.streakDays || 0n) : null,
          todayDistance: todayKm,
          xpToNextLevel: xpProfile ? Math.max(0, toNum(xpProfile.xpToNextLevel || 0n)) : null,
          transactions,
        },
        displayName: profile ? readDisplayName(profile) || profile.username || null : null,
      };
    } catch (e) {
      console.error('Failed to fetch dashboard profile:', e);
      return null;
    }
  }, [principal, getIdentity]);

  const { data: dashboardData, loading: dashboardLoading, refetch } = useCachedData({
    type: 'dashboard_v2',
    identifier: principal || undefined,
    fetcher: fetchDashboardData,
    enabled: !!principal,
    tier: 'bootstrap',
    refetchOnFocus: false,
    refetchOnForeground: false,
    minRefetchIntervalMs: 90_000,
  });

  useEffect(() => {
    if (!principal) {
      startupGate.unlock('guest-home');
      return;
    }
    if (!dashboardData) return;

    setStats((prev) => ({
      ...dashboardData.stats,
      todayDistance: dashboardData.stats.todayDistance ?? prev.todayDistance,
      transactions: dashboardData.stats.transactions ?? prev.transactions,
    }));
    setDisplayName(dashboardData.displayName);
    startupGate.unlock('dashboard');
  }, [principal, dashboardData]);

  useEffect(() => {
    if (principal && !dashboardData && !dashboardLoading) {
      startupGate.unlock('dashboard-empty');
    }
  }, [principal, dashboardData, dashboardLoading]);

  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  // Stable per signed-in rider, so the wallet card does not reload on every render.
  const walletIdentity = useMemo(() => (principal ? getIdentity() : null), [principal, getIdentity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setWalletRefreshKey((k) => k + 1);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const transactions = stats.transactions || [];

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brandPurple}
        />
      }
    >
      <SectionHeader
        title={`${greeting}, ${displayName || username || (isGuest ? 'Guest' : 'Biker')}`}
        subtitle={
          principal
            ? `ID: ${principal.slice(0, 10)}…`
            : isGuest
            ? 'Exploring without signing in'
            : undefined
        }
      />

      <GuestBanner message="Home, Ride, Friends, Ranks, and More all work. Sign in is at the top of More if you want to save rides and rewards." />

      <View style={styles.content}>
        <View>
          {principal && !dashboardData && !dashboardLoading ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Couldn't load stats</Text>
              <Text style={styles.errorSubtext}>Check your connection and try again.</Text>
              <PrimaryButton label="Retry" onPress={() => refetch()} style={styles.retryButton} />
            </View>
          ) : (
            <StatsHero
              distance={principal && stats.todayDistance === null ? '—' : formattedDistance}
              xp={principal && !dashboardData ? '—' : formattedXP}
              imera={principal && !dashboardData ? '—' : formattedImera}
            />
          )}
        </View>

        {principal ? (
          <WalletSummary
            principal={principal}
            identity={walletIdentity}
            refreshKey={walletRefreshKey}
            onOpenWallet={() => navigation.navigate('More', { screen: 'Wallet' })}
          />
        ) : null}

        {/* Quick actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <QuickActions actions={quickActions} />
        </View>

        {/* Wallet View */}
        {!principal ? (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Wallet</Text>
              <Pressable
                onPress={() => navigation.navigate('More', { screen: 'Wallet' })}
                hitSlop={8}
              >
                <Text style={styles.sectionAction}>Open Wallet →</Text>
              </Pressable>
            </View>

            <PressableScale
              onPress={() => navigation.navigate('More', { screen: 'Wallet' })}
              style={styles.walletCardWrap}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel="Open Wallet"
            >
              <LinearGradient
                colors={['rgba(66, 192, 251, 0.16)', 'rgba(26, 159, 224, 0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.walletGradient}
              >
                <View style={styles.walletRow}>
                  <View style={styles.walletLeft}>
                    <Text style={styles.walletLabel}>iMERA Balance</Text>
                    <Text style={styles.walletAmount}>
                      {principal && !dashboardData ? '—' : formattedImera} iMERA
                    </Text>
                    <Text style={styles.walletHint}>
                      {isGuest ? 'Sign in to access your tokens' : 'Available for rides & staking'}
                    </Text>
                  </View>
                  <View style={styles.walletRight}>
                    <View style={styles.walletIconCircle}>
                      <Ionicons name="wallet" size={24} color={colors.brandBlue100} />
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </PressableScale>
          </View>
        ) : null}

        {/* Latest Actions / Transactions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Latest actions</Text>
            {transactions.length > 0 ? (
              <Pressable
                onPress={() => navigation.navigate('More', { screen: 'Wallet' })}
                hitSlop={8}
              >
                <Text style={styles.sectionAction}>View all</Text>
              </Pressable>
            ) : null}
          </View>

          {transactions.length === 0 ? (
            <Card style={styles.emptyActionsCard}>
              <View style={styles.emptyActionsContent}>
                <Ionicons name="receipt-outline" size={32} color={colors.textTertiary} />
                <Text style={styles.emptyActionsTitle}>
                  {isGuest ? 'Sign in to view actions' : 'No recent actions yet'}
                </Text>
                <Text style={styles.emptyActionsSubtitle}>
                  {isGuest
                    ? 'Ride rewards and token activity will appear here once you sign in.'
                    : 'Complete rides to earn iMERA rewards. Your latest transactions will appear here.'}
                </Text>
              </View>
            </Card>
          ) : (
            <Card style={styles.actionsListCard}>
              {transactions.map((tx, idx) => (
                <View
                  key={tx.id}
                  style={[
                    styles.actionItem,
                    idx < transactions.length - 1 && styles.actionItemBorder,
                  ]}
                >
                  <View style={styles.actionIconWrap}>
                    <Ionicons name="gift" size={20} color={colors.success} />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Ride Reward</Text>
                    <Text style={styles.actionTime}>
                      {new Date(tx.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.actionAmount}>
                    +{formatImera(tx.amount)} iMERA
                  </Text>
                </View>
              ))}
            </Card>
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
  sectionContainer: {
    marginTop: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  sectionAction: {
    color: colors.brandBlue100,
    fontWeight: '600',
    fontSize: 14,
  },
  walletCardWrap: {
    borderRadius: radii.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(66, 192, 251, 0.28)',
  },
  walletGradient: {
    borderRadius: radii.xxl,
    padding: 18,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletLeft: {
    flex: 1,
  },
  walletLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  walletAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  walletHint: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  walletRight: {
    marginLeft: 14,
  },
  walletIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(66, 192, 251, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66, 192, 251, 0.3)',
  },
  emptyActionsCard: {
    marginTop: 4,
  },
  emptyActionsContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  emptyActionsTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyActionsSubtitle: {
    color: colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionsListCard: {
    marginTop: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border1,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionTime: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  actionAmount: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },
});
