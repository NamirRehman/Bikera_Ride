import React, { useState, useEffect, useCallback } from 'react';
import { Pressable, Text, View, StyleSheet, ScrollView, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Principal } from '@dfinity/principal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { SectionHeader } from '../components/SectionHeader';
import { colors } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { getBikeraValidatorActor, getBikeraXpActor, getBikeraRewardsActor } from '../utils/actors';
import { useCachedData } from '../hooks/useCachedData';
import { LoadingBlock } from '../components/LoadingBlock';
import { useToastHelpers } from '../contexts/ToastContext';

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
const MIN_XP_TRANSACTIONS = 80;
const MIN_REWARDS = 80;

export function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { principal } = useAuth();
  const { error } = useToastHelpers();
  const [rides, setRides] = useState<RideHistory[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('year');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistoryData = useCallback(async () => {
    try {
      const pText = principal || (await AsyncStorage.getItem('bikera_principal')) || '';
      if (!pText) {
        return [];
      }
      const p = Principal.fromText(pText);

      // Fetch route history and related data with limits (unbounded [] was very slow)
      const validatorActor: any = getBikeraValidatorActor();
      const routeLimit = historyLimit;
      const xpLimit = Math.max(MIN_XP_TRANSACTIONS, historyLimit * 3);
      const rewardsLimit = Math.max(MIN_REWARDS, historyLimit * 3);
      const [routeHistory, xpTransactions, allRewards] = await Promise.all([
        validatorActor.getUserRouteHistory(p, [BigInt(routeLimit)]),
        getBikeraXpActor().getXPTransactions(p, [BigInt(xpLimit)]),
        getBikeraRewardsActor().getUserRewards(p, [BigInt(rewardsLimit)]),
      ]);

      // Filter routes and apply time filter
      const now = Date.now();
      const timeFilterMs = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      }[timeFilter] || Infinity;

      const validRoutes = (routeHistory || []).filter((r: any) => {
        const isValid = r.isValid === true || r.isValid === 1;
        const createdAt = Number(r.createdAt || 0n) / 1_000_000;
        const routeAge = now - createdAt;
        return isValid && routeAge <= timeFilterMs;
      });

      // Map routes with accurate XP and iMERA calculations
      const mapped: RideHistory[] = validRoutes.map((r: any) => {
        const routeId = String(r.routeId || '');
        const createdAt = Number(r.createdAt || 0n) / 1_000_000;
        const distance = Number(r.totalDistance || 0n);
        const duration = Number(r.duration || 0n);
        const avgSpeed = Number(r.avgSpeed || 0n);
        const maxSpeed = Number(r.maxSpeed || 0n);

        const routeTime = createdAt;
        const routeStartWindow = routeTime - (5 * 60 * 1000);
        const routeEndWindow = routeTime + (5 * 60 * 1000);

        // Find matching XP transactions
        const matchingXPTransactions = (xpTransactions || []).filter((tx: any) => {
          const txTime = Number(tx.timestamp || 0n) / 1_000_000;
          if (txTime < routeStartWindow || txTime > routeEndWindow) return false;
          if (tx.reason && typeof tx.reason === 'object' && 'Distance' in tx.reason) {
            const txDistance = Number(tx.reason.Distance || 0n);
            return Math.abs(txDistance - distance) <= (distance * 0.1);
          }
          return false;
        });

        const xpEarned = matchingXPTransactions.reduce((sum: number, tx: any) => {
          return sum + Number(tx.amount || 0n);
        }, 0);

        const calculatedXP = distance > 0 ? Math.floor(distance / 1000) : 0;
        const finalXP = xpEarned > 0 ? xpEarned : calculatedXP;

        // Find matching iMERA rewards
        const matchingRewards = (allRewards || []).filter((reward: any) => {
          const rewardTime = Number(reward.timestamp || 0n) / 1_000_000;
          return rewardTime >= routeStartWindow && rewardTime <= (routeEndWindow + 5 * 60 * 1000);
        });

        const imeraEarned = matchingRewards.reduce((sum: number, reward: any) => {
          return sum + (Number(reward.amount || 0n) / 100000000);
        }, 0);

        // Determine route type based on average speed
        let routeType: 'bike' | 'walk' | 'run' = 'bike';
        if (avgSpeed < 5) {
          routeType = 'walk';
        } else if (avgSpeed >= 5 && avgSpeed < 15) {
          routeType = 'run';
        }

        return {
          id: routeId,
          date: new Date(createdAt).toISOString(),
          distance: distance / 1000,
          duration: duration,
          avgSpeed: avgSpeed,
          maxSpeed: maxSpeed,
          xpEarned: finalXP,
          imeraEarned: imeraEarned,
          routeType: routeType,
        };
      });

      // Sort by date (newest first)
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return mapped;
    } catch (e) {
      console.error('Failed to fetch history:', e);
      error('History Error', 'Failed to load your ride history.');
      return [];
    }
  }, [principal, timeFilter, historyLimit]);

  const { data: historyData, loading: historyLoading, refetch } = useCachedData({
    type: 'history',
    identifier: principal ? `${principal}:${timeFilter}:${historyLimit}` : undefined,
    fetcher: fetchHistoryData,
    enabled: !!principal,
  });

  // Apply activity type filter to cached data
  useEffect(() => {
    if (historyData) {
      const filtered = filter === 'all'
        ? historyData
        : historyData.filter(r => r.routeType === filter);
      setRides(filtered);
      setHasMore(historyData.length >= historyLimit);
      setLoading(false);
    } else if (!historyLoading && principal) {
      setLoading(false);
    }
  }, [historyData, historyLoading, filter, principal]);

  useEffect(() => {
    setLoading(historyLoading);
  }, [historyLoading]);

  useEffect(() => {
    setHistoryLimit(HISTORY_PAGE_SIZE);
    setHasMore(true);
  }, [timeFilter, principal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHistoryLimit(HISTORY_PAGE_SIZE);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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

  const totalStats = rides.reduce((acc, ride) => ({
    distance: acc.distance + ride.distance,
    xp: acc.xp + ride.xpEarned,
    imera: acc.imera + ride.imeraEarned,
  }), { distance: 0, xp: 0, imera: 0 });

  const isInitialLoading = loading && rides.length === 0;

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
          <Text style={styles.xpText}>+{item.xpEarned} XP</Text>
          <Text style={styles.rewardSeparator}>•</Text>
          <Text style={styles.imeraText}>+{item.imeraEarned.toFixed(1)} iMERA</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{item.distance.toFixed(1)} km</Text>
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

  const listHeader = (
    <View style={styles.listHeader}>
      <SectionHeader title="Ride History" subtitle="Track your progress and achievements" />

      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <LinearGradient
            colors={[colors.brandPurple + '1A', colors.brandViolet + '1A']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Total Distance</Text>
            <Text style={styles.summaryValue}>
              {totalStats.distance.toFixed(1)} <Text style={styles.summaryUnit}>km</Text>
            </Text>
          </LinearGradient>
        </Card>
        <Card style={styles.summaryCard}>
          <LinearGradient
            colors={['#34d3991A', '#10b9811A']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Total XP</Text>
            <Text style={styles.summaryValue}>
              {totalStats.xp.toLocaleString()} <Text style={styles.summaryUnit}>XP</Text>
            </Text>
          </LinearGradient>
        </Card>
        <Card style={styles.summaryCard}>
          <LinearGradient
            colors={['#fbbf241A', '#f59e0b1A']}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryLabel}>Total iMERA</Text>
            <Text style={styles.summaryValue}>
              {totalStats.imera.toFixed(1)} <Text style={styles.summaryUnit}>iMERA</Text>
            </Text>
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
  );

  const listFooter = (
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
  );

  return (
    <Screen scroll={false} contentClassName={{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }}>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        renderItem={renderRideItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          isInitialLoading ? (
            <LoadingBlock message="Loading…" color={colors.brandPurple} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="bicycle-outline" size={48} color={colors.textTertiary} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No rides yet</Text>
              <Text style={styles.emptySubtext}>Record your first ride to see it here</Text>
              <Pressable
                style={({ pressed }) => [styles.emptyCtaButton, pressed && { opacity: 0.9 }]}
                onPress={() => navigation.navigate('Track')}
                accessibilityLabel="Record a ride"
                accessibilityRole="button"
              >
                <Text style={styles.emptyCtaText}>Record a ride</Text>
              </Pressable>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={hasMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        initialNumToRender={HISTORY_PAGE_SIZE}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android' || Platform.OS === 'ios'}
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
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryUnit: {
    fontSize: 14,
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
