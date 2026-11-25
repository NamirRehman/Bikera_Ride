import type { Principal } from '@dfinity/principal';

import { getBikeraRewardsActor, getBikeraXpActor } from '../utils/actors';
import { fromE8s } from '../utils/formatStats';

export type RideMatchRow = { time: number; amount: number; distance?: number };

const ns = (ms: number) => BigInt(Math.trunc(ms)) * 1_000_000n;
const ms = (timestamp: bigint) => Number(timestamp / 1_000_000n);

export async function fetchRideMatchRows(
  userId: Principal,
  oldestMs: number,
  newestMs: number,
): Promise<{ xp: RideMatchRow[]; rewards: RideMatchRow[] }> {
  const from = ns(oldestMs - 5 * 60_000);
  const end = newestMs + 5 * 60_000;
  const [xp, rewards] = await Promise.allSettled([
    getBikeraXpActor().getXPInRange(userId, from, ns(end)),
    getBikeraRewardsActor().getRewardsInRange(userId, from, ns(end + 5 * 60_000)),
  ]);
  return {
    xp: xp.status === 'fulfilled' ? xp.value.transactions.flatMap((tx) =>
      'Distance' in tx.reason ? [{ time: ms(tx.timestamp), amount: Number(tx.amount), distance: Number(tx.reason.Distance) }] : []
    ) : [],
    rewards: rewards.status === 'fulfilled' ? rewards.value.rewards.map((reward) =>
      ({ time: ms(reward.timestamp), amount: fromE8s(reward.amount) })
    ) : [],
  };
}

export async function fetchPeriodEarnings(userId: Principal, startMs: number, endMs: number) {
  const [xp, imera] = await Promise.all([
    getBikeraXpActor().getXPInRange(userId, ns(startMs), ns(endMs)),
    getBikeraRewardsActor().getRewardsInRange(userId, ns(startMs), ns(endMs)),
  ]);
  return { xp: Number(xp.total), imera: fromE8s(imera.total) };
}
