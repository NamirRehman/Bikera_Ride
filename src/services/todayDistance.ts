import { Actor, HttpAgent } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

import { canisterIds, getHost } from '../utils/actors';

/**
 * Home summary. `getDistanceInRange` returns totals only.
 * `getActivitySessions` also returns every GPS point, which the JS thread
 * has to decode before any tab tap can run.
 */
const distanceIdl = ({ IDL }: { IDL: any }) => {
  const Distance = IDL.Nat;
  const Timestamp = IDL.Int;
  const DistanceInRange = IDL.Record({
    completedMeters: Distance,
    activeMeters: Distance,
    completedSessions: IDL.Nat,
    activeSessions: IDL.Nat,
    rejectedMeters: Distance,
    rejectedSessions: IDL.Nat,
    fromTs: Timestamp,
    toTs: Timestamp,
  });
  return IDL.Service({
    getDistanceInRange: IDL.Func(
      [IDL.Principal, Timestamp, Timestamp],
      [DistanceInRange],
      ['query']
    ),
  });
};

type DistanceInRange = {
  completedMeters: bigint;
  activeMeters: bigint;
};

function distanceActor(identity: unknown) {
  const agent = new HttpAgent({
    host: getHost(),
    identity: identity as never,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init),
  });
  return Actor.createActor(distanceIdl as never, {
    agent,
    canisterId: canisterIds.bikera_user,
  });
}

/** Kilometres ridden since local midnight. Null when the summary call fails. */
export async function fetchTodayDistanceKm(
  principal: Principal,
  identity: unknown
): Promise<number | null> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const fromTs = BigInt(start.getTime()) * 1_000_000n;
  const toTs = BigInt(Date.now()) * 1_000_000n;

  const actor = distanceActor(identity) as unknown as {
    getDistanceInRange: (userId: Principal, from: bigint, to: bigint) => Promise<DistanceInRange>;
  };
  const result = await actor.getDistanceInRange(principal, fromTs, toTs);
  const meters = Number(result.completedMeters ?? 0n) + Number(result.activeMeters ?? 0n);
  return meters / 1000;
}
