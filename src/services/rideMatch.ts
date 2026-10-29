import { Actor, HttpAgent } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

import {
  canisterIds,
  getBikeraRewardsActor,
  getBikeraXpActor,
  getHost,
} from '../utils/actors';

export type RideMatchRow = { time: number; amount: number; distance?: number };

const xpMatchIdl = ({ IDL }: { IDL: any }) => {
  const XPMatchRow = IDL.Record({
    timestamp: IDL.Int,
    amount: IDL.Nat,
    distance: IDL.Opt(IDL.Nat),
  });
  return IDL.Service({
    getXPMatchRows: IDL.Func(
      [IDL.Principal, IDL.Opt(IDL.Nat)],
      [IDL.Vec(XPMatchRow)],
      ['query']
    ),
  });
};

const rewardMatchIdl = ({ IDL }: { IDL: any }) => {
  const RewardMatchRow = IDL.Record({
    timestamp: IDL.Int,
    amount: IDL.Nat,
  });
  return IDL.Service({
    getRewardMatchRows: IDL.Func(
      [IDL.Principal, IDL.Opt(IDL.Nat)],
      [IDL.Vec(RewardMatchRow)],
      ['query']
    ),
  });
};

function queryActor(idl: (args: { IDL: any }) => unknown, canisterId: string) {
  const agent = new HttpAgent({
    host: getHost(),
    fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init),
  });
  return Actor.createActor(idl as never, { agent, canisterId });
}

function optNat(value: unknown): number | undefined {
  if (Array.isArray(value) && value.length > 0) return Number(value[0]);
  if (typeof value === 'bigint') return Number(value);
  return undefined;
}

function nsToMs(value: unknown): number {
  return Number(value || 0) / 1_000_000;
}

async function fetchFullRows(
  userId: Principal,
  xpLimit: number,
  rewardLimit: number
): Promise<{ xp: RideMatchRow[]; rewards: RideMatchRow[] }> {
  const [xpTransactions, allRewards] = await Promise.all([
    getBikeraXpActor().getXPTransactions(userId, [BigInt(xpLimit)]),
    getBikeraRewardsActor().getUserRewards(userId, [BigInt(rewardLimit)]),
  ]);

  const xp = (xpTransactions || []).map((tx: any) => ({
    time: nsToMs(tx.timestamp),
    amount: Number(tx.amount || 0n),
    distance:
      tx.reason && typeof tx.reason === 'object' && 'Distance' in tx.reason
        ? Number(tx.reason.Distance || 0n)
        : optNat(tx.distance),
  }));
  const rewards = (allRewards || []).map((reward: any) => ({
    time: nsToMs(reward.timestamp),
    amount: Number(reward.amount || 0n) / 100_000_000,
  }));
  return { xp, rewards };
}

/** Small XP and iMERA rows for a ride list. Falls back to the full records until those canisters are upgraded. */
export async function fetchRideMatchRows(
  userId: Principal,
  xpLimit: number,
  rewardLimit: number
): Promise<{ xp: RideMatchRow[]; rewards: RideMatchRow[] }> {
  try {
    const xpActor = queryActor(xpMatchIdl, canisterIds.bikera_xp) as unknown as {
      getXPMatchRows: (userId: Principal, limit: [bigint]) => Promise<Array<{ timestamp: bigint; amount: bigint; distance: unknown }>>;
    };
    const rewardsActor = queryActor(rewardMatchIdl, canisterIds.bikera_rewards) as unknown as {
      getRewardMatchRows: (userId: Principal, limit: [bigint]) => Promise<Array<{ timestamp: bigint; amount: bigint }>>;
    };
    const [xpRows, rewardRows] = await Promise.all([
      xpActor.getXPMatchRows(userId, [BigInt(xpLimit)]),
      rewardsActor.getRewardMatchRows(userId, [BigInt(rewardLimit)]),
    ]);
    return {
      xp: (xpRows || []).map((row) => ({
        time: nsToMs(row.timestamp),
        amount: Number(row.amount || 0n),
        distance: optNat(row.distance),
      })),
      rewards: (rewardRows || []).map((row) => ({
        time: nsToMs(row.timestamp),
        amount: Number(row.amount || 0n) / 100_000_000,
      })),
    };
  } catch (error) {
    if (__DEV__) console.warn('[HISTORY] Match rows unavailable, loading full records:', error);
    return fetchFullRows(userId, xpLimit, rewardLimit);
  }
}
