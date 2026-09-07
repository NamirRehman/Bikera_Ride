import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type CanisterId = Principal;
export type ContactId = string;
export type ContactStatus = { 'Closed' : null } |
  { 'InProgress' : null } |
  { 'Resolved' : null } |
  { 'Pending' : null };
export interface ContactSubmission {
  'id' : ContactId,
  'status' : ContactStatus,
  'subject' : string,
  'userId' : [] | [UserId],
  'name' : string,
  'email' : string,
  'message' : string,
  'timestamp' : Timestamp,
  'adminNotes' : [] | [string],
  'respondedAt' : [] | [Timestamp],
}
export type Distance = bigint;
export interface MiningRound {
  'id' : RoundId,
  'startTime' : Timestamp,
  'activeUsers' : Array<UserId>,
  'totalMined' : TokenAmount,
  'isCompleted' : boolean,
  'endTime' : Timestamp,
  'winners' : Array<UserId>,
}
export interface MiningRoundSnapshot {
  'userRank' : [] | [bigint],
  'userWins' : bigint,
  'currentRound' : [] | [MiningRound],
  'roundHistory' : Array<MiningRound>,
  'topWinners' : Array<UserId>,
  'userTotalDistance' : Distance,
}
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : ContactId } |
  { 'err' : string };
export type Result_2 = {
    'ok' : {
      'canisterName' : string,
      'isPaused' : boolean,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type Result_3 = { 'ok' : ContactSubmission } |
  { 'err' : string };
export type Result_4 = {
    'ok' : {
      'resolved' : bigint,
      'closed' : bigint,
      'total' : bigint,
      'pending' : bigint,
      'inProgress' : bigint,
    }
  } |
  { 'err' : string };
export type Result_5 = {
    'ok' : {
      'canisterName' : string,
      'isPaused' : boolean,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'totalRounds' : bigint,
      'currentRoundId' : RoundId,
      'systemConfig' : SystemConfig,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type Result_6 = { 'ok' : Array<UserId> } |
  { 'err' : string };
export type RoundId = bigint;
export type Speed = bigint;
export interface SystemConfig {
  'claimCooldown' : bigint,
  'premineAmount' : TokenAmount,
  'maxClaimPercentage' : bigint,
  'miningInterval' : bigint,
  'maxWinnersPerRound' : bigint,
  'maxSpeed' : Speed,
  'foundationShare' : bigint,
  'minDistancePerRound' : Distance,
  'tokensPerRound' : TokenAmount,
  'globalSolanaCap' : TokenAmount,
  'maxDailyWins' : bigint,
}
export interface SystemStats {
  'totalIMERAClaimed' : TokenAmount,
  'activeUsers' : bigint,
  'totalXP' : bigint,
  'totalIMERAMined' : TokenAmount,
  'systemUptime' : Timestamp,
  'totalRounds' : bigint,
  'totalUsers' : bigint,
}
export type Timestamp = bigint;
export type TokenAmount = bigint;
export type UserId = Principal;
export interface _SERVICE {
  'completeMiningRound' : ActorMethod<[RoundId], Result_6>,
  'deleteContactSubmission' : ActorMethod<[ContactId], Result>,
  'getAllContactSubmissions' : ActorMethod<
    [[] | [bigint], [] | [ContactStatus]],
    Array<ContactSubmission>
  >,
  'getCallerText' : ActorMethod<[], string>,
  'getCanisterIds' : ActorMethod<
    [],
    {
      'xp' : [] | [CanisterId],
      'validator' : [] | [CanisterId],
      'user' : [] | [CanisterId],
      'consensus' : [] | [CanisterId],
      'rewards' : [] | [CanisterId],
      'imera' : [] | [CanisterId],
    }
  >,
  'getCanisterStatus' : ActorMethod<[], Result_5>,
  'getContactStats' : ActorMethod<[], Result_4>,
  'getContactSubmission' : ActorMethod<[ContactId], Result_3>,
  'getCurrentRound' : ActorMethod<[], [] | [MiningRound]>,
  'getFrontendCanisterStatus' : ActorMethod<[], Result_2>,
  'getMiningRoundSnapshot' : ActorMethod<[UserId], MiningRoundSnapshot>,
  'getMyContactSubmissions' : ActorMethod<[], Array<ContactSubmission>>,
  'getRound' : ActorMethod<[RoundId], [] | [MiningRound]>,
  'getSystemConfig' : ActorMethod<[], SystemConfig>,
  'getSystemStats' : ActorMethod<[], SystemStats>,
  'initializeCanisters' : ActorMethod<
    [
      [] | [CanisterId],
      [] | [CanisterId],
      [] | [CanisterId],
      [] | [CanisterId],
      [] | [CanisterId],
      [] | [CanisterId],
    ],
    Result
  >,
  'isAutomatedMiningActive' : ActorMethod<[], boolean>,
  'resetSystem' : ActorMethod<[], Result>,
  'startAutomatedMining' : ActorMethod<[], Result>,
  'stopAutomatedMining' : ActorMethod<[], Result>,
  'submitContactForm' : ActorMethod<[string, string, string, string], Result_1>,
  'updateContactStatus' : ActorMethod<
    [ContactId, ContactStatus, [] | [string]],
    Result
  >,
  'updateSystemConfig' : ActorMethod<[SystemConfig], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
