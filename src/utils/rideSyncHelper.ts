/**
 * Ride Sync Helper - Converts between LocalRideTracker format and canister format
 * Enables seamless integration with batch update methods
 * Adapted for React Native
 */
import { Principal } from '@dfinity/principal';
import { RideSummary, LocationPoint as LocalLocationPoint } from './localRideTracker';
import { getBikeraUserActor, getBikeraXpActor } from './actors';

/**
 * Convert local LocationPoint to canister LocationPoint format
 */
export function convertLocationPointToCanister(point: LocalLocationPoint): {
  latitude: number;
  longitude: number;
  timestamp: bigint;
  accuracy: [] | [number];
  speed?: [] | [number];
} {
  return {
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp: BigInt(point.timestamp * 1_000_000), // Convert ms to nanoseconds
    accuracy: point.accuracy !== undefined ? [point.accuracy] : [],
    speed: point.speed !== undefined ? [point.speed] : []
  };
}

/**
 * Sync ride summary to canister using batch update method
 */
export async function syncRideSummaryToCanister(
  userId: Principal,
  summary: RideSummary,
  identity?: any
): Promise<string> {
  const userActor = getBikeraUserActor({}, identity);
  
  // Convert route points to canister format
  const routePoints = summary.routePoints.map(convertLocationPointToCanister);
  
  // Convert summary to canister format
  const canisterSummary = {
    distance: BigInt(Math.round(summary.distance)),
    duration: BigInt(summary.duration), // Already in milliseconds
    maxSpeed: summary.maxSpeed,
    avgSpeed: summary.avgSpeed,
    pointCount: BigInt(summary.pointCount),
    startPoint: convertLocationPointToCanister(summary.startPoint),
    endPoint: convertLocationPointToCanister(summary.endPoint),
    routePoints: routePoints,
    timestamp: BigInt(summary.startPoint.timestamp * 1_000_000) // Convert ms to nanoseconds
  };
  
  const result = await (userActor as any).updateActivitySessionWithSummary(userId, canisterSummary);
  
  if (result && 'ok' in result) {
    return result.ok;
  } else if (result && 'err' in result) {
    throw new Error(String(result.err));
  } else {
    throw new Error('Unexpected response format');
  }
}

/**
 * Sync distance XP to canister using batch update method
 */
export async function syncDistanceXPToCanister(
  userId: Principal,
  distance: number, // meters
  identity?: any
): Promise<bigint> {
  const xpActor = getBikeraXpActor({}, identity);
  
  const result = await (xpActor as any).addDistanceXPBatch(userId, BigInt(Math.round(distance)));
  
  if (result && 'ok' in result) {
    return result.ok;
  } else if (result && 'err' in result) {
    throw new Error(String(result.err));
  } else {
    throw new Error('Unexpected response format');
  }
}

