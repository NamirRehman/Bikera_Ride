/**
 * Partner mobility: bike-share operators registered on-chain, and the hand-off a rider makes when
 * opening an operator's app. The hand-off is the evidence a partner ride is credited from.
 */
import type { Principal } from '@dfinity/principal';
import { getBikeraMobilityActor } from '../utils/actors';
import type { QrOperator } from './bikeQr';

type Result<T> = { ok: T } | { err: string };

const unwrap = <T,>(result: Result<T>): T => {
  if ('err' in result) throw new Error(result.err);
  return result.ok;
};

/** Operators that are registered and active. Riders scanning their bikes get a credited ride. */
export async function listActiveOperators(identity?: any): Promise<QrOperator[]> {
  const operators: any[] = await getBikeraMobilityActor({}, identity).listOperators();
  return operators
    .filter((op) => 'Active' in op.status)
    .map((op) => ({
      id: op.id,
      name: op.name,
      website: op.website,
      systems: op.systems.map((s: any) => ({ systemId: s.systemId, city: s.city, countryCode: s.countryCode })),
    }));
}

const opt = <T,>(value: T | undefined | null): [] | [T] => (value === undefined || value === null ? [] : [value]);

export interface HandoffTarget {
  operatorId: string;
  systemId: string;
  lat?: number;
  lon?: number;
}

export interface Handoff {
  id: string;
  rider: Principal;
  operatorId: string;
  systemId: string;
  createdAt: bigint;
}

/** Record the hand-off on-chain, so the ride the rider takes next can be credited. */
export async function recordHandoff(identity: any, target: HandoffTarget): Promise<Handoff> {
  const result = await getBikeraMobilityActor({}, identity).recordHandoff({
    operatorId: target.operatorId,
    systemId: target.systemId,
    vehicleId: [],
    vehicleTypeId: [],
    stationId: [],
    latitude: opt(target.lat),
    longitude: opt(target.lon),
  });
  return unwrap(result as Result<any>) as Handoff;
}
