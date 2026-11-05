/**
 * Partner mobility: bike-share operators registered on-chain, and the hand-off a rider makes when
 * opening an operator's app. The hand-off is the evidence a partner ride is credited from.
 */
import type { Principal } from '@dfinity/principal';
import { getBikeraMobilityActor } from '../utils/actors';
import type { QrOperator } from './bikeQr';
import { Platform } from 'react-native';
import { MOBILITY_CONNECTOR_URL } from '../config';
import { requireRiderIdentity, withTimeout } from './integration-utils';
import type { PartnerRide } from '../declarations/bikera_mobility/bikera_mobility.did';
export type { PartnerRide };

type Result<T> = { ok: T } | { err: string };

const unwrap = <T,>(result: Result<T>): T => {
  if ('err' in result) throw new Error(result.err);
  return result.ok;
};

/** Operators that are registered and active. Riders scanning their bikes get a credited ride. */
export async function listActiveOperators(identity?: any): Promise<QrOperator[]> {
  const operators: any[] = await withTimeout(getBikeraMobilityActor({}, identity).listOperators(), 15_000, 'Partner operators could not be loaded.');
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
  vehicleId?: string;
  vehicleTypeId?: string;
  stationId?: string;
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
  const signed = requireRiderIdentity(identity);
  const result = await withTimeout(getBikeraMobilityActor({}, signed).recordHandoff({
    operatorId: target.operatorId,
    systemId: target.systemId,
    vehicleId: opt(target.vehicleId),
    vehicleTypeId: opt(target.vehicleTypeId),
    stationId: opt(target.stationId),
    latitude: opt(target.lat),
    longitude: opt(target.lon),
  }), 3_000, 'The referral could not be saved in time. You can still ride with the operator.');
  return unwrap(result as Result<any>) as Handoff;
}

export type RentalUris = { ios?: string; android?: string; web?: string };
export type PlanSummary = { planId: string; currency: string; summary: string; estimate30MinMinor?: number };
export type MobilitySystem = {
  key: string; operatorId: string; operatorName: string; systemId: string;
  city: string; countryCode: string; center: { lat: number; lon: number } | null;
  vehiclesAvailable: number; pricing: PlanSummary[]; error: string | null;
};
export type NearbyVehicle = {
  id: string; operatorId: string; operatorName: string; systemId: string; systemKey: string;
  lat: number; lon: number; distanceM: number; batteryPercent: number | null;
  vehicleType: { id: string; name: string; formFactor: string; propulsionType: string } | null;
  stationId: string | null; rentalUris: RentalUris; deepLink: boolean; pricing: PlanSummary | null;
};
export type NearbyStation = {
  id: string; operatorId: string; operatorName?: string; systemId: string; systemKey: string;
  name: string; lat: number; lon: number; distanceM: number; vehiclesAvailable: number;
  rentalUris: RentalUris; deepLink: boolean;
};
export type NearbyBikes = { vehicles: NearbyVehicle[]; stations: NearbyStation[] };

async function connector<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', cancel);
  const timer = setTimeout(cancel, 15_000);
  try {
    const response = await fetch(`${MOBILITY_CONNECTOR_URL}${path}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Partner-bike availability could not be loaded (${response.status}).`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

export async function getMobilitySystems(signal?: AbortSignal): Promise<MobilitySystem[]> {
  const systems = await connector<MobilitySystem[]>('/mobility/systems', signal);
  if (!Array.isArray(systems)) throw new Error('The partner service returned an invalid city list.');
  return systems;
}

export async function getNearbyBikes(lat: number, lon: number, system?: string, signal?: AbortSignal): Promise<NearbyBikes> {
  if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) throw new Error('Choose a city or share your location first.');
  const query = new URLSearchParams({ lat: lat.toFixed(5), lon: lon.toFixed(5), radius: '1500', limit: '60' });
  if (system) query.set('system', system);
  const result = await connector<NearbyBikes>(`/mobility/nearby?${query}`, signal);
  if (!Array.isArray(result.vehicles) || !Array.isArray(result.stations)) throw new Error('The partner service returned invalid availability data.');
  return { vehicles: result.vehicles.filter((bike) => !bike.vehicleType || bike.vehicleType.formFactor === 'bicycle'), stations: result.stations };
}

export function rentalLink(uris: RentalUris): string | null {
  return Platform.OS === 'android' ? uris.android || uris.web || uris.ios || null
    : Platform.OS === 'ios' ? uris.ios || uris.web || uris.android || null
    : uris.web || uris.ios || uris.android || null;
}

export async function getMyPartnerRides(identity: unknown, principal: string): Promise<PartnerRide[]> {
  const signed = requireRiderIdentity(identity, principal);
  return withTimeout(getBikeraMobilityActor({}, signed).getMyPartnerRides([20n]), 15_000, 'Your partner rides could not be loaded. Try again.');
}

export function formatFare(minor: bigint, currency: string): string {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(minor) / 100); }
  catch { return `${(Number(minor) / 100).toFixed(2)} ${currency}`; }
}
