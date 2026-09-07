import React, { useState, useEffect, useCallback } from 'react';
import { Pressable, Text, View, StyleSheet, ScrollView, FlatList, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Principal } from '@dfinity/principal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { colors } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { getBikeraXpActor, getBikeraUserActor } from '../utils/actors';
import { useCachedData } from '../hooks/useCachedData';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { useToastHelpers } from '../contexts/ToastContext';
import { fetchPublicUserSummary } from '../services/userSummary';
import { runInBatches } from '../utils/batch';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  distance: number;
  xp: number;
  level: number;
  avatar?: string;
  isCurrentUser?: boolean;
}

type LeaderboardFilter = 'distance' | 'xp' | 'level';
type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'allTime';
const LEADERBOARD_PAGE_SIZE = 10;
const SUMMARY_BATCH_SIZE = 6;

export function LeaderboardScreen() {
  const { principal } = useAuth();
  const { error } = useToastHelpers();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<LeaderboardFilter>('xp');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('allTime');
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState(LEADERBOARD_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);

  const effectiveFilter: LeaderboardFilter = timeFilter === 'allTime' ? filter : 'xp';

  const fetchLeaderboardData = useCallback(async () => {
    try {
      const xpActor = getBikeraXpActor();
      const limit = visibleCount;

      const timeFilterMap: any = {
        'allTime': { AllTime: null },
        'daily': { Daily: null },
        'weekly': { Weekly: null },
        'monthly': { Monthly: null },
      };

      const backendTimeFilter = timeFilterMap[timeFilter] || timeFilterMap['allTime'];
      const currentPrincipalText = principal || (await AsyncStorage.getItem('bikera_principal')) || '';

      let leaderboardData: Array<[Principal, any]> = [];
      let isDistanceLeaderboard = false;

      if (timeFilter === 'allTime' && filter === 'distance') {
        const userActor = getBikeraUserActor();
        leaderboardData = await userActor.getLeaderboard(BigInt(limit));
        isDistanceLeaderboard = true;
      } else {
        leaderboardData = await xpActor.getLeaderboardWithFilter(BigInt(limit), backendTimeFilter);
      }

      if (!leaderboardData || leaderboardData.length === 0) {
        return { entries: [], userRank: null, totalUsers: 0, hasMore: false };
      }

      const profiles = await runInBatches(
        leaderboardData,
        SUMMARY_BATCH_SIZE,
        async ([userId, amount]) => {
          const userIdText = userId.toText();
          const summary = await fetchPublicUserSummary(userId);
          const isCurrentUser = currentPrincipalText ? userIdText === currentPrincipalText : false;
          const distanceKm = isDistanceLeaderboard ? Number(amount || 0n) / 1000 : (summary.distance ?? 0);
          const xpAmount = isDistanceLeaderboard ? (summary.xp ?? 0) : Number(amount);
          return {
            userId: userIdText,
            username: summary.username || `User${userIdText.slice(0, 8)}`,
            xp: xpAmount,
            level: summary.level ?? 1,
            distance: distanceKm,
            avatar: summary.avatar,
            isCurrentUser,
          };
        }
      );

      // Sort by filter
      let sortedProfiles = [...profiles];
      if (effectiveFilter === 'distance') {
        sortedProfiles.sort((a, b) => b.distance - a.distance);
      } else if (effectiveFilter === 'level') {
        sortedProfiles.sort((a, b) => b.level - a.level || b.xp - a.xp);
      } else {
        sortedProfiles.sort((a, b) => b.xp - a.xp);
      }

      const rankedEntries: LeaderboardEntry[] = sortedProfiles.map((profile, index) => ({
        rank: index + 1,
        userId: profile.userId,
        username: profile.username,
        xp: profile.xp,
        level: profile.level,
        distance: profile.distance,
        avatar: profile.avatar,
        isCurrentUser: profile.isCurrentUser,
      }));

      // Find current user's rank (only accurate when they're in the loaded top list)
      let userRank: number | null = null;
      const currentUserEntry = rankedEntries.find(e => e.isCurrentUser);
      if (currentUserEntry) {
        userRank = currentUserEntry.rank;
      }
      // If user not in top N, we don't fetch extra just for rank (would add latency); show "--"

      return {
        entries: rankedEntries,
        userRank,
        totalUsers: rankedEntries.length,
        hasMore: leaderboardData.length >= limit,
      };
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
      error('Leaderboard Error', 'Failed to load rankings.');
      return {
        entries: [],
        userRank: null,
        totalUsers: 0,
        hasMore: false,
      };
    }
  }, [filter, effectiveFilter, timeFilter, principal, visibleCount]);

  const { data: leaderboardData, loading: leaderboardLoading } = useCachedData({
    type: 'leaderboard',
    identifier: `${filter}:${timeFilter}:${visibleCount}`,
    fetcher: fetchLeaderboardData,
    enabled: true,
  });

  useEffect(() => {
    if (leaderboardData) {
      setEntries(leaderboardData.entries);
      setUserRank(leaderboardData.userRank);
      setTotalUsers(leaderboardData.totalUsers);
      setHasMore(Boolean(leaderboardData.hasMore));
      setLoading(false);
    } else if (!leaderboardLoading) {
      setLoading(false);
    }
  }, [leaderboardData, leaderboardLoading]);

  useEffect(() => {
    if (entries.length === 0) {
      setLoading(leaderboardLoading);
    }
  }, [leaderboardLoading, entries.length]);

  useEffect(() => {
    setVisibleCount(LEADERBOARD_PAGE_SIZE);
    setHasMore(true);
  }, [filter, timeFilter]);

  useEffect(() => {
    if (timeFilter !== 'allTime' && filter !== 'xp') {
      setFilter('xp');
    }
  }, [timeFilter, filter]);

  const getRankColor = (rank: number): string[] => {
    switch (rank) {
      case 1: return ['#facc15', '#eab308'];
      case 2: return ['#d1d5db', '#9ca3af'];
      case 3: return ['#fb923c', '#f97316'];
      default: return [colors.brandPurple, colors.brandViolet];
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const isInitialLoading = loading && entries.length === 0;

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setVisibleCount((prev) => prev + LEADERBOARD_PAGE_SIZE);
  }, [hasMore, loading]);

  const renderEntryItem = useCallback(({ item }: { item: LeaderboardEntry }) => (
    <View
      style={[
        styles.entryCard,
        item.isCurrentUser && styles.currentUserCard
      ]}
    >
      <View style={styles.rankContainer}>
        {item.rank <= 3 ? (
          <LinearGradient
            colors={getRankColor(item.rank) as any}
            style={styles.rankBadge}
          >
            <Text style={styles.rankIcon}>{getRankIcon(item.rank) || item.rank}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.rankNumber}>#{item.rank}</Text>
        )}
      </View>

      <View style={[styles.avatarCircle, { backgroundColor: colors.brandPurple }]}>
        <Text style={styles.avatarInitials}>{item.username.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName} numberOfLines={1}>{item.username}</Text>
          {item.isCurrentUser && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </View>
        <Text style={styles.userLevel}>Level {item.level}</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.mainStat}>
          {filter === 'distance' && `${item.distance.toFixed(1)} km`}
          {filter === 'xp' && `${item.xp.toLocaleString()} XP`}
          {filter === 'level' && `Lvl ${item.level}`}
        </Text>
        <Text style={styles.subStat}>{item.xp.toLocaleString()} XP</Text>
      </View>
    </View>
  ), [filter, getRankColor, getRankIcon]);

  const listHeader = (
    <View style={styles.listHeader}>
      <SectionHeader title="Leaderboard" subtitle="Compete with riders worldwide" />

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {(['distance', 'xp', 'level'] as LeaderboardFilter[]).map((f) => {
              const disabled = timeFilter !== 'allTime' && f !== 'xp';
              return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                disabled={disabled}
                style={[
                  styles.filterButton,
                  filter === f && styles.filterButtonActive,
                  disabled && styles.filterButtonDisabled,
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
            );
            })}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {(['daily', 'weekly', 'monthly', 'allTime'] as TimeFilter[]).map((t) => (
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
                  {t === 'allTime' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {timeFilter !== 'allTime' && (
          <Text style={styles.filterHint}>Time filters apply to XP rankings only.</Text>
        )}
      </View>
    </View>
  );

  const listFooter = (
    <View style={styles.listFooter}>
      {loading && entries.length > 0 ? (
        <View style={styles.loadingContainer}>
          <ThreeDotLoader color={colors.brandPurple} size="large" />
          <Text style={styles.loadingText}>Loading more…</Text>
        </View>
      ) : hasMore ? (
        <Pressable
          style={({ pressed }) => [styles.loadMoreButton, pressed && { opacity: 0.9 }]}
          onPress={handleLoadMore}
          accessibilityLabel="Load more"
          accessibilityRole="button"
        >
          <Text style={styles.loadMoreText}>Load more</Text>
        </Pressable>
      ) : (
        <View style={styles.footerSpacer} />
      )}

      {principal && (
        <View style={styles.userPositionCard}>
          <LinearGradient
            colors={[colors.brandPurple + '1A', colors.brandBlue300 + '1A']}
            style={styles.userPositionGradient}
          >
            <View>
              <Text style={styles.userPositionTitle}>Your Position</Text>
              <Text style={styles.userPositionSubtitle}>Keep riding to climb the ranks!</Text>
            </View>
            <View style={styles.userPositionRank}>
              <Text style={styles.userPositionRankNumber}>
                {userRank !== null ? `#${userRank}` : '--'}
              </Text>
              <Text style={styles.userPositionTotal}>
                of {totalUsers} {totalUsers === 1 ? 'rider' : 'riders'}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );

  return (
    <Screen scroll={false} contentClassName={{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={renderEntryItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          isInitialLoading ? (
            <View style={styles.loadingContainer}>
              <ThreeDotLoader color={colors.brandPurple} size="large" />
              <Text style={styles.loadingText}>Loading rankings...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>Start riding to appear on the leaderboard</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        onEndReached={hasMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        initialNumToRender={LEADERBOARD_PAGE_SIZE}
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
    minWidth: 70,
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
  filterButtonDisabled: {
    opacity: 0.5,
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
  filterHint: {
    color: colors.textTertiary,
    fontSize: 12,
    paddingHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listFooter: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
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
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border1,
    gap: 12,
  },
  currentUserCard: {
    backgroundColor: colors.brandPurple + '1A',
    borderColor: colors.brandPurple + '4D',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  youBadge: {
    backgroundColor: colors.brandPurple + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    color: colors.brandPurple,
    fontSize: 11,
    fontWeight: '700',
  },
  userLevel: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  mainStat: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subStat: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  userPositionCard: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.brandPurple + '4D',
  },
  userPositionGradient: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userPositionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  userPositionSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  userPositionRank: {
    alignItems: 'flex-end',
  },
  userPositionRankNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.brandPurple,
    marginBottom: 2,
  },
  userPositionTotal: {
    color: colors.textTertiary,
    fontSize: 12,
  },
});
