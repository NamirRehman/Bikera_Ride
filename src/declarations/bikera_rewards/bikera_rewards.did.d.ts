import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type CanisterId = Principal;
export interface ClaimRequest {
  'status' : string,
  'userId' : UserId,
  'processedAt' : [] | [Timestamp],
  'timestamp' : Timestamp,
  'amount' : TokenAmount,
  'reason' : RewardReason,
}
export type Distance = bigint;
export type GoalStakeId = bigint;
export interface GoalStakePosition {
  'id' : GoalStakeId,
  'status' : GoalStakeStatus,
  'stakedAt' : Timestamp,
  'accumulatedRewards' : TokenAmount,
  'userId' : UserId,
  'unlockAt' : Timestamp,
  'lastSnapshotId' : [] | [bigint],
  'amountE8s' : bigint,
  'amount' : TokenAmount,
}
export type GoalStakeStatus = { 'Closed' : null } |
  { 'Active' : null } |
  { 'PendingUnstake' : null };
export interface GoalStakingConfig {
  'roundRewardShare' : bigint,
  'lockPeriod' : bigint,
  'minHoldings' : TokenAmount,
  'minStakeAmount' : TokenAmount,
}
export interface GoalStakingSnapshot {
  'id' : bigint,
  'status' : GoalStakingSnapshotStatus,
  'totalEligibleStake' : TokenAmount,
  'rewardAmount' : TokenAmount,
  'createdAt' : Timestamp,
  'periodEnd' : Timestamp,
  'allocations' : Array<[UserId, TokenAmount]>,
  'periodStart' : Timestamp,
}
export type GoalStakingSnapshotStatus = { 'Distributed' : null } |
  { 'PendingDistribution' : null };
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : GoalStakePosition } |
  { 'err' : string };
export type Result_2 = {
    'ok' : {
      'holdings' : TokenAmount,
      'minHoldings' : TokenAmount,
      'meetsHoldingsRequirement' : boolean,
      'holdingsE8s' : bigint,
      'minStakeAmount' : TokenAmount,
      'canStake' : boolean,
    }
  } |
  { 'err' : string };
