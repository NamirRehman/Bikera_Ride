import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AntiGamingRule {
  'suspiciousLocationThreshold' : number,
  'maxIdenticalRoutes' : bigint,
  'maxConsecutiveIdentical' : bigint,
  'minTimeBetweenRoutes' : bigint,
  'maxRoutesPerDay' : bigint,
}
export type Distance = bigint;
export interface LocationPoint {
  'latitude' : number,
  'altitude' : [] | [number],
  'heading' : [] | [number],
  'longitude' : number,
  'timestamp' : Timestamp,
  'accuracy' : [] | [number],
}
export interface MovementAggregate {
  'duration' : bigint,
  'signature' : [] | [Uint8Array | number[]],
  'avgSpeed' : Speed,
  'maxSpeed' : Speed,
  'sampleCount' : bigint,
  'distance' : Distance,
  'timestamp' : Timestamp,
}
export type Result = { 'ok' : ValidationResult } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_2 = {
    'ok' : {
      'canisterName' : string,
      'registeredWorkers' : bigint,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'totalRoutes' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export interface RouteValidation {
  'duration' : bigint,
  'avgSpeed' : Speed,
  'maxSpeed' : Speed,
  'userId' : UserId,
  'createdAt' : Timestamp,
  'violations' : Array<ValidationViolation>,
  'qualityScore' : number,
  'routeId' : string,
  'totalDistance' : Distance,
  'isValid' : boolean,
  'points' : Array<LocationPoint>,
}
export interface ShadowBatch {
  'workerId' : string,
  'userId' : Principal,
  'summary' : ShadowBatchSummary,
  'proof' : ShadowProof,
}
export interface ShadowBatchSummary {
  'duration' : bigint,
  'avgSpeed' : number,
  'maxSpeed' : number,
  'distance' : bigint,
}
export interface ShadowProof {
  'pointCount' : bigint,
  'merkleRoot' : string,
  'timestamp' : bigint,
  'batchHash' : string,
}
export type Speed = bigint;
export type Timestamp = bigint;
export type UserId = Principal;
export interface ValidationConfig {
  'maxPoints' : bigint,
  'maxSpeed' : Speed,
  'minAccuracy' : number,
  'speedChangeThreshold' : number,
  'minPoints' : bigint,
  'maxGapTime' : bigint,
  'minDistance' : Distance,
  'gpsDriftThreshold' : number,
  'suspiciousPatternThreshold' : number,
}
export interface ValidationResult {
  'duration' : bigint,
  'avgSpeed' : Speed,
  'maxSpeed' : Speed,
  'violations' : Array<ValidationViolation>,
  'distance' : Distance,
  'qualityScore' : number,
  'confidence' : number,
  'isValid' : boolean,
}
export interface ValidationViolation {
  'description' : string,
  'timestamp' : Timestamp,
  'severity' : string,
  'violationType' : string,
}
export interface _SERVICE {
  'clearOldData' : ActorMethod<[], Result_1>,
  'clearUserData' : ActorMethod<[UserId], Result_1>,
  'getAntiGamingRules' : ActorMethod<[], AntiGamingRule>,
  'getCanisterStatus' : ActorMethod<[], Result_2>,
  'getRegisteredWorkers' : ActorMethod<[], Array<string>>,
  'getSuspiciousPatterns' : ActorMethod<[UserId], Array<string>>,
  'getUserDailyRouteCount' : ActorMethod<[UserId, bigint], bigint>,
  'getUserRouteHistory' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<RouteValidation>
  >,
  'getValidationConfig' : ActorMethod<[], ValidationConfig>,
  'getValidationResult' : ActorMethod<[string], [] | [RouteValidation]>,
  'markSuspiciousPattern' : ActorMethod<[UserId, string], Result_1>,
  'registerWorker' : ActorMethod<[string], Result_1>,
  'submitValidatedBatch' : ActorMethod<[ShadowBatch], Result>,
  'updateAntiGamingRules' : ActorMethod<[AntiGamingRule], Result_1>,
  'updateValidationConfig' : ActorMethod<[ValidationConfig], Result_1>,
  'validateMovementAggregate' : ActorMethod<
    [UserId, MovementAggregate],
    Result
  >,
  'validateRoute' : ActorMethod<[UserId, Array<LocationPoint>], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
