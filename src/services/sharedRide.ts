import type { Identity } from '@dfinity/agent';
import type { ActivitySession, LocationPoint } from '../declarations/bikera_user/bikera_user.did';
import { getBikeraUserActor } from '../utils/actors';
import type { RidePoint } from './rideFiles';

export type SharedRide = {
  sessionId: string | null;
  startMs: number;
  endMs: number;
  distanceM: number;
  durationSeconds: number;
  maxKmh: number;
  avgKmh: number;
  route: readonly RidePoint[];
};

export type SavedSharedRide = { id: string; startTime: bigint; endTime: bigint; distance: bigint };

const MAX_ROUTE_POINTS = 800;
const ns = (ms: number) => BigInt(Math.trunc(ms)) * 1_000_000n;

function toCanisterRoute(points: readonly RidePoint[]): LocationPoint[] {
  const count = Math.min(points.length, MAX_ROUTE_POINTS);
  return Array.from({ length: count }, (_, index) => {
    const point = points[count === 1 ? 0 : Math.round(index * (points.length - 1) / (count - 1))];
    return { latitude: point.latitude, longitude: point.longitude, timestamp: ns(point.timestampMs), accuracy: [] };
  });
}

function savedRide(session: ActivitySession): SavedSharedRide | null {
  const [endTime] = session.endTime;
  if (session.isActive || endTime === undefined || session.distance === 0n) return null;
  return { id: session.id, startTime: session.startTime, endTime, distance: session.distance };
}

/** Finish the existing live session first. A ride without one uses the idempotent completed-ride API. */
export async function saveSharedRide(ride: SharedRide, identity: Identity): Promise<SavedSharedRide | null> {
  const actor = getBikeraUserActor({}, identity);
  const rider = identity.getPrincipal();
  const distance = BigInt(Math.max(0, Math.round(ride.distanceM)));
  const maxSpeed = BigInt(Math.max(0, Math.round(ride.maxKmh)));
  const avgSpeed = BigInt(Math.max(0, Math.round(ride.avgKmh)));

  if (ride.sessionId) {
    const [session] = await actor.getActivitySession(rider, ride.sessionId);
    if (session) {
      let finished = session;
      if (session.isActive) {
        const lastSaved = session.route.reduce((last, point) => point.timestamp > last ? point.timestamp : last, 0n);
        const unsaved = toCanisterRoute(ride.route.filter((point) => ns(point.timestampMs) > lastSaved));
        if (unsaved.length || distance !== session.distance) {
          const update = await actor.updateActivitySessionWithPoints(ride.sessionId, distance, maxSpeed, avgSpeed, unsaved, rider);
          if ('err' in update) throw new Error(update.err);
        }

        // Both an error response and a lost response can follow a successful end request.
        const end = await actor.endActivitySession(ride.sessionId, rider).catch(() => null);
        const [confirmed] = await actor.getActivitySession(rider, ride.sessionId);
        if (!confirmed || confirmed.isActive || !confirmed.endTime.length) {
          throw new Error(end && 'err' in end ? end.err : 'Could not confirm your saved ride. Try again.');
        }
        finished = confirmed;
      }
      const saved = savedRide(finished);
      if (saved) return saved;
    }
  }

  if (distance === 0n) return null;
  const routePoints = toCanisterRoute(ride.route);
  const first = routePoints[0];
  const last = routePoints[routePoints.length - 1];
  if (!first || !last) throw new Error('No GPS points are available to save this ride.');
  const startTime = ns(ride.startMs);
  const endTime = ns(Math.max(ride.startMs + 1, ride.endMs));
  const result = await actor.submitCompletedRide({
    distance,
    duration: BigInt(Math.max(0, ride.durationSeconds)) * 1_000n,
    maxSpeed,
    avgSpeed,
    pointCount: BigInt(ride.route.length),
    timestamp: startTime,
    startPoint: { ...first, timestamp: startTime },
    endPoint: { ...last, timestamp: endTime },
    routePoints,
  });
  if ('err' in result) throw new Error(result.err);
  return { id: result.ok, startTime, endTime, distance };
}
