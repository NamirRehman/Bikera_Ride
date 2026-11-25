import type { Identity } from '@dfinity/agent';

import { getBikeraPoolsActor } from '../utils/actors';
import { chunkArray } from '../utils/batch';
import type { SavedSharedRide } from './sharedRide';

const PAGE_SIZE = 50n;
const MEMBERSHIP_BATCH_SIZE = 6;

/** Credit a completed account ride to every eligible race the rider has joined. */
export async function submitSessionToJoinedPools(
  ride: SavedSharedRide,
  identity: Identity,
): Promise<{ submitted: number; failed: boolean }> {
  const actor = getBikeraPoolsActor({ agentOptions: { identity } });
  const rider = identity.getPrincipal();
  const checked = new Set<string>();
  let submitted = 0;
  let failed = false;

  for (let offset = 0n; ; offset += PAGE_SIZE) {
    let page;
    try {
      page = await actor.getActivePools(PAGE_SIZE, offset);
    } catch {
      return { submitted, failed: true };
    }

    const candidates = page.filter((pool) =>
      !checked.has(pool.id) && pool.startTime <= ride.endTime && pool.endTime >= ride.startTime);
    for (const batch of chunkArray(candidates, MEMBERSHIP_BATCH_SIZE)) {
      const memberships = await Promise.allSettled(batch.map((pool) => actor.isParticipant(pool.id, rider)));
      for (const [index, pool] of batch.entries()) {
        checked.add(pool.id);
        const membership = memberships[index];
        if (membership.status === 'rejected') {
          failed = true;
          continue;
        }
        if (!membership.value) continue;
        try {
          const result = await actor.submitRide({ poolId: pool.id, sessionId: ride.id });
          if ('ok' in result) submitted += 1;
          else if (!/already submitted|outside the pool timeframe|pool (is not active|closed)/i.test(result.err)) failed = true;
        } catch {
          failed = true;
        }
      }
    }
    if (page.length < Number(PAGE_SIZE)) return { submitted, failed };
  }
}
