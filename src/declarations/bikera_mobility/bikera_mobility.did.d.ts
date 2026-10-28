import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type AttributionSignal = { 'PromoCode' : null } |
  { 'DeepLinkHandoff' : null } |
  { 'Geofence' : null } |
  { 'OperatorReport' : null };
export interface CurrencyTotals {
  'estimatedCommissionMinor' : bigint,
  'estimatedFareMinor' : bigint,
  'reconciledCommissionMinor' : bigint,
  'currency' : string,
  'reconciledFareMinor' : bigint,
}
export interface FareEstimate {
  'amountMinor' : bigint,
  'pricingPlanId' : [] | [string],
  'currency' : string,
}
export interface GbfsSystem {
  'city' : string,
  'systemId' : string,
  'countryCode' : string,
  'gbfsUrl' : string,
}
export interface Handoff {
  'id' : string,
  'status' : HandoffStatus,
  'latitude' : [] | [number],
  'createdAt' : Timestamp,
  'systemId' : string,
  'stationId' : [] | [string],
  'longitude' : [] | [number],
  'operatorId' : string,
  'rider' : Principal,
  'vehicleId' : [] | [string],
  'vehicleTypeId' : [] | [string],
}
export interface HandoffRequest {
  'latitude' : [] | [number],
  'systemId' : string,
  'stationId' : [] | [string],
  'longitude' : [] | [number],
  'operatorId' : string,
  'vehicleId' : [] | [string],
  'vehicleTypeId' : [] | [string],
}
export type HandoffStatus = { 'Open' : null } |
  { 'Attributed' : string };
export interface Operator {
  'id' : string,
  'status' : OperatorStatus,
  'capabilities' : OperatorCapabilities,
  'name' : string,
  'createdAt' : Timestamp,
  'commissionBps' : bigint,
  'attributionWindowMinutes' : bigint,
  'website' : string,
  'updatedAt' : Timestamp,
  'systems' : Array<GbfsSystem>,
}
export interface OperatorCapabilities {
  'deepLinks' : boolean,
  'gbfs' : boolean,
  'partnerApi' : boolean,
  'inAppUnlock' : boolean,
}
export interface OperatorLedger {
  'attributedRides' : bigint,
  'toTs' : Timestamp,
  'totals' : Array<CurrencyTotals>,
  'operatorId' : string,
  'commissionEligibleRides' : bigint,
  'fromTs' : Timestamp,
  'handoffs' : bigint,
  'totalDistanceM' : bigint,
  'reconciledRides' : bigint,
}
export type OperatorStatus = { 'Paused' : null } |
  { 'Active' : null };
export interface PartnerRide {
  'id' : string,
  'startTime' : Timestamp,
  'distanceM' : bigint,
  'endTime' : Timestamp,
  'commissionEligible' : boolean,
  'commissionBps' : bigint,
  'estimatedCommissionMinor' : bigint,
  'systemId' : string,
  'handoffId' : [] | [string],
  'recordedAt' : Timestamp,
  'rideSessionId' : [] | [string],
  'operatorId' : string,
  'signal' : AttributionSignal,
  'confidencePercent' : bigint,
  'estimatedFare' : [] | [FareEstimate],
  'reconciliation' : [] | [Reconciliation],
  'rider' : Principal,
  'evidenceHash' : string,
}
export interface PartnerRideReport {
  'startTime' : Timestamp,
  'distanceM' : bigint,
  'endTime' : Timestamp,
  'systemId' : string,
  'handoffId' : [] | [string],
  'rideSessionId' : [] | [string],
  'operatorId' : string,
  'signal' : AttributionSignal,
  'confidencePercent' : bigint,
  'estimatedFare' : [] | [FareEstimate],
  'rider' : Principal,
  'evidenceHash' : string,
}
export interface ReconcileRequest {
  'reference' : string,
  'currency' : string,
  'commissionMinor' : bigint,
  'operatorFareMinor' : bigint,
}
export interface Reconciliation {
  'reconciledAt' : Timestamp,
  'reconciledBy' : Principal,
  'reference' : string,
  'currency' : string,
  'commissionMinor' : bigint,
  'operatorFareMinor' : bigint,
}
export type Result = { 'ok' : Operator } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_2 = { 'ok' : PartnerRide } |
  { 'err' : string };
export type Result_3 = { 'ok' : Handoff } |
  { 'err' : string };
export type Result_4 = { 'ok' : Array<PartnerRide> } |
  { 'err' : string };
export type Result_5 = { 'ok' : Array<Handoff> } |
  { 'err' : string };
export type Result_6 = { 'ok' : OperatorLedger } |
  { 'err' : string };
export type Timestamp = bigint;
export interface UpsertOperatorRequest {
  'id' : string,
  'capabilities' : OperatorCapabilities,
  'name' : string,
  'commissionBps' : bigint,
  'attributionWindowMinutes' : bigint,
  'website' : string,
  'systems' : Array<GbfsSystem>,
}
export interface _SERVICE {
  'addAdminPrincipal' : ActorMethod<[Principal], Result_1>,
  'addTrustedAttributor' : ActorMethod<[Principal], Result_1>,
  'eraseRiderData' : ActorMethod<[Principal], Result_1>,
  'getMyHandoffs' : ActorMethod<[[] | [bigint]], Array<Handoff>>,
  'getMyPartnerRides' : ActorMethod<[[] | [bigint]], Array<PartnerRide>>,
  'getOperator' : ActorMethod<[string], [] | [Operator]>,
  'getOperatorLedger' : ActorMethod<[string, Timestamp, Timestamp], Result_6>,
  'getStats' : ActorMethod<
    [],
    {
      'operators' : bigint,
      'trustedAttributors' : bigint,
      'handoffs' : bigint,
      'partnerRides' : bigint,
    }
  >,
  'getTrustedAttributors' : ActorMethod<[], Array<Principal>>,
  'listOpenHandoffs' : ActorMethod<[Timestamp, [] | [bigint]], Result_5>,
  'listOperators' : ActorMethod<[], Array<Operator>>,
  'listPartnerRides' : ActorMethod<
    [string, Timestamp, Timestamp, [] | [bigint], [] | [bigint]],
    Result_4
  >,
  'reconcilePartnerRide' : ActorMethod<[string, ReconcileRequest], Result_2>,
  'recordHandoff' : ActorMethod<[HandoffRequest], Result_3>,
  'recordPartnerRide' : ActorMethod<[PartnerRideReport], Result_2>,
  'removeAdminPrincipal' : ActorMethod<[Principal], Result_1>,
  'removeTrustedAttributor' : ActorMethod<[Principal], Result_1>,
  'setOperatorStatus' : ActorMethod<[string, OperatorStatus], Result_1>,
  'upsertOperator' : ActorMethod<[UpsertOperatorRequest], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
