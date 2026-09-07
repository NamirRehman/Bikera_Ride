import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface AntiGamingRule {
  'minTimeBetweenWins' : bigint,
  'maxSpeed' : Speed,
  'minDistance' : Distance,
  'maxDailyWins' : bigint,
  'maxConsecutiveWins' : bigint,
  'suspiciousPatternThreshold' : bigint,
}
export interface ConsensusResult {
  'totalParticipants' : bigint,
  'roundId' : RoundId,
  'antiGamingViolations' : bigint,
  'totalDistance' : Distance,
  'consensusTime' : Timestamp,
  'winners' : Array<UserId>,
  'averageSpeed' : Speed,
}
export type Distance = bigint;
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : ConsensusResult } |
  { 'err' : string };
export type Result_2 = {
    'ok' : {
      'totalActivities' : bigint,
      'canisterName' : string,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'totalRounds' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type RoundId = bigint;
export type Speed = bigint;
export type Timestamp = bigint;
export interface UserActivity {
  'userId' : UserId,
  'distance' : Distance,
  'speed' : Speed,
  'timestamp' : Timestamp,
  'antiGamingScore' : bigint,
  'isValid' : boolean,
}
export type UserId = Principal;
export interface _SERVICE {
  'clearOldData' : ActorMethod<[], Result>,
  'getAntiGamingRules' : ActorMethod<[], AntiGamingRule>,
  'getCanisterStatus' : ActorMethod<[], Result_2>,
  'getConsensusResult' : ActorMethod<[RoundId], [] | [ConsensusResult]>,
  'getDailyWinCount' : ActorMethod<[UserId], bigint>,
  'getUserActivities' : ActorMethod<[UserId], Array<UserActivity>>,
  'getUserWinHistory' : ActorMethod<[UserId], Array<Timestamp>>,
  'recordActivity' : ActorMethod<[UserId, Distance, Speed], Result>,
  'resetUserData' : ActorMethod<[UserId], Result>,
  'selectWinners' : ActorMethod<[RoundId, Array<UserId>, bigint], Result_1>,
  'updateAntiGamingRules' : ActorMethod<[AntiGamingRule], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
