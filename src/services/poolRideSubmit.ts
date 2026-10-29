import { Principal } from '@dfinity/principal';

import { getBikeraPoolsActor } from '../utils/actors';

/**
 * After a ride is saved on bikera_user, credit every Active pool the rider
 * has joined. Same submitRide path the staking GroupTrack screen uses.
 */
export async function submitSessionToJoinedPools(
  sessionId: string,
  principalText: string,
  identity: unknown
): Promise<{ submitted: number; skipped: number }> {
  if (!sessionId || !principalText || !identity) {
    return { submitted: 0, skipped: 0 };
  }

  const actor = getBikeraPoolsActor({ agentOptions: { identity } } as never) as any;
  const user = Principal.fromText(principalText);

  let pools: Array<{ id: string }> = [];
  try {
    const page = await actor.getActivePools(BigInt(100), BigInt(0));
    pools = Array.isArray(page) ? page : [];
  } catch (err) {
    if (__DEV__) console.warn('[POOLS] getActivePools failed:', err);
    return { submitted: 0, skipped: 0 };
  }

  if (pools.length === 0) return { submitted: 0, skipped: 0 };

  let submitted = 0;
  let skipped = 0;

  for (const pool of pools) {
    const poolId = typeof pool?.id === 'string' ? pool.id : String(pool?.id ?? '');
    if (!poolId) continue;

    try {
      const joined = await actor.isParticipant(poolId, user);
      if (!joined) {
        skipped += 1;
        continue;
      }
      const res = await actor.submitRide({ poolId, sessionId });
      if (res && typeof res === 'object' && 'ok' in res) {
        submitted += 1;
      } else {
        skipped += 1;
        if (__DEV__) {
          const msg = res && typeof res === 'object' && 'err' in res ? String(res.err) : 'unknown';
          // Outside window / already submitted are expected
          if (!msg.includes('already submitted') && !msg.includes('outside the pool timeframe')) {
            console.warn('[POOLS] submitRide skipped', poolId, msg);
          }
        }
      }
    } catch (err) {
      skipped += 1;
      if (__DEV__) console.warn('[POOLS] submitRide error', poolId, err);
    }
  }

  return { submitted, skipped };
}
