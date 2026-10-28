import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Principal } from '@dfinity/principal';
import { colors } from '../theme/tokens';
import { getBikeraImeraActor } from '../utils/actors';
import { formatImeraE8s } from '../utils/format';

type Entry = {
  id: string;
  label: string;
  incoming: boolean;
  outgoing: boolean;
  amountE8s: bigint;
  detail: string;
};

const LATEST_COUNT = 5;

const shorten = (text: string) => (text.length > 14 ? `${text.slice(0, 5)}…${text.slice(-5)}` : text);

const timeAgo = (timestampMs: number) => {
  const minutes = Math.floor((Date.now() - timestampMs) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/**
 * Home-screen wallet: iMERA balance and the latest ledger movements for the signed-in rider.
 * Uses the ledger's per-account query; falls back to filtering recent global history on an older
 * ledger build that lacks it.
 */
export const WalletSummary = memo(function WalletSummary({
  principal,
  identity,
  refreshKey,
  onOpenWallet,
}: {
  principal: string | null;
  identity: any;
  refreshKey: number;
  onOpenWallet: () => void;
}) {
  const [balanceE8s, setBalanceE8s] = useState<bigint | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!principal) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const owner = Principal.fromText(principal);
      const account = { owner, subaccount: [] as [] };
      const ledger: any = getBikeraImeraActor({}, identity);
      const isMine = (a: { owner: Principal }) => a.owner.toText() === owner.toText();
      const [balance, raw] = await Promise.all([
        ledger.icrc1_balance_of(account) as Promise<bigint>,
        (ledger.getAccountTransactions(account, BigInt(LATEST_COUNT)) as Promise<any[]>).catch(async () => {
          const history: any[] = await ledger.getTransactionHistory([BigInt(500)]);
          return history.filter((tx) => isMine(tx.from) || isMine(tx.to)).reverse().slice(0, LATEST_COUNT);
        }),
      ]);
      setBalanceE8s(BigInt(balance));
      setEntries(
        raw.map((tx: any, idx: number): Entry => {
          const fromMe = isMine(tx.from);
          const toMe = isMine(tx.to);
          const kind = tx.kind === 'mint' || tx.kind === 'burn' ? tx.kind : 'transfer';
          const direction = fromMe && toMe ? 'self' : toMe ? 'in' : 'out';
          const label =
            kind === 'mint' ? 'Reward received'
            : kind === 'burn' ? 'Burned'
            : direction === 'in' ? 'Received'
            : direction === 'out' ? 'Sent'
            : 'Moved between your accounts';
          const other = direction === 'in' ? tx.from.owner.toText() : tx.to.owner.toText();
          const when = timeAgo(Number(BigInt(tx.timestamp) / 1_000_000n));
          return {
            id: tx.index !== undefined ? String(tx.index) : `tx-${idx}`,
            label,
            incoming: kind === 'mint' || direction === 'in',
            outgoing: kind === 'burn' || direction === 'out',
            amountE8s: BigInt(tx.amount),
            detail: kind === 'transfer' && direction !== 'self'
              ? `${direction === 'in' ? 'From' : 'To'} ${shorten(other)} • ${when}`
              : when,
          };
        })
      );
    } catch (err) {
      if (__DEV__) console.error('[WalletSummary] Failed to load wallet', err);
      setBalanceE8s(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [principal, identity]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet</Text>
        <Pressable onPress={onOpenWallet} style={styles.openButton} accessibilityRole="button">
          <Text style={styles.openText}>Open wallet</Text>
        </Pressable>
      </View>

      <View style={styles.balanceRow}>
        <Ionicons name="wallet-outline" size={28} color={colors.brandBlue100} />
        <View>
          <Text style={styles.balanceLabel}>iMERA balance</Text>
          <Text style={styles.balanceValue}>
            {loading || balanceE8s === null ? '---' : `${formatImeraE8s(balanceE8s)} iMERA`}
          </Text>
        </View>
      </View>

      <Text style={styles.subTitle}>Latest transactions</Text>
      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>No transactions yet.</Text>
      ) : (
        entries.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel} numberOfLines={1}>{entry.label}</Text>
              <Text style={styles.rowDetail} numberOfLines={1}>{entry.detail}</Text>
            </View>
            <Text style={[styles.amount, entry.incoming && styles.amountIn]}>
              {entry.incoming ? '+' : entry.outgoing ? '−' : ''}
              {formatImeraE8s(entry.amountE8s)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    backgroundColor: 'rgba(6, 7, 23, 0.6)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
  openButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  openText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 18,
  },
  balanceLabel: { color: colors.textTertiary, fontSize: 13 },
  balanceValue: { color: '#fff', fontWeight: '800', fontSize: 22 },
  subTitle: { color: colors.textSecondary, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  empty: { color: colors.textTertiary, textAlign: 'center', paddingVertical: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rowDetail: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
  amount: { color: '#fff', fontWeight: '800', fontSize: 14 },
  amountIn: { color: colors.success },
});

export default WalletSummary;
