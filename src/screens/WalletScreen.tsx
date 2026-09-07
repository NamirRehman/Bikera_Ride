import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, FlatList, Platform, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Principal } from '@dfinity/principal';
import { HttpAgent } from '@dfinity/agent';

import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/tokens';
import { useCachedData } from '../hooks/useCachedData';
import { getBikeraImeraActor, getBikeraRewardsActor, getHost } from '../utils/actors';
import { WEB_APP_URL } from '../config';

const TOKEN_DECIMALS = 8;
const TOKEN_DECIMALS_MULTIPLIER = BigInt(10 ** TOKEN_DECIMALS);

interface Transaction {
  id: string;
  amount: number;
  timestamp: number;
}

function BalanceCard({ balance, loading }: { balance: number; loading: boolean }) {
  const formattedBalance = useMemo(
    () =>
      balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }),
    [balance]
  );

  return (
    <Card style={styles.balanceCard}>
      <LinearGradient
        colors={['rgba(66, 192, 251, 0.14)', 'rgba(26, 159, 224, 0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.balanceGradient}
      >
        <Text style={styles.balanceLabel}>Total Balance</Text>
        {loading ? (
          <ThreeDotLoader color={colors.brandBlue100} size="small" />
        ) : (
          <Text style={styles.balanceAmount}>{formattedBalance} iMERA</Text>
        )}
        <Text style={styles.balanceHint}>Read-only on mobile v1</Text>
      </LinearGradient>
    </Card>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const formattedDate = useMemo(() => {
    const date = new Date(transaction.timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [transaction.timestamp]);

  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        <Ionicons name="gift" size={22} color={colors.success} />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionType}>Ride Reward</Text>
        <Text style={styles.transactionDate}>{formattedDate}</Text>
      </View>
      <Text style={styles.transactionAmountText}>
        +{transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} iMERA
      </Text>
    </View>
  );
}

interface WalletScreenProps {
  embedded?: boolean;
}

export function WalletScreen({ embedded = false }: WalletScreenProps) {
  const { principal, getIdentity } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchWalletData = useCallback(async () => {
    if (!principal) return null;

    const identity = getIdentity();
    if (!identity) return null;

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

    const principalObj = Principal.fromText(principal);
    const account = { owner: principalObj, subaccount: [] as [] };
    const imeraActor = getBikeraImeraActor({ agent });
    const balance = await imeraActor.icrc1_balance_of(account).catch(() => 0n);

    return {
      balance: Number(balance) / Number(TOKEN_DECIMALS_MULTIPLIER),
    };
  }, [principal, getIdentity]);

  const { data: walletData, loading, refetch } = useCachedData({
    type: 'wallet',
    identifier: principal || undefined,
    fetcher: fetchWalletData,
    enabled: !!principal,
    customTtl: 30 * 1000,
  });

  const loadTransactions = useCallback(async () => {
    if (!principal) return;

    const identity = getIdentity();
    if (!identity) return;

    try {
      const principalObj = Principal.fromText(principal);
      const rewardsActor = getBikeraRewardsActor({}, identity);
      const rewardsSnapshot = await (rewardsActor as any).getRewardsSnapshot?.(principalObj).catch(() => null);
      const recentRewards = Array.isArray(rewardsSnapshot?.recentRewards) ? rewardsSnapshot.recentRewards : [];
      const rewardItems = recentRewards.map((reward: any, index: number) => ({
        id: `reward-${index}-${reward.roundId ?? index}`,
        amount: Number(reward.amount || 0n) / Number(TOKEN_DECIMALS_MULTIPLIER),
        timestamp: Number(reward.timestamp || 0n) / 1_000_000 || Date.now(),
      }));

      rewardItems.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(rewardItems.slice(0, 100));
    } catch (err) {
      if (__DEV__) {
        console.error('[Wallet] Failed to load rewards activity:', err);
      }
    }
  }, [principal, getIdentity]);

  useEffect(() => {
    if (!principal) return;
    loadTransactions();
  }, [principal, loadTransactions]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), loadTransactions()]);
    setRefreshing(false);
  }, [refetch, loadTransactions]);

  const balance = walletData?.balance || 0;

  const content = (
    <>
      {!embedded && <SectionHeader title="Wallet" subtitle="View your iMERA balance and reward activity" />}
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brandBlue100} />
        }
      >
        <BalanceCard balance={balance} loading={loading} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance</Text>
          <Card style={styles.infoCard}>
            <Text style={styles.infoText}>
              View your iMERA balance and recent ride rewards here. Advanced transfers stay on the web app if needed.
            </Text>
            <Pressable style={styles.webButton} onPress={() => Linking.openURL(WEB_APP_URL).catch(() => {})}>
              <Ionicons name="globe-outline" size={18} color="#fff" />
              <Text style={styles.webButtonText}>Open Bikera Web</Text>
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reward Activity</Text>
          {transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No rewards activity yet</Text>
            </Card>
          ) : (
            <Card style={styles.transactionListCard}>
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TransactionItem transaction={item} />}
                scrollEnabled={false}
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                windowSize={6}
                removeClippedSubviews={Platform.OS === 'android' || Platform.OS === 'ios'}
              />
            </Card>
          )}
        </View>
      </ScrollView>
    </>
  );

  if (embedded) {
    return content;
  }

  return <Screen>{content}</Screen>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    marginTop: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  balanceHint: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  infoCard: {
    gap: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  webButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brandPurple,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  webButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  transactionListCard: {
    paddingVertical: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 241, 149, 0.12)',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  transactionDate: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },
  transactionAmountText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
});
