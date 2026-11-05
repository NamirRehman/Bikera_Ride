import { Principal } from '@dfinity/principal';
import { getBikeraMobilityActor, getBikeraUserActor } from '../utils/actors';
import { requireRiderIdentity, withTimeout } from './integration-utils';
import { eraseLocalRides } from './rideFiles';

/** Keep the same signed identity until both canisters have processed deletion. */
export async function eraseRiderAccount(identity: unknown, principal: string): Promise<{ partnerError: string | null; localError: string | null }> {
  const signed = requireRiderIdentity(identity, principal);
  const rider = Principal.fromText(principal);
  const result = await withTimeout(getBikeraUserActor({}, signed).eraseUserDataGDPR(rider), 30_000, 'Account deletion timed out. Check your connection and retry.');
  if ('err' in result) throw new Error(result.err);
  let partnerError: string | null = null;
  let localError: string | null = null;
  try {
    const partner = await withTimeout(getBikeraMobilityActor({}, signed).eraseRiderData(rider), 15_000, 'Partner-data deletion timed out.');
    if ('err' in partner) throw new Error(partner.err);
  } catch (err) {
    partnerError = err instanceof Error ? err.message : 'Partner-bike data could not be erased.';
  }
  try { await eraseLocalRides(principal); }
  catch (err) { localError = err instanceof Error ? err.message : 'Local ride files could not be erased.'; }
  return { partnerError, localError };
}
