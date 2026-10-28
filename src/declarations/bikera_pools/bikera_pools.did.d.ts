import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface CreatePoolRequest {
  'startTime' : Timestamp,
  'title' : string,
  'rewardModel' : RewardModel,
  'endTime' : Timestamp,
  'objective' : [] | [PoolObjective],
  'description' : string,
  'networkFee' : bigint,
  'seedAmount' : bigint,
  'inviteCode' : [] | [string],
  'maxParticipants' : bigint,
  'entryFee' : bigint,
  'visibility' : PoolVisibility,
  'poolType' : PoolType,
}
export interface CreatePoolResponse { 'pool' : Pool }
export interface DepositAccount {
  'owner' : Principal,
  'subaccount' : Uint8Array | number[],
}
export interface JoinPoolRequest {
  'team' : [] | [Team],
  'inviteCode' : [] | [string],
  'poolId' : PoolId,
}
export interface JoinPoolResponse { 'pool' : Pool, 'participant' : Participant }
export interface ListPoolsRequest {
  'status' : [] | [PoolStatus],
  'sortBy' : [] | [
    { 'PotAmount' : null } |
      { 'StartTime' : null } |
      { 'ParticipantCount' : null } |
      { 'CreatedAt' : null } |
      { 'EndTime' : null }
  ],
  'sortOrder' : [] | [{ 'Asc' : null } | { 'Desc' : null }],
  'offset' : bigint,
  'onlyPublic' : boolean,
  'limit' : bigint,
  'poolType' : [] | [PoolType],
}
export interface ListPoolsResponse {
  'total' : bigint,
  'hasMore' : boolean,
  'pools' : Array<PoolSummary>,
}
export type ObjectiveType = { 'TotalTime' : bigint } |
  { 'Custom' : string } |
  { 'AverageSpeed' : bigint } |
  { 'TotalRides' : bigint } |
  { 'TotalDistance' : bigint };
export interface Participant {
  'userId' : Principal,
  'joinedAt' : Timestamp,
  'team' : [] | [Team],
  'hasPaidEntry' : boolean,
  'rideSubmissions' : Array<RideSubmission>,
}
export interface ParticipantScore {
  'userId' : Principal,
  'team' : [] | [Team],
  'submissions' : Array<RideSubmission>,
  'score' : bigint,
  'totalDistance' : bigint,
  'bestAvgSpeed' : bigint,
  'bestMaxSpeed' : bigint,
}
export interface Pool {
  'id' : PoolId,
  'startTime' : Timestamp,
  'status' : PoolStatus,
  'title' : string,
  'rewardModel' : RewardModel,
  'endTime' : Timestamp,
  'owner' : Principal,
  'objective' : [] | [PoolObjective],
  'createdAt' : Timestamp,
  'description' : string,
  'networkFee' : bigint,
  'seedAmount' : bigint,
  'updatedAt' : Timestamp,
  'inviteCode' : [] | [string],
  'participantCount' : bigint,
  'maxParticipants' : bigint,
  'entryFee' : bigint,
  'visibility' : PoolVisibility,
  'poolType' : PoolType,
  'potAmount' : bigint,
}
export type PoolId = string;
export interface PoolObjective {
  'description' : [] | [string],
  'objectiveType' : ObjectiveType,
  'targetValue' : bigint,
}
export interface PoolResult {
  'leaderboard' : Array<ParticipantScore>,
  'totalPot' : bigint,
  'finalizedAt' : Timestamp,
  'payouts' : Array<[Principal, bigint]>,
}
export type PoolStatus = { 'Closed' : null } |
  { 'Active' : null } |
  { 'Draft' : null } |
  { 'Cancelled' : null };
export interface PoolSummary {
  'id' : PoolId,
  'startTime' : Timestamp,
  'status' : PoolStatus,
  'title' : string,
  'rewardModel' : RewardModel,
  'stakeLockPolicy' : boolean,
  'endTime' : Timestamp,
  'owner' : Principal,
  'createdAt' : Timestamp,
  'description' : string,
  'networkFee' : bigint,
  'seedAmount' : bigint,
  'participantCount' : bigint,
  'maxParticipants' : bigint,
  'entryFee' : bigint,
  'visibility' : PoolVisibility,
  'poolType' : PoolType,
  'potAmount' : bigint,
}
export type PoolType = { 'SpeedEfficiency' : null } |
  { 'Custom' : null } |
  { 'Consistency' : null } |
  { 'TeamRelay' : null } |
  { 'CheckpointRally' : null } |
  { 'DistanceKing' : null } |
  { 'EcoMode' : null };
export type PoolVisibility = { 'Private' : null } |
  { 'Public' : null };
export interface RaceSeedRefundInfo {
  'pending' : boolean,
  'claimed' : boolean,
  'amount' : bigint,
}
export interface RaceStakeInfo {
  'pending' : boolean,
  'unlockAt' : Timestamp,
  'claimed' : boolean,
  'isWinner' : boolean,
  'amount' : bigint,
}
export type Result = { 'ok' : RideSubmission } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_10 = {
    'ok' : {
      'total' : bigint,
      'hasMore' : boolean,
      'leaderboard' : Array<ParticipantScore>,
    }
  } |
  { 'err' : string };
export type Result_11 = { 'ok' : Array<ParticipantScore> } |
  { 'err' : string };
