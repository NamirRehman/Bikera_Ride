import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, Text, View, StyleSheet, ScrollView, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Principal } from '@dfinity/principal';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { colors } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { getBikeraValidatorActor } from '../utils/actors';
import { fetchPeriodEarnings, fetchRideMatchRows, type RideMatchRow } from '../services/rideMatch';
import type { RouteActivity, RouteSummary } from '../declarations/bikera_validator/bikera_validator.did';
import { useCachedData } from '../hooks/useCachedData';
import { LoadingBlock } from '../components/LoadingBlock';
import { ListSkeleton } from '../components/ListSkeleton';
import { GuestBanner } from '../components/GuestBanner';
import { PressableScale } from '../components/motion';
import { formatDistanceKm, formatImeraTokens, formatXP, rideDurationSeconds } from '../utils/formatStats';
import { VerifiedRidesPanel } from '../components/verified-rides-panel';

interface RideHistory {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  xpEarned: number;
  imeraEarned: number;
  routeType: 'bike' | 'walk' | 'run';
}

type ActivityFilter = 'all' | 'bike' | 'walk' | 'run';
type TimeFilter = 'week' | 'month' | 'year';

// Limit canister responses so history loads quickly (load in small batches)
const HISTORY_PAGE_SIZE = 20;
const PERIOD_DAYS = { week: 7, month: 30, year: 365 } as const;
const ROUTE_ACTIVITY: Record<ActivityFilter, [] | [RouteActivity]> = {
  all: [], walk: [{ Walk: null }], run: [{ Run: null }], bike: [{ Bike: null }],
};
type HistoryPage = { scope: string; rides: RideHistory[]; distance: number; hasMore: boolean };

function lowerBound(items: RideMatchRow[], target: number): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].time < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function sumWindow(
  items: RideMatchRow[],
  start: number,
  end: number,
  accept?: (item: RideMatchRow) => boolean
): number {
  let sum = 0;
  for (let i = lowerBound(items, start); i < items.length; i += 1) {
    const item = items[i];
    if (item.time > end) break;
    if (!accept || accept(item)) sum += item.amount;
  }
  return sum;
}

function mapRoute(r: RouteSummary, xpEarned = 0, imeraEarned = 0): RideHistory {
  const createdAt = Number(r.createdAt || 0n) / 1_000_000;
  const distance = Number(r.totalDistance || 0n);
  const avgSpeed = Number(r.avgSpeed || 0n);
  const calculatedXP = distance > 0 ? Math.floor(distance / 1000) : 0;
  let routeType: 'bike' | 'walk' | 'run' = 'bike';
  if (avgSpeed < 5) routeType = 'walk';
  else if (avgSpeed < 15) routeType = 'run';

  return {
    id: String(r.routeId || ''),
    date: new Date(createdAt).toISOString(),
    distance: distance / 1000,
    duration: rideDurationSeconds(r.duration),
    avgSpeed,
    maxSpeed: Number(r.maxSpeed || 0n),
    xpEarned: xpEarned > 0 ? xpEarned : calculatedXP,
    imeraEarned,
    routeType,
  };
}