export type Result_3 = {
    'ok' : {
      'canisterName' : string,
      'isPaused' : boolean,
      'totalRewards' : bigint,
      'pendingGoalRewards' : TokenAmount,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'totalStaked' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type Result_4 = { 'ok' : TokenAmount } |
  { 'err' : string };
export type Result_5 = { 'ok' : GoalStakingSnapshot } |
  { 'err' : string };
export interface RewardConfig {
  'minStakingAmount' : TokenAmount,
  'stakingLockPeriod' : bigint,
  'stakingRewardRate' : bigint,
  'distanceRewardRate' : bigint,
  'foundationSharePercentage' : bigint,
  'miningRewardPerRound' : TokenAmount,
  'referralBonus' : TokenAmount,
  'achievementBonus' : TokenAmount,
}
export interface RewardDistribution {
  'isCompleted' : boolean,
  'foundationShare' : TokenAmount,
  'distributedAt' : Timestamp,
  'userRewards' : Array<[UserId, TokenAmount]>,
  'roundId' : RoundId,
  'totalReward' : TokenAmount,
}
export type RewardReason = { 'GoalStaking' : bigint } |
  { 'Achievement' : string } |
  { 'Distance' : Distance } |
  { 'Bonus' : string } |
  { 'Mining' : RoundId } |
  { 'Referral' : UserId } |
  { 'Staking' : TokenAmount };
export interface RewardsSnapshot {
  'pendingRewards' : TokenAmount,
  'totalRewards' : TokenAmount,
  'stakingInfo' : Array<StakingInfo>,
  'recentRewards' : Array<UserReward>,
  'goalStakingSummary' : {
    'activePositions' : bigint,
    'pendingRewards' : TokenAmount,
    'totalStaked' : TokenAmount,
  },
}
export type RoundId = bigint;
export interface StakingInfo {
  'unlockTime' : Timestamp,
  'stakedAt' : Timestamp,
  'userId' : UserId,
  'isActive' : boolean,
  'rewardsEarned' : TokenAmount,
  'amount' : TokenAmount,
}
export type Timestamp = bigint;
export type TokenAmount = bigint;
export type UserId = Principal;
export interface UserReward {
  'userId' : UserId,
  'isClaimed' : boolean,
  'claimedAt' : [] | [Timestamp],
  'roundId' : [] | [RoundId],
  'timestamp' : Timestamp,
  'amount' : TokenAmount,
  'reason' : RewardReason,
}
export interface _SERVICE {
  'calculateGoalStakingRewards' : ActorMethod<[Timestamp, Timestamp], Result_5>,
  'claimReward' : ActorMethod<[bigint, UserId], Result>,
  'clearOldData' : ActorMethod<[], Result>,
  'distributeAchievementReward' : ActorMethod<[UserId, string], Result>,
  'distributeDistanceReward' : ActorMethod<[UserId, Distance], Result_4>,
  'distributeGoalStakingRewards' : ActorMethod<[bigint], Result>,
  'distributeMiningRewards' : ActorMethod<
    [RoundId, Array<UserId>, TokenAmount],
    Result
  >,
  'distributeReferralReward' : ActorMethod<[UserId, UserId], Result>,
  'emergencyPause' : ActorMethod<[], Result>,
  'emergencyResume' : ActorMethod<[], Result>,
  'getActiveStaking' : ActorMethod<[UserId, [] | [bigint]], Array<StakingInfo>>,
  'getAllRewards' : ActorMethod<[], Array<[UserId, Array<UserReward>]>>,
  'getAllRewardsCapped' : ActorMethod<
    [[] | [bigint], [] | [bigint]],
    Array<[UserId, Array<UserReward>]>
  >,
  'getCanisterStatus' : ActorMethod<[], Result_3>,
  'getClaimRequest' : ActorMethod<[string], [] | [ClaimRequest]>,
  'getGoalSnapshot' : ActorMethod<[bigint], [] | [GoalStakingSnapshot]>,
  'getGoalStakePositions' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<GoalStakePosition>
  >,
  'getGoalStakingConfig' : ActorMethod<[], GoalStakingConfig>,
  'getGoalStakingEligibility' : ActorMethod<[UserId], Result_2>,
  'getGoalStakingMetrics' : ActorMethod<
    [],
    {
      'totalSnapshots' : bigint,
      'totalDistributedRewards' : TokenAmount,
      'automatedSystemActive' : boolean,
      'totalActiveStakeAmount' : TokenAmount,
      'pendingSnapshots' : bigint,
      'totalActiveStakes' : bigint,
      'totalPendingRewards' : TokenAmount,
    }
  >,
  'getGoalStakingSummary' : ActorMethod<
    [UserId],
    {
      'totalActiveStake' : TokenAmount,
      'pendingDistributionPool' : TokenAmount,
      'accumulatedRewards' : TokenAmount,
      'config' : GoalStakingConfig,
      'positions' : Array<GoalStakePosition>,
    }
  >,
  'getPendingClaimRequests' : ActorMethod<[], Array<[string, ClaimRequest]>>,
  'getPendingGoalSnapshots' : ActorMethod<[], Array<GoalStakingSnapshot>>,
  'getRewardConfig' : ActorMethod<[], RewardConfig>,
  'getRewardDistribution' : ActorMethod<[RoundId], [] | [RewardDistribution]>,
  'getRewardsByRound' : ActorMethod<[RoundId], Array<[UserId, UserReward]>>,
  'getRewardsSnapshot' : ActorMethod<[UserId], RewardsSnapshot>,
  'getRewardsSummary' : ActorMethod<
    [],
    {
      'rewardsByUser' : Array<[UserId, bigint, TokenAmount]>,
      'totalRewards' : bigint,
      'totalAmount' : TokenAmount,
      'totalUsers' : bigint,
      'unclaimedAmount' : TokenAmount,
    }
  >,
  'getStakingInfo' : ActorMethod<[UserId, [] | [bigint]], Array<StakingInfo>>,
  'getTotalDistributed' : ActorMethod<[], TokenAmount>,
  'getTotalStaked' : ActorMethod<[], TokenAmount>,
  'getTotalUnclaimedRewards' : ActorMethod<[UserId], TokenAmount>,
  'getUnclaimedRewards' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<UserReward>
  >,
  'getUserRewards' : ActorMethod<[UserId, [] | [bigint]], Array<UserReward>>,
  'isAutomatedGoalStakingActive' : ActorMethod<[], boolean>,
  'isSystemPaused' : ActorMethod<[], boolean>,
  'listGoalSnapshots' : ActorMethod<
    [[] | [bigint]],
    Array<GoalStakingSnapshot>
  >,
  'processClaimRequest' : ActorMethod<[string, boolean], Result>,
  'setCanisterReferences' : ActorMethod<
    [CanisterId, CanisterId, CanisterId],
    Result
  >,
  'stakeGoalTokens' : ActorMethod<[TokenAmount], Result_1>,
  'stakeTokens' : ActorMethod<[TokenAmount, UserId], Result>,
  'startAutomatedGoalStakingRewards' : ActorMethod<[], Result>,
  'stopAutomatedGoalStakingRewards' : ActorMethod<[], Result>,
  'testAddReward' : ActorMethod<[UserId, TokenAmount, [] | [RoundId]], Result>,
  'unstakeGoalTokens' : ActorMethod<[GoalStakeId], Result_1>,
  'unstakeTokens' : ActorMethod<[bigint, UserId], Result>,
  'updateGoalStakingConfig' : ActorMethod<[GoalStakingConfig], Result>,
  'updateRewardConfig' : ActorMethod<[RewardConfig], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