export type Result_12 = {
    'ok' : {
      'activePools' : bigint,
      'canisterName' : string,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'totalPools' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type Result_13 = { 'ok' : CreatePoolResponse } |
  { 'err' : string };
export type Result_14 = { 'ok' : Pool } |
  { 'err' : string };
export type Result_2 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_3 = { 'ok' : JoinPoolResponse } |
  { 'err' : string };
export type Result_4 = { 'ok' : boolean } |
  { 'err' : string };
export type Result_5 = {
    'ok' : { 'teamA' : TeamProgress, 'teamB' : TeamProgress }
  } |
  { 'err' : string };
export type Result_6 = { 'ok' : { 'teamA' : TeamScore, 'teamB' : TeamScore } } |
  { 'err' : string };
export type Result_7 = { 'ok' : DepositAccount } |
  { 'err' : string };
export type Result_8 = {
    'ok' : {
      'participants' : Array<Participant>,
      'total' : bigint,
      'hasMore' : boolean,
    }
  } |
  { 'err' : string };
export type Result_9 = { 'ok' : Array<Participant> } |
  { 'err' : string };
export type RewardModel = { 'Proportional' : null } |
  { 'TopThree' : null } |
  { 'WinnerTakesAll' : null };
export type RideSessionId = string;
export interface RideSubmission {
  'duration' : bigint,
  'avgSpeed' : bigint,
  'maxSpeed' : bigint,
  'submittedAt' : Timestamp,
  'distance' : bigint,
  'sessionId' : RideSessionId,
}
export interface SubmitRideRequest {
  'sessionId' : RideSessionId,
  'poolId' : PoolId,
}
export type Team = { 'TeamA' : null } |
  { 'TeamB' : null };
export interface TeamProgress {
  'completedAt' : [] | [Timestamp],
  'isCompleted' : boolean,
  'team' : Team,
  'percentageComplete' : bigint,
  'currentValue' : bigint,
  'targetValue' : bigint,
}
export interface TeamScore {
  'participants' : Array<ParticipantScore>,
  'team' : Team,
  'totalScore' : bigint,
  'totalDistance' : bigint,
  'participantCount' : bigint,
}
export type Timestamp = bigint;
export interface _SERVICE {
  'activatePool' : ActorMethod<[PoolId], Result_14>,
  'autoCloseExpiredPools' : ActorMethod<[], bigint>,
  'cancelPool' : ActorMethod<[PoolId, [] | [string]], Result_14>,
  'claimCancelledRaceSeed' : ActorMethod<[PoolId], Result_2>,
  'claimRaceStake' : ActorMethod<[PoolId], Result_2>,
  'claimReward' : ActorMethod<[PoolId], Result_2>,
  'closePool' : ActorMethod<[PoolId], Result_14>,
  'createPool' : ActorMethod<[CreatePoolRequest], Result_13>,
  'getActivePools' : ActorMethod<[bigint, bigint], Array<PoolSummary>>,
  'getAllPools' : ActorMethod<[bigint, bigint], Array<PoolSummary>>,
  'getCanisterStatus' : ActorMethod<[], Result_12>,
  'getClosedPools' : ActorMethod<[bigint, bigint], Array<PoolSummary>>,
  'getLeaderboard' : ActorMethod<[PoolId], Result_11>,
  'getLeaderboardPaginated' : ActorMethod<[PoolId, bigint, bigint], Result_10>,
  'getMyCancelledRaceSeedInfo' : ActorMethod<
    [PoolId],
    [] | [RaceSeedRefundInfo]
  >,
  'getMyPendingRaceCreations' : ActorMethod<[], Array<[PoolId, bigint]>>,
  'getMyRaceStakeInfo' : ActorMethod<[PoolId], [] | [RaceStakeInfo]>,
  'getMyRaceUsage' : ActorMethod<
    [],
    {
      'created' : bigint,
      'maxCreated' : bigint,
      'joined' : bigint,
      'maxJoined' : bigint,
    }
  >,
  'getParticipants' : ActorMethod<[PoolId], Result_9>,
  'getParticipantsPaginated' : ActorMethod<[PoolId, bigint, bigint], Result_8>,
  'getPool' : ActorMethod<[PoolId], [] | [Pool]>,
  'getPoolDepositAccount' : ActorMethod<[PoolId], Result_7>,
  'getPoolObjective' : ActorMethod<[PoolId], [] | [PoolObjective]>,
  'getPoolResult' : ActorMethod<[PoolId], [] | [PoolResult]>,
  'getRaceLimits' : ActorMethod<
    [],
    { 'maxCreated' : bigint, 'maxJoined' : bigint }
  >,
  'getTeamLeaderboard' : ActorMethod<[PoolId], Result_6>,
  'getTeamProgress' : ActorMethod<[PoolId], Result_5>,
  'getTotalNetworkFees' : ActorMethod<[], bigint>,
  'hasClaimedReward' : ActorMethod<[PoolId, Principal], boolean>,
  'hasTeamCompletedObjective' : ActorMethod<[PoolId, Team], Result_4>,
  'isParticipant' : ActorMethod<[PoolId, Principal], boolean>,
  'joinPool' : ActorMethod<[JoinPoolRequest], Result_3>,
  'listPools' : ActorMethod<[boolean], Array<PoolSummary>>,
  'listPoolsPaginated' : ActorMethod<[ListPoolsRequest], ListPoolsResponse>,
  'reconcilePendingRaceCreation' : ActorMethod<[PoolId, boolean], Result_1>,
  'reconcilePendingRaceJoin' : ActorMethod<
    [PoolId, Principal, boolean],
    Result_1
  >,
  'reconcileRaceClaim' : ActorMethod<
    [PoolId, Principal, boolean, boolean],
    Result_1
  >,
  'reconcileRacePrizeClaim' : ActorMethod<
    [PoolId, Principal, boolean],
    Result_1
  >,
  'refundLegacySoloRace' : ActorMethod<[PoolId], Result_2>,
  'setRaceLimits' : ActorMethod<[bigint, bigint], Result_1>,
  'submitRide' : ActorMethod<[SubmitRideRequest], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
