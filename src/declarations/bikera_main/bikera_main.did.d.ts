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
  'timeoutAt' : [] | [Timestamp],
  'submittedAt' : [] | [Timestamp],
  'state' : RoundState,
  'retryCount' : bigint,
  'finalizedAt' : [] | [Timestamp],
  'lastError' : [] | [string],
  'committedAt' : [] | [Timestamp],
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
export type Result = { 'ok' : bigint } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_10 = { 'ok' : Array<Principal> } |
  { 'err' : string };
export type Result_11 = { 'ok' : Array<UserId> } |
  { 'err' : string };
export type Result_2 = { 'ok' : ContactId } |
  { 'err' : string };
export type Result_3 = {
    'ok' : {
      'cursor' : bigint,
      'sourceSize' : bigint,
      'complete' : boolean,
      'processed' : bigint,
    }
  } |
  { 'err' : string };
export type Result_4 = { 'ok' : Array<MiningRound> } |
  { 'err' : string };
export type Result_5 = {
    'ok' : {
      'isStuck' : boolean,
      'timeSinceSubmission' : [] | [Timestamp],
      'monitoring' : [] | [
        {
          'duration' : Timestamp,
          'failedSubmissions' : bigint,
          'retryCount' : bigint,
        }
      ],
      'round' : [] | [MiningRound],
    }
  } |
  { 'err' : string };
export type Result_6 = {
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
export type Result_7 = { 'ok' : ContactSubmission } |
  { 'err' : string };
export type Result_8 = {
    'ok' : {
      'resolved' : bigint,
      'closed' : bigint,
      'total' : bigint,
      'pending' : bigint,
      'inProgress' : bigint,
    }
  } |
  { 'err' : string };
export type Result_9 = {
    'ok' : {
      'canisterName' : string,
      'freezingThreshold' : bigint,
      'isPaused' : boolean,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'totalRounds' : bigint,
      'currentRoundId' : RoundId,
      'memoryAllocation' : bigint,
      'systemConfig' : SystemConfig,
      'computeAllocation' : bigint,
      'reservedCyclesLimit' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type RoundId = bigint;
export type RoundState = { 'Calculating' : null } |
  { 'Committed' : null } |
  { 'Open' : null } |
  { 'Finalized' : null };
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
  'addAdminPrincipal' : ActorMethod<[Principal], Result_1>,
  'completeMiningRound' : ActorMethod<[RoundId], Result_11>,
  'deleteContactSubmission' : ActorMethod<[ContactId], Result_1>,
  'forceRecoverRound' : ActorMethod<[RoundId], Result_1>,
  'getAdminPasswordVersion' : ActorMethod<[], Result>,
  'getAdminPrincipals' : ActorMethod<[], Result_10>,
  'getAllContactSubmissions' : ActorMethod<
    [[] | [bigint], [] | [ContactStatus]],
    Array<ContactSubmission>
  >,
  'getCachedSystemStats' : ActorMethod<[], SystemStats>,
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
  'getCanisterStatus' : ActorMethod<[], Result_9>,
  'getContactStats' : ActorMethod<[], Result_8>,
  'getContactSubmission' : ActorMethod<[ContactId], Result_7>,
  'getCurrentRound' : ActorMethod<[], [] | [MiningRound]>,
  'getFrontendCanisterStatus' : ActorMethod<[], Result_6>,
  'getMiningRoundSnapshot' : ActorMethod<[UserId], MiningRoundSnapshot>,
  'getMyContactSubmissions' : ActorMethod<[], Array<ContactSubmission>>,
  'getRound' : ActorMethod<[RoundId], [] | [MiningRound]>,
  'getRoundArchiveStatus' : ActorMethod<
    [],
    {
      'indexedUsers' : bigint,
      'hotRoundCount' : bigint,
      'cycleBalance' : bigint,
      'migrationCursor' : bigint,
      'archiveDataPages' : bigint,
      'archiveDataBytes' : bigint,
      'migrationComplete' : boolean,
      'migrationSourceSize' : bigint,
    }
  >,
  'getRoundMonitoring' : ActorMethod<[RoundId], Result_5>,
  'getStuckRounds' : ActorMethod<[], Result_4>,
  'getSuperAdminPrincipal' : ActorMethod<[], Principal>,
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
    Result_1
  >,
  'isAutomatedMiningActive' : ActorMethod<[], boolean>,
  'migrateRoundArchive' : ActorMethod<[bigint], Result_3>,
  'removeAdminPrincipal' : ActorMethod<[Principal], Result_1>,
  'resetSystem' : ActorMethod<[], Result_1>,
  'rotateAdminPassword' : ActorMethod<[string, string], Result>,
  'startAutomatedMining' : ActorMethod<[], Result_1>,
  'stopAutomatedMining' : ActorMethod<[], Result_1>,
  'submitContactForm' : ActorMethod<[string, string, string, string], Result_2>,
  'updateContactStatus' : ActorMethod<
    [ContactId, ContactStatus, [] | [string]],
    Result_1
  >,
  'updateSystemConfig' : ActorMethod<[SystemConfig], Result_1>,
  'verifyAdminPassword' : ActorMethod<[string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