export function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { principal, isGuest } = useAuth();
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('year');
  const [refreshing, setRefreshing] = useState(false);
  const [evidenceRefresh, setEvidenceRefresh] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [previousPage, setPreviousPage] = useState<HistoryPage | null>(null);
  const historyScope = [principal, 'routes', timeFilter, filter].join(':');

  const fetchHistoryData = useCallback(async (): Promise<HistoryPage> => {
    const snapshot: HistoryPage = { scope: historyScope, rides: [], distance: 0, hasMore: false };
    if (!principal) return snapshot;
    const rider = Principal.fromText(principal);
    const sinceMs = Date.now() - PERIOD_DAYS[timeFilter] * 86_400_000;
    const since: [bigint] = [BigInt(sinceMs) * 1_000_000n];
    const validator = getBikeraValidatorActor();
    const rows: RouteSummary[] = [];
    let offset = 0;
    let total = 0;
    while (offset < historyLimit) {
      const page = await validator.getUserRoutePage(
        rider, since, ROUTE_ACTIVITY[filter], BigInt(offset), BigInt(Math.min(50, historyLimit - offset))
      );
      total = Number(page.total);
      snapshot.distance = Number(page.totalDistance) / 1_000;
      rows.push(...page.rows.filter((route) => route.isValid));
      offset += page.rows.length;
      if (!page.rows.length || offset >= total) break;
    }
    snapshot.hasMore = offset < total;
    if (!rows.length) return snapshot;

    const oldest = Number(rows[rows.length - 1].createdAt / 1_000_000n);
    const newest = Number(rows[0].createdAt / 1_000_000n);
    const matched = await fetchRideMatchRows(rider, oldest, newest);
    const xp = matched.xp.sort((a, b) => a.time - b.time);
    const rewards = matched.rewards.sort((a, b) => a.time - b.time);
    snapshot.rides = rows.map((route) => {
      const created = Number(route.createdAt / 1_000_000n);
      const distance = Number(route.totalDistance);
      const start = created - 5 * 60_000;
      const end = created + 5 * 60_000;
      const xpEarned = sumWindow(xp, start, end, (tx) =>
        tx.distance !== undefined && Math.abs(tx.distance - distance) <= distance * 0.1
      );
      return mapRoute(route, xpEarned, sumWindow(rewards, start, end + 5 * 60_000));
    });
    return snapshot;
  }, [principal, historyScope, historyLimit, filter, timeFilter]);

  const { data: historyData, loading: historyLoading, refetch, error: historyError } = useCachedData({
    type: 'history',
    identifier: [historyScope, historyLimit].join(':'),
    fetcher: fetchHistoryData,
    enabled: !!principal,
    tier: 'normal',
    refetchOnFocus: true,
    refetchOnForeground: true,
    minRefetchIntervalMs: 90_000,
  });
  const fetchEarnings = useCallback(async () => {
    if (!principal) return null;
    const now = Date.now();
    return fetchPeriodEarnings(Principal.fromText(principal), now - PERIOD_DAYS[timeFilter] * 86_400_000, now);
  }, [principal, timeFilter]);
  const { data: earnings, refetch: refreshEarnings } = useCachedData({
    type: 'history',
    identifier: [principal, 'earnings', timeFilter].join(':'),
    fetcher: fetchEarnings,
    enabled: !!principal,
    tier: 'normal',
    refetchOnFocus: true,
    refetchOnForeground: true,
  });

  useEffect(() => {
    if (historyData?.scope === historyScope) setPreviousPage(historyData);
  }, [historyData, historyScope]);

  const page = historyData?.scope === historyScope ? historyData
    : previousPage?.scope === historyScope ? previousPage : null;
  const rides = page?.rides ?? [];
  const hasMore = page?.hasMore ?? false;

  useEffect(() => {
    setHistoryLimit(HISTORY_PAGE_SIZE);
  }, [principal, timeFilter, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setEvidenceRefresh((value) => value + 1);
    try {
      await Promise.all([refetch(), refreshEarnings()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshEarnings]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || historyLoading) return;
    setHistoryLimit((prev) => prev + HISTORY_PAGE_SIZE);
  }, [hasMore, historyLoading]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getRouteIcon = (type: string) => {
    switch (type) {
      case 'bike':
        return '🚴';
      case 'walk':
        return '🚶';
      case 'run':
        return '🏃';
      default:
        return '🚴';
    }
  };

  const getRouteColor = (type: string): string[] => {
    switch (type) {
      case 'bike':
        return [colors.brandPurple, colors.brandViolet];
      case 'walk':
        return ['#34d399', '#10b981'];
      case 'run':
        return ['#fb923c', '#f97316'];
      default:
        return [colors.brandPurple, colors.brandViolet];
    }
  };

  const isInitialLoading = historyLoading && rides.length === 0;

  const renderRideItem = useCallback(({ item }: { item: RideHistory }) => (
    <Card style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={styles.rideHeaderLeft}>
          <View style={[styles.routeIconContainer, { backgroundColor: getRouteColor(item.routeType)[0] + '20' }]}>
            <Text style={styles.routeIcon}>{getRouteIcon(item.routeType)}</Text>
          </View>
          <View>
            <Text style={styles.rideType}>{item.routeType.charAt(0).toUpperCase() + item.routeType.slice(1)} Ride</Text>
            <Text style={styles.rideDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.rideRewards}>
          <Text style={styles.xpText}>+{formatXP(item.xpEarned)} XP</Text>
          <Text style={styles.rewardSeparator}>•</Text>
          <Text style={styles.imeraText}>+{formatImeraTokens(item.imeraEarned)} iMERA</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{formatDistanceKm(item.distance)} km</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Duration</Text>
          <Text style={styles.statValue}>{formatDuration(item.duration)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg Speed</Text>
          <Text style={styles.statValue}>{item.avgSpeed.toFixed(1)} km/h</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Max Speed</Text>
          <Text style={styles.statValue}>{item.maxSpeed.toFixed(1)} km/h</Text>
        </View>
      </View>
    </Card>
  ), [getRouteColor, getRouteIcon, formatDate, formatDuration]);

  const listHeader = useMemo(() => (
    <View style={styles.listHeader}>
      <SectionHeader title="Ride History" subtitle="Track your progress and achievements" />
      <GuestBanner compact message="Guest and private rides stay on this device. Open Ride files to export them." />
      <VerifiedRidesPanel refreshKey={evidenceRefresh} />

      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <LinearGradient
            colors={[colors.brandPurple + '1A', colors.brandViolet + '1A']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel} numberOfLines={1}>Distance</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatDistanceKm(page?.distance ?? 0)}
            </Text>
            <Text style={styles.summaryUnit}>km</Text>
          </LinearGradient>
        </Card>
        <Card style={styles.summaryCard}>
          <LinearGradient
            colors={['#34d3991A', '#10b9811A']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel} numberOfLines={1}>XP</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {earnings ? formatXP(earnings.xp) : '—'}
            </Text>
            <Text style={styles.summaryUnit}>XP</Text>
          </LinearGradient>
        </Card>
        <Card style={styles.summaryCard}>
          <LinearGradient
            colors={['#fbbf241A', '#f59e0b1A']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel} numberOfLines={1}>iMERA</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {earnings ? formatImeraTokens(earnings.imera) : '—'}
            </Text>
            <Text style={styles.summaryUnit}>iMERA</Text>
          </LinearGradient>
        </Card>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {(['all', 'bike', 'walk', 'run'] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterButton,
                  filter === f && styles.filterButtonActive
                ]}
              >
                {filter === f ? (
                  <LinearGradient
                    colors={[colors.brandPurple, colors.brandBlue300]}
                    style={styles.filterGradient}
                  >
                    <Text style={styles.filterButtonTextActive}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.filterButtonText}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {(['week', 'month', 'year'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTimeFilter(t)}
                style={[
                  styles.filterButton,
                  styles.timeFilterButton,
                  timeFilter === t && styles.timeFilterButtonActive
                ]}
              >
                <Text style={[
                  styles.filterButtonText,
                  timeFilter === t && styles.timeFilterButtonTextActive
                ]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  ), [page?.distance, earnings, filter, timeFilter, evidenceRefresh]);

  const listFooter = useMemo(
    () => (
      <View style={styles.listFooter}>
        {historyLoading && rides.length > 0 ? (
          <LoadingBlock message="Loading more…" color={colors.brandPurple} />
        ) : hasMore ? (
          <Pressable
            style={({ pressed }) => [styles.loadMoreButton, pressed && { opacity: 0.9 }]}
            onPress={handleLoadMore}
            accessibilityLabel="Load more rides"
            accessibilityRole="button"
          >
            <Text style={styles.loadMoreText}>Load more rides</Text>
          </Pressable>
        ) : (
          <View style={styles.footerSpacer} />
        )}
      </View>
    ),
    [historyLoading, rides.length, hasMore, handleLoadMore]
  );

  return (
    <Screen scroll={false} animate={false} contentStyle={{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }}>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          isInitialLoading ? (
            <ListSkeleton rows={4} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="bicycle-outline" size={48} color={colors.textTertiary} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>{isGuest ? 'No synced rides yet' : 'No rides yet'}</Text>
              <Text style={styles.emptySubtext}>
                {isGuest ? 'Record a guest ride from Track, or sign in from More to sync history.' : historyError ? 'Could not load your history. Pull down to retry.' : 'Shared rides appear here after processing.'}
              </Text>
              <PressableScale
                style={styles.emptyCtaButton}
                scaleTo={0.96}
                onPress={() => navigation.navigate('Track')}
                accessibilityLabel="Record a ride"
                accessibilityRole="button"
              >
                <Text style={styles.emptyCtaText}>Record a ride</Text>
              </PressableScale>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={hasMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        initialNumToRender={HISTORY_PAGE_SIZE}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    paddingTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listFooter: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 16,
    borderRadius: 16,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  summaryUnit: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  filtersContainer: {
    marginBottom: 20,
    gap: 12,
  },
  filterScroll: {
    marginHorizontal: -4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  filterButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 60,
  },
  filterButtonActive: {
    // Handled by gradient
  },
  filterGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timeFilterButton: {
    backgroundColor: colors.surface2,
  },
  timeFilterButtonActive: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.brandPurple + '80',
  },
  timeFilterButtonTextActive: {
    color: colors.textPrimary,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border1,
    backgroundColor: colors.surfaceCard,
  },
  loadMoreText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  footerSpacer: {
    height: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    color: colors.textTertiary,
    fontSize: 14,
    marginBottom: 8,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyCtaButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.brandPurple,
  },
  emptyCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  rideCard: {
    marginBottom: 16,
    padding: 16,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rideHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  routeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeIcon: {
    fontSize: 24,
  },
  rideType: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  rideDate: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  rideRewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  rewardSeparator: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  imeraText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
