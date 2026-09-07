import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, Text, View, StyleSheet, TextInput, Alert, FlatList, Platform, ListRenderItem } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Principal } from '@dfinity/principal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { colors } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { getBikeraUserActor } from '../utils/actors';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { useCachedData } from '../hooks/useCachedData';
import { invalidateFriendsCache } from '../utils/cacheHelpers';
import { fetchPublicUserSummary, type PublicUserSummary } from '../services/userSummary';
import { runInBatches } from '../utils/batch';

type Tab = 'friends' | 'requests';
const FRIEND_PAGE_SIZE = 10;
const REQUEST_PAGE_SIZE = 10;
const SUMMARY_BATCH_SIZE = 6;

interface Friend {
  id: string;
  username: string;
  level: number;
  xp: number;
  distance: number;
  avatar?: string;
  status: 'online' | 'offline';
  lastActive?: string;
}

interface FriendRequest {
  id: string;
  from: string;
  username: string;
  level: number;
  timestamp: number;
}

interface FriendRequestRaw {
  id: string;
  from: string;
  timestamp: number;
}

export function FriendsScreen() {
  const navigation = useNavigation<any>();
  const { principal } = useAuth();
  const [tab, setTab] = useState<Tab>('friends');
  const [searchText, setSearchText] = useState('');
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [requestItems, setRequestItems] = useState<FriendRequestRaw[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PublicUserSummary>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleFriendCount, setVisibleFriendCount] = useState(FRIEND_PAGE_SIZE);
  const [visibleRequestCount, setVisibleRequestCount] = useState(REQUEST_PAGE_SIZE);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});
  const [sendToId, setSendToId] = useState('');
  const [sending, setSending] = useState(false);

  const nsToMs = (v: any): number => (typeof v === 'bigint' ? Number(v / 1_000_000n) : Math.floor(Number(v) / 1_000_000));

  const fetchFriendsData = useCallback(async () => {
    const storedPrincipal = principal || (await AsyncStorage.getItem('bikera_principal')) || '';
    if (!storedPrincipal) {
      return { friendIds: [], requests: [] };
    }
    const userActor = getBikeraUserActor();
    const p = Principal.fromText(storedPrincipal);
    const [friendIdsRaw, rawRequests] = await Promise.all([
      userActor.getFriends(p),
      userActor.getFriendRequests(p, []),
    ]);

    const friendIds = (Array.isArray(friendIdsRaw) ? friendIdsRaw : []).map((friendId: any) => {
      try {
        const text = friendId?.toText ? friendId.toText() : String(friendId);
        return Principal.fromText(text).toText();
      } catch {
        return String(friendId);
      }
    });

    const mappedRequests: FriendRequestRaw[] = (Array.isArray(rawRequests) ? rawRequests : []).map((req: any, idx: number) => {
      const fromText = req?.from?.toText ? req.from.toText() : String(req?.from);
      return {
        id: String(req?.id || idx),
        from: fromText,
        timestamp: req?.createdAt !== undefined ? nsToMs(req.createdAt) : Date.now(),
      };
    });

    return {
      friendIds,
      requests: mappedRequests,
    };
  }, [principal]);

  const { data: friendsData, loading: friendsLoading, refetch } = useCachedData({
    type: 'friends',
    identifier: principal || undefined,
    fetcher: fetchFriendsData,
    enabled: !!principal,
  });

  useEffect(() => {
    if (friendsData) {
      setFriendIds(friendsData.friendIds);
      setRequestItems(friendsData.requests);
      setLoading(false);
      setVisibleFriendCount(FRIEND_PAGE_SIZE);
      setVisibleRequestCount(REQUEST_PAGE_SIZE);
    } else if (!friendsLoading && principal) {
      setLoading(false);
    }
  }, [friendsData, friendsLoading, principal]);

  useEffect(() => {
    setLoading(friendsLoading);
  }, [friendsLoading]);

  useEffect(() => {
    setSummaries({});
    setVisibleFriendCount(FRIEND_PAGE_SIZE);
    setVisibleRequestCount(REQUEST_PAGE_SIZE);
  }, [principal]);

  const loadSummaries = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => !summaries[id]);
    if (missing.length === 0) return;
    const results = await runInBatches(missing, SUMMARY_BATCH_SIZE, (id) => fetchPublicUserSummary(id));
    const updates: Record<string, PublicUserSummary> = {};
    missing.forEach((id, index) => {
      updates[id] = results[index];
    });
    setSummaries((prev) => ({ ...prev, ...updates }));
  }, [summaries]);

  useEffect(() => {
    const ids = tab === 'friends'
      ? friendIds.slice(0, visibleFriendCount)
      : requestItems.slice(0, visibleRequestCount).map((req) => req.from);
    if (ids.length > 0) {
      loadSummaries(ids);
    }
  }, [tab, friendIds, requestItems, visibleFriendCount, visibleRequestCount, loadSummaries]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const storedPrincipal = principal || (await AsyncStorage.getItem('bikera_principal')) || '';
      if (!storedPrincipal) return;
      setActionBusy((prev) => ({ ...prev, [requestId]: true }));
      const userActor = getBikeraUserActor();
      const p = Principal.fromText(storedPrincipal);
      const response = await userActor.respondToFriendRequest(requestId, true, p);
      console.log('[FRIENDS] respondToFriendRequest (accept) response:', JSON.stringify(response, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      setRequestItems(prev => prev.filter(r => r.id !== requestId));
      // Invalidate cache and refetch
      await invalidateFriendsCache(storedPrincipal);
      await refetch();
      Alert.alert('Success', 'Friend request accepted');
    } catch (e: any) {
      console.error('Failed to accept request:', e);
      Alert.alert('Error', e?.message || 'Failed to accept friend request');
    } finally {
      setActionBusy((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const storedPrincipal = principal || (await AsyncStorage.getItem('bikera_principal')) || '';
      if (!storedPrincipal) return;
      setActionBusy((prev) => ({ ...prev, [requestId]: true }));
      const userActor = getBikeraUserActor();
      const p = Principal.fromText(storedPrincipal);
      const response = await userActor.respondToFriendRequest(requestId, false, p);
      console.log('[FRIENDS] respondToFriendRequest (reject) response:', JSON.stringify(response, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      setRequestItems(prev => prev.filter(r => r.id !== requestId));
      // Invalidate cache and refetch
      await invalidateFriendsCache(storedPrincipal);
      await refetch();
    } catch (e: any) {
      console.error('Failed to reject request:', e);
      Alert.alert('Error', e?.message || 'Failed to reject friend request');
    } finally {
      setActionBusy((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleSendRequest = async () => {
    const val = sendToId.trim();
    if (!val) return;
    
    try {
      const storedPrincipal = principal || (await AsyncStorage.getItem('bikera_principal')) || '';
      if (!storedPrincipal) return;
      setSending(true);
      const userActor = getBikeraUserActor();
      const p = Principal.fromText(storedPrincipal);
      const to = Principal.fromText(val);
      const response = await userActor.sendFriendRequest(to, p);
      console.log('[FRIENDS] sendFriendRequest response:', JSON.stringify(response, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value, 2));
      // Invalidate cache and refetch
      await invalidateFriendsCache(storedPrincipal);
      await refetch();
      Alert.alert('Success', 'Friend request sent');
      setSendToId('');
    } catch (e: any) {
      console.error('sendFriendRequest failed:', e);
      Alert.alert('Error', e?.message || 'Failed to send friend request');
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  const formatLastActive = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutesSinceActivity = diff / (1000 * 60);
    if (minutesSinceActivity < 60) {
      return `${Math.floor(minutesSinceActivity)}m ago`;
    }
    if (minutesSinceActivity < 1440) {
      return `${Math.floor(minutesSinceActivity / 60)}h ago`;
    }
    return `${Math.floor(minutesSinceActivity / 1440)}d ago`;
  };

  const visibleFriendIds = useMemo(
    () => friendIds.slice(0, visibleFriendCount),
    [friendIds, visibleFriendCount]
  );

  const friendsToRender = useMemo<Friend[]>(() => {
    return visibleFriendIds.map((id) => {
      const summary = summaries[id];
      const username = summary?.username || id.slice(0, 8);
      const lastActivity = summary?.lastActivity ?? 0;
      const hasActivity = lastActivity > 0;
      const minutesSinceActivity = hasActivity ? (Date.now() - lastActivity) / (1000 * 60) : Number.POSITIVE_INFINITY;
      const status: 'online' | 'offline' = minutesSinceActivity < 15 ? 'online' : 'offline';
      return {
        id,
        username,
        level: summary?.level ?? 1,
        xp: summary?.xp ?? 0,
        distance: summary?.distance ?? 0,
        avatar: summary?.avatar,
        status,
        lastActive: hasActivity ? formatLastActive(lastActivity) : '—',
      };
    });
  }, [visibleFriendIds, summaries]);

  const filteredFriends = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return friendsToRender;
    return friendsToRender.filter((friend) => friend.username.toLowerCase().includes(query));
  }, [friendsToRender, searchText]);

  const visibleRequests = useMemo<FriendRequest[]>(() => {
    return requestItems.slice(0, visibleRequestCount).map((request) => {
      const summary = summaries[request.from];
      return {
        id: request.id,
        from: request.from,
        username: summary?.username || request.from.slice(0, 8),
        level: summary?.level ?? 1,
        timestamp: request.timestamp,
      };
    });
  }, [requestItems, visibleRequestCount, summaries]);

  const listData = (tab === 'friends' ? filteredFriends : visibleRequests) as Array<Friend | FriendRequest>;
  const hasMore = tab === 'friends'
    ? friendIds.length > visibleFriendCount
    : requestItems.length > visibleRequestCount;

  const handleLoadMore = useCallback(() => {
    if (loading) return;
    if (tab === 'friends') {
      setVisibleFriendCount((prev) => Math.min(prev + FRIEND_PAGE_SIZE, friendIds.length));
    } else {
      setVisibleRequestCount((prev) => Math.min(prev + REQUEST_PAGE_SIZE, requestItems.length));
    }
  }, [loading, tab, friendIds.length, requestItems.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderFriendItem = useCallback(({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <View style={styles.friendHeader}>
        <View style={styles.friendLeft}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.brandPurple }]}>
            <Text style={styles.avatarInitials}>{item.username.charAt(0).toUpperCase()}</Text>
            {item.status === 'online' && <View style={styles.onlineBadge} />}
          </View>
          <View>
            <View style={styles.friendNameRow}>
              <Text style={styles.friendName}>{item.username}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Lvl {item.level}</Text>
              </View>
            </View>
            <Text style={styles.friendStatus}>
              {item.status === 'online' ? 'Online now' : `Last active ${item.lastActive}`}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate('PublicProfile', { principal: item.id })}
          style={styles.actionButton}
        >
          <Ionicons name="eye-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.friendStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>XP</Text>
          <Text style={styles.statValue}>{item.xp.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{item.distance.toFixed(1)} km</Text>
        </View>
      </View>
    </View>
  ), [navigation]);

  const renderRequestItem = useCallback(({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.brandPurple, width: 48, height: 48 }]}>
          <Text style={styles.avatarInitials}>{item.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.friendNameRow}>
            <Text style={styles.friendName}>{item.username}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lvl {item.level}</Text>
            </View>
          </View>
          <Text style={styles.friendStatus}>{formatTimestamp(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          onPress={() => handleAcceptRequest(item.id)}
          disabled={!!actionBusy[item.id]}
          style={[styles.requestBtn, styles.acceptBtn]}
        >
          {actionBusy[item.id] ? (
            <ThreeDotLoader color="white" size="small" />
          ) : (
            <Text style={styles.requestBtnText}>Accept</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => handleRejectRequest(item.id)}
          disabled={!!actionBusy[item.id]}
          style={[styles.requestBtn, styles.rejectBtn]}
        >
          {actionBusy[item.id] ? (
            <ThreeDotLoader color={colors.textSecondary} size="small" />
          ) : (
            <Text style={[styles.requestBtnText, styles.rejectBtnText]}>Decline</Text>
          )}
        </Pressable>
      </View>
    </View>
  ), [actionBusy, handleAcceptRequest, handleRejectRequest, formatTimestamp]);

  const listHeader = (
    <View style={styles.listHeader}>
      <SectionHeader title="Friends" subtitle="Connect with other riders" />

      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setTab('friends')}
          style={[styles.tab, tab === 'friends' && styles.activeTab]}
        >
          {tab === 'friends' ? (
            <LinearGradient
              colors={[colors.brandPurple, colors.brandBlue300]}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>Friends ({friendIds.length})</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>Friends ({friendIds.length})</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => setTab('requests')}
          style={[styles.tab, tab === 'requests' && styles.activeTab, { position: 'relative' }]}
        >
          {tab === 'requests' ? (
            <LinearGradient
              colors={[colors.brandPurple, colors.brandBlue300]}
              style={styles.tabGradient}
            >
              <Text style={styles.activeTabText}>Requests</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.tabText}>Requests</Text>
          )}
          {requestItems.length > 0 && <View style={styles.notificationDot} />}
        </Pressable>
      </View>

      {tab === 'friends' && (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textTertiary} />
            <TextInput
              placeholder="Search friends..."
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <View style={styles.sendRequestContainer}>
            <TextInput
              placeholder="Enter user Principal to send request"
              placeholderTextColor={colors.textTertiary}
              style={styles.sendRequestInput}
              value={sendToId}
              onChangeText={setSendToId}
            />
            <Pressable
              onPress={handleSendRequest}
              disabled={sending || !sendToId.trim()}
              style={[styles.sendButton, (!sendToId.trim() || sending) && styles.sendButtonDisabled]}
            >
              {sending ? (
                <ThreeDotLoader color="white" size="small" />
              ) : (
                <LinearGradient
                  colors={[colors.brandPurple, colors.brandBlue300]}
                  style={styles.sendButtonGradient}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </LinearGradient>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );

  return (
    <Screen scroll={false} contentClassName={{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }}>
      <FlatList<Friend | FriendRequest>
        key={tab}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={
          tab === 'friends'
            ? (renderFriendItem as ListRenderItem<Friend | FriendRequest>)
            : (renderRequestItem as ListRenderItem<Friend | FriendRequest>)
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ThreeDotLoader color={colors.brandPurple} size="large" />
            </View>
          ) : tab === 'friends' ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No friends found</Text>
              <Text style={styles.emptySubtext}>Search for riders to connect with</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending requests</Text>
              <Text style={styles.emptySubtext}>New friend requests will appear here</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore ? (
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
          )
        }
        contentContainerStyle={styles.listContent}
        onEndReached={hasMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}
        initialNumToRender={tab === 'friends' ? FRIEND_PAGE_SIZE : REQUEST_PAGE_SIZE}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android' || Platform.OS === 'ios'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    padding: 4,
    borderRadius: 16,
    marginBottom: 16,
  },
  listHeader: {
    paddingTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeTab: {
    backgroundColor: colors.surface2,
  },
  tabGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceCard,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
  },
  sendRequestContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sendRequestInput: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  sendButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 80,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 8,
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
    height: 24,
  },
  friendCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  friendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  friendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surfaceCard,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  friendName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  levelBadge: {
    backgroundColor: colors.brandPurple + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelText: {
    color: colors.brandPurple,
    fontSize: 11,
    fontWeight: '700',
  },
  friendStatus: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border1,
  },
  statItem: {
    flex: 1,
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
  requestCard: {
    padding: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: colors.success,
  },
  rejectBtn: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border1,
  },
  requestBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rejectBtnText: {
    color: colors.textSecondary,
  },
});
