import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Principal } from '@dfinity/principal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

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
import {
  COUNTRY_OPTIONS,
  countryName,
  countryFlag,
  getStoredCountry,
  saveUserCountry,
} from '../services/userCountry';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  distance: number;
  xp: number;
  level: number;
  avatar?: string;
  country?: string;
  isCurrentUser?: boolean;
  isFriend?: boolean;
}

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'allTime';
const LEADERBOARD_PAGE_SIZE = 10;
const SUMMARY_BATCH_SIZE = 6;
const GLOBAL_LIMIT = 40;

function assertCanisterOk(result: any, fallback = 'Request failed'): void {
  if (result && typeof result === 'object' && 'err' in result) {
    const err = (result as { err: unknown }).err;
    throw new Error(typeof err === 'string' ? err : String(err ?? fallback));
  }
}

export function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const { principal, isGuest, getIdentity } = useAuth();
  const { error, success } = useToastHelpers();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('allTime');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [countryOnly, setCountryOnly] = useState(false);
  const [myCountry, setMyCountry] = useState<string | null>(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState(LEADERBOARD_PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    void getStoredCountry().then(setMyCountry);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void getStoredCountry().then((stored) => {
        if (!active) return;
        setMyCountry(stored);
        if (!stored) {
          setCountryOnly(false);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const fetchLeaderboardData = useCallback(async () => {
    try {
      const xpActor = getBikeraXpActor();
      const userActor = getBikeraUserActor();
      const currentPrincipalText = principal || (await AsyncStorage.getItem('bikera_principal')) || '';
      const storedCountry = (await getStoredCountry()) || myCountry;

      const timeFilterMap: Record<TimeFilter, { AllTime: null } | { Daily: null } | { Weekly: null } | { Monthly: null }> = {
        allTime: { AllTime: null },
        daily: { Daily: null },
        weekly: { Weekly: null },
        monthly: { Monthly: null },
      };
      const backendTimeFilter = timeFilterMap[timeFilter] || timeFilterMap.allTime;

      let friendSet = new Set<string>();
      if (currentPrincipalText) {
        try {
          const friendIdsRaw = await userActor.getFriends(Principal.fromText(currentPrincipalText));
          friendSet = new Set(
            (Array.isArray(friendIdsRaw) ? friendIdsRaw : []).map((id: any) =>
              id?.toText ? id.toText() : String(id)
            )
          );
        } catch {
          friendSet = new Set();
        }
      }

      const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          promise,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);

      type RawRow = { userId: Principal; xpHint?: number };
      let rows: RawRow[] = [];

      if (friendsOnly) {
        // Strict friends-only: never fall back to the global board
        if (!currentPrincipalText) {
          return { entries: [], userRank: null, totalUsers: 0, hasMore: false };
        }
        if (friendSet.size === 0) {
          // No friends yet — show empty (not world rankings, not just yourself)
          return { entries: [], userRank: null, totalUsers: 0, hasMore: false };
        }
        rows = Array.from(friendSet).map((id) => ({ userId: Principal.fromText(id) }));
        if (!friendSet.has(currentPrincipalText)) {
          rows.push({ userId: Principal.fromText(currentPrincipalText) });
        }
      } else {
        const leaderboardData = await xpActor.getLeaderboardWithFilter(
          BigInt(GLOBAL_LIMIT),
          backendTimeFilter
        );
        rows = (leaderboardData || []).map(([userId, amount]: [Principal, any]) => ({
          userId,
          xpHint: Number(amount || 0),
        }));
      }

      if (rows.length === 0) {
        return { entries: [], userRank: null, totalUsers: 0, hasMore: false };
      }

      const profiles = await runInBatches(rows, SUMMARY_BATCH_SIZE, async (row) => {
        const userIdText = row.userId.toText();
        const fallback = {
          userId: userIdText,
          username: `User${userIdText.slice(0, 8)}`,
          xp: row.xpHint ?? 0,
          level: 1,
          distance: 0,
          avatar: undefined as string | undefined,
          country: undefined as string | undefined,
          isCurrentUser: currentPrincipalText ? userIdText === currentPrincipalText : false,
          isFriend: friendSet.has(userIdText),
        };
        try {
          const summary = await withTimeout(
            fetchPublicUserSummary(row.userId),
            2500,
            {
              userId: userIdText,
              username: fallback.username,
              level: 1,
              xp: row.xpHint ?? 0,
              distance: 0,
            }
          );
          return {
            userId: userIdText,
            username: summary.username || fallback.username,
            xp: friendsOnly ? (summary.xp ?? 0) : (row.xpHint ?? summary.xp ?? 0),
            level: summary.level ?? 1,
            distance: summary.distance ?? 0,
            avatar: summary.avatar,
            country: summary.country,
            isCurrentUser: fallback.isCurrentUser,
            isFriend: fallback.isFriend,
          };
        } catch {
          return fallback;
        }
      });

      let filtered = profiles;
      if (countryOnly) {
        if (!storedCountry) {
          return { entries: [], userRank: null, totalUsers: 0, hasMore: false, needsCountry: true as const };
        }
        filtered = profiles.filter(
          (p) => p.isCurrentUser || (p.country && p.country.toUpperCase() === storedCountry.toUpperCase())
        );
      }

      filtered.sort((a, b) => b.xp - a.xp || b.level - a.level);

      const rankedEntries: LeaderboardEntry[] = filtered.map((profile, index) => ({
        rank: index + 1,
        userId: profile.userId,
        username: profile.username,
        xp: profile.xp,
        level: profile.level,
        distance: profile.distance,
        avatar: profile.avatar,
        country: profile.country,
        isCurrentUser: profile.isCurrentUser,
        isFriend: profile.isFriend,
      }));

      const currentUserEntry = rankedEntries.find((e) => e.isCurrentUser);

      return {
        entries: rankedEntries,
        userRank: currentUserEntry?.rank ?? null,
        totalUsers: rankedEntries.length,
        hasMore: rankedEntries.length >= LEADERBOARD_PAGE_SIZE,
        needsCountry: false as const,
      };
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
      error('Leaderboard Error', 'Failed to load rankings.');
      throw e instanceof Error ? e : new Error(String(e));
    }
  }, [timeFilter, friendsOnly, countryOnly, principal, myCountry, error]);

  const cacheKey = useMemo(
    () => `xp:${timeFilter}:f${friendsOnly ? 1 : 0}:c${countryOnly ? 1 : 0}:${myCountry || 'none'}`,
    [timeFilter, friendsOnly, countryOnly, myCountry]
  );

  const { data: leaderboardData, loading: leaderboardLoading, refetch, error: leaderboardError } = useCachedData({
    type: 'leaderboard',
    identifier: cacheKey,
    fetcher: fetchLeaderboardData,
    enabled: true,
    tier: 'normal',
    refetchOnForeground: false,
    minRefetchIntervalMs: 90_000,
    requestTimeoutMs: 45_000,
  });

  useEffect(() => {
    setVisibleCount(LEADERBOARD_PAGE_SIZE);
    setHasMore(true);
    // Clear previous filter's rows immediately so global list never flashes under Friends
    setEntries([]);
    setUserRank(null);
    setTotalUsers(0);
    setLoading(true);
  }, [timeFilter, friendsOnly, countryOnly, myCountry]);

  useEffect(() => {
    if (leaderboardData) {
      setEntries(leaderboardData.entries.slice(0, visibleCount));
      setUserRank(leaderboardData.userRank);
      setTotalUsers(leaderboardData.totalUsers);
      setHasMore(visibleCount < leaderboardData.entries.length);
      setLoading(false);
    } else if (!leaderboardLoading) {
      setLoading(false);
      if (friendsOnly || countryOnly) {
        setEntries([]);
        setUserRank(null);
        setTotalUsers(0);
      }
    }
  }, [leaderboardData, leaderboardLoading, visibleCount, friendsOnly, countryOnly]);

  const handleToggleFriends = () => {
    if (!principal && !friendsOnly) {
      Alert.alert('Sign in required', 'Sign in from More to view a friends-only leaderboard.');
      return;
    }
    setFriendsOnly((v) => !v);
  };

  const handleToggleCountry = async () => {
    // Off → world (default)
    if (countryOnly) {
      setCountryOnly(false);
      return;
    }
    // On only if a country value already exists — never force picker from here
    const stored = (await getStoredCountry()) || myCountry;
    if (!stored) {
      Alert.alert(
        'Country optional',
        'Set your country in Profile (More → Profile → Country) to filter the leaderboard by country. Until then it stays on world rankings.'
      );
      setCountryOnly(false);
      return;
    }
    setMyCountry(stored);
    setCountryOnly(true);
  };

  const handleSelectCountry = async (code: string) => {
    try {
      await saveUserCountry(code, { identity: getIdentity(), principalText: principal || undefined });
      setMyCountry(code);
      setCountryOnly(true);
      setCountryPickerOpen(false);
      success('Country saved', `${countryFlag(code)} ${countryName(code)} will be used for country rankings.`);
      // Force refresh after country set
      setTimeout(() => { void refetch(); }, 100);
    } catch (e: any) {
      error('Country', e?.message || 'Could not save country');
    }
  };

  const sendFriendRequest = async (userId: string, username: string) => {
    if (!principal) {
      Alert.alert('Sign in required', 'Sign in from More to send friend requests.');
      return;
    }
    if (userId === principal) return;
    try {
      setSendingTo(userId);
      const identity = getIdentity();
      const userActor = getBikeraUserActor({}, identity);
      const response = await userActor.sendFriendRequest(
        Principal.fromText(userId),
        Principal.fromText(principal)
      );
      assertCanisterOk(response, 'Failed to send friend request');
      success('Request sent', `Friend request sent to ${username}`);
    } catch (e: any) {
      error('Friend request', e?.message || 'Failed to send friend request');
    } finally {
      setSendingTo(null);
    }
  };

  const onPressEntry = (item: LeaderboardEntry) => {
    if (item.isCurrentUser) {
      navigation.navigate('More', { screen: 'Profile' });
      return;
    }

    const buttons: any[] = [
      {
        text: 'View profile',
        onPress: () => navigation.navigate('PublicProfile', { principal: item.userId }),
      },
    ];

    if (!item.isFriend && !isGuest && principal) {
      buttons.unshift({
        text: sendingTo === item.userId ? 'Sending…' : 'Send friend request',
        onPress: () => { void sendFriendRequest(item.userId, item.username); },
      });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(item.username, `${item.xp.toLocaleString()} XP · Level ${item.level}`, buttons);
  };

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderEntryItem = useCallback(({ item }: { item: LeaderboardEntry }) => (
    <Pressable
      onPress={() => onPressEntry(item)}
      style={({ pressed }) => [
        styles.entryCard,
        item.isCurrentUser && styles.currentUserCard,
        pressed && { opacity: 0.92 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${item.username}, rank ${item.rank}`}
    >
      <View style={styles.rankContainer}>
        {item.rank <= 3 ? (
          <LinearGradient colors={getRankColor(item.rank) as any} style={styles.rankBadge}>
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
          {item.isFriend && !item.isCurrentUser ? (
            <View style={styles.friendBadge}>
              <Text style={styles.friendBadgeText}>Friend</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.userLevel}>
          Level {item.level}
          {item.country ? ` · ${item.country}` : ''}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.mainStat}>{item.xp.toLocaleString()} XP</Text>
        {!item.isFriend && !item.isCurrentUser ? (
          <Text style={styles.subStat}>Tap to add</Text>
        ) : (
          <Text style={styles.subStat}>{item.distance.toFixed(1)} km</Text>
        )}
      </View>
    </Pressable>
  ), [sendingTo, isGuest, principal]);

  const hasCountry = !!myCountry;

  const listHeader = (
    <View style={styles.listHeader}>
      <SectionHeader title="Leaderboard" subtitle="Compete with riders worldwide" />

      <View style={styles.filtersContainer}>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={handleToggleFriends}
            style={[styles.checkOption, friendsOnly && styles.checkOptionActive]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: friendsOnly }}
            accessibilityLabel="Friends only"
          >
            <Text style={styles.checkOptionText}>Friends</Text>
          </Pressable>

          <Pressable
            onPress={() => { void handleToggleCountry(); }}
            style={[
              styles.checkOption,
              countryOnly && hasCountry && styles.checkOptionActive,
              !hasCountry && styles.checkOptionDisabled,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: countryOnly && hasCountry, disabled: !hasCountry }}
            accessibilityLabel="Country filter"
          >
            <Text style={[styles.checkOptionText, !hasCountry && styles.checkOptionTextDisabled]}>
              Country{hasCountry && countryOnly ? ` · ${countryFlag(myCountry)} ${myCountry}` : ''}
            </Text>
          </Pressable>

          {hasCountry ? (
            <Pressable onPress={() => setCountryPickerOpen(true)} style={styles.changeCountryBtn}>
              <Text style={styles.changeCountryText}>Change</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.timeFilterRow}>
          {([
            { key: 'daily', label: 'Daily' },
            { key: 'weekly', label: 'Weekly' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'allTime', label: 'All Time' },
          ] as const).map((t) => {
            const selected = timeFilter === t.key;
            const disabled = friendsOnly;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  if (disabled) return;
                  setTimeFilter(t.key);
                }}
                style={[
                  styles.checkOption,
                  selected && !disabled && styles.checkOptionActive,
                  disabled && styles.checkOptionDisabled,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={t.label}
              >
                <Text style={[styles.checkOptionText, disabled && styles.checkOptionTextDisabled]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {friendsOnly ? (
          <Text style={styles.filterHint}>Friends leaderboard uses all-time XP.</Text>
        ) : null}
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
        >
          <Text style={styles.loadMoreText}>Load more</Text>
        </Pressable>
      ) : (
        <View style={styles.footerSpacer} />
      )}

      {principal ? (
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
      ) : null}
    </View>
  );

  const emptySubtitle = friendsOnly
    ? 'Add friends to see them ranked by XP'
    : countryOnly
      ? `No riders found for ${countryName(myCountry)} yet`
      : 'Start riding to appear on the leaderboard';

  return (
    <Screen scroll={false} contentStyle={{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }}>
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
          ) : leaderboardError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Couldn't load leaderboard</Text>
              <Text style={styles.emptySubtext}>Check your connection and try again.</Text>
              <Pressable
                onPress={() => { void refetch(); }}
                style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>{emptySubtitle}</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
        onEndReached={hasMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        initialNumToRender={LEADERBOARD_PAGE_SIZE}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPurple} />
        }
      />

      <Modal visible={countryPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Your country</Text>
            <Text style={styles.modalSubtitle}>Used for Country rankings</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {COUNTRY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.code}
                  onPress={() => { void handleSelectCountry(opt.code); }}
                  style={[styles.countryRow, myCountry === opt.code && styles.countryRowActive]}
                >
                  <Text style={styles.countryFlagEmoji}>{countryFlag(opt.code)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.countryName}>{opt.name}</Text>
                    <Text style={styles.countryCode}>{opt.code}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  },
  checkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  checkOptionActive: {
    backgroundColor: colors.brandPurple,
    borderColor: colors.brandPurple,
  },
  checkOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  changeCountryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  changeCountryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  timeFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  checkOptionDisabled: {
    opacity: 0.4,
  },
  checkOptionTextDisabled: {
    color: 'rgba(255,255,255,0.55)',
  },
  filterHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
    flexGrow: 1,
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
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.brandPurple,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  loadMoreText: {
    color: colors.brandPurple,
    fontWeight: '700',
  },
  footerSpacer: {
    height: 8,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border1,
    gap: 10,
  },
  currentUserCard: {
    borderColor: colors.brandPurple,
    backgroundColor: 'rgba(66, 192, 251, 0.08)',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankIcon: {
    fontSize: 16,
  },
  rankNumber: {
    color: colors.textTertiary,
    fontWeight: '700',
    fontSize: 14,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: colors.brandPurple,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  youBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  friendBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  friendBadgeText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
  },
  userLevel: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  mainStat: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 14,
  },
  subStat: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  userPositionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  userPositionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  userPositionTitle: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  userPositionSubtitle: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 2,
  },
  userPositionRank: {
    alignItems: 'flex-end',
  },
  userPositionRankNumber: {
    color: colors.brandPurple,
    fontWeight: '900',
    fontSize: 22,
  },
  userPositionTotal: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.textTertiary,
    fontSize: 13,
    marginBottom: 12,
    marginTop: 4,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border2,
  },
  countryRowActive: {
    backgroundColor: 'rgba(66, 192, 251, 0.1)',
  },
  countryFlagEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  countryCode: {
    color: colors.textTertiary,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  countryName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
