import { Principal } from '@dfinity/principal';
import type { ActivitySession, RideProvenance, AttestationSource, DistanceInRange } from '../declarations/bikera_user/bikera_user.did';
import { getBikeraUserActor } from '../utils/actors';
import { requireRiderIdentity, withTimeout } from './integration-utils';
import type { RidePoint } from './rideFiles';

export type { RideProvenance };
export type RideEvidenceOverview = { rides: ActivitySession[]; totals: DistanceInRange };

export function sourceLabel(source: AttestationSource): string {
  if ('ShadowWorker' in source) return 'Bikera GPS check';
  if ('Strava' in source) return 'Strava';
  if ('Garmin' in source) return 'Garmin';
  if ('AppleHealth' in source) return 'Apple Health';
  if ('GoogleFit' in source) return 'Google Fit';
  return source.Other;
}

export function rideEvidence(provenance?: RideProvenance) {
  const sources = provenance?.attestations.map(sourceLabel).join(', ') || '';
  if (!sources) return { level: 'phone', label: 'Phone', detail: 'Recorded by Bikera; not independently confirmed.' } as const;
  if (provenance?.deviceRecorded) return { level: 'confirmed', label: 'Confirmed', detail: `Recorded by Bikera and confirmed by ${sources}.` } as const;
  return { level: 'attested', label: sources, detail: `Recorded by ${sources}.` } as const;
}

export async function getRideEvidenceOverview(identity: unknown, principal: string, limit = 10): Promise<RideEvidenceOverview> {
  const signed = requireRiderIdentity(identity, principal);
  const actor = getBikeraUserActor({}, signed);
  const rider = Principal.fromText(principal);
  const now = BigInt(Date.now()) * 1_000_000n;
  const [rides, totals] = await withTimeout(Promise.all([
    actor.getActivitySessions(rider, [BigInt(Math.max(1, Math.min(100, limit)))], []),
    actor.getDistanceInRange(rider, now - 30n * 86_400_000_000_000n, now),
  ]), 20_000, 'Ride evidence could not be loaded. Try again.');
  return { rides: rides.filter((ride) => ride.endTime.length > 0), totals };
}

/** Older tracked sessions stored milliseconds; current sessions store nanoseconds. */
export function sessionRoutePoints(ride: Pick<ActivitySession, 'route'>): RidePoint[] {
  return ride.route.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    timestampMs: Number(point.timestamp > 1_000_000_000_000_000n ? point.timestamp / 1_000_000n : point.timestamp),
  }));
}
