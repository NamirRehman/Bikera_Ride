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
export interface CreateGroupStakeRequest {
  'stakeAmountE8s' : bigint,
  'title' : string,
  'invitedUsernames' : Array<string>,
  'targetDistanceKm' : bigint,
  'maxMembers' : bigint,
  'inviteCode' : [] | [string],
  'visibility' : StakeVisibility,
  'durationWeeks' : bigint,
  'joinWindowHours' : [] | [bigint],
}
export interface CreateSoloStakeRequest {
  'stakeAmountE8s' : bigint,
  'title' : string,
  'targetDistanceKm' : bigint,
  'durationWeeks' : bigint,
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
export interface JoinGroupStakeRequest {
  'stakeAmountE8s' : bigint,
  'stakeId' : MovementStakeId,
  'inviteCode' : [] | [string],
}
export type MemberStatus = { 'Refunded' : null } |
  { 'Paid' : null } |
  { 'Releasing' : null } |
  { 'Active' : null } |
  { 'Released' : null } |
  { 'Locked' : null } |
  { 'StakeReturned' : null } |
  { 'Slashed' : null };
export interface MovementAttestationPolicy {
  'solo' : ProvenanceRequirement,
  'group' : ProvenanceRequirement,
}
export interface MovementStake {
  'id' : StakeId,
  'status' : StakeStatus__1,
  'terms' : StakeTerms,
  'title' : string,
  'creator' : UserId__1,
  'members' : Array<StakeMember>,
  'settlementNote' : string,
  'mode' : StakeMode__1,
  'createdAt' : Timestamp__1,
  'totalStakedE8s' : bigint,
  'maxMembers' : bigint,
  'verifiedDistanceM' : bigint,
  'inviteCode' : [] | [string],
  'visibility' : Visibility,
  'joinDeadline' : Timestamp__1,
  'settledAt' : [] | [Timestamp__1],
}
export type MovementStakeId = bigint;
export interface MovementStakingConfig {
  'maxSettlementsPerBatch' : bigint,
  'maxGroupMembers' : bigint,
  'autoSettleIntervalSeconds' : bigint,
  'paused' : boolean,
}
export interface MovementStakingMetrics {
  'automatedSettlementActive' : boolean,
  'lifetimeRewardsPaidE8s' : bigint,
  'soloStakes' : bigint,
  'activeStakes' : bigint,
  'totalEscrowedE8s' : bigint,
  'succeededStakes' : bigint,
  'groupStakes' : bigint,
  'dueForSettlement' : bigint,
  'lifetimeStakeReturnedE8s' : bigint,
  'totalStakes' : bigint,
  'failedStakes' : bigint,
  'lifetimeSlashedE8s' : bigint,
}
export interface MovementStakingSummary {
  'projectedRewardE8s' : bigint,
  'activeStakes' : Array<MovementStake>,
  'successCount' : bigint,
  'lifetimeRewardE8s' : bigint,
  'config' : MovementStakingConfig,
  'failureCount' : bigint,
  'settledStakes' : Array<MovementStake>,
  'activeStakedE8s' : bigint,
  'lifetimeSlashedE8s' : bigint,
}
export type ProvenanceRequirement = { 'Attested' : null } |
  { 'Confirmed' : null } |
  { 'AnyVerified' : null };
export type ProvenanceRequirement__1 = { 'Attested' : null } |
  { 'Confirmed' : null } |
  { 'AnyVerified' : null };
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : GoalStakePosition } |
  { 'err' : string };
export type Result_10 = { 'ok' : GoalStakingSnapshot } |
  { 'err' : string };
export type Result_2 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_3 = { 'ok' : SettlementOutcome } |
  { 'err' : string };
export type Result_4 = { 'ok' : StakeQuote } |
  { 'err' : string };
export type Result_5 = { 'ok' : MovementStake } |
  { 'err' : string };
export type Result_6 = { 'ok' : StakeProgress } |
  { 'err' : string };
export type Result_7 = {
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
export type Result_8 = {
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
export type Result_9 = { 'ok' : TokenAmount } |
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
export interface RewardMatchRow {
  'timestamp' : Timestamp,
  'amount' : TokenAmount,
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
export interface SettlementOutcome {
  'status' : StakeStatus,
  'membersSlashed' : bigint,
  'membersLocked' : bigint,
  'stakeId' : MovementStakeId,
  'note' : string,
  'unlockAt' : [] | [Timestamp],
  'stakeLockedE8s' : bigint,
  'targetMet' : boolean,
  'targetDistanceM' : bigint,
  'rewardPaidE8s' : bigint,
  'verifiedDistanceM' : bigint,
  'stakeSlashedE8s' : bigint,
  'stakeReturnedE8s' : bigint,
  'membersPaid' : bigint,
}
export type StakeId = bigint;
export interface StakeMember {
  'status' : MemberStatus,
  'stakeAmountE8s' : bigint,
  'userId' : UserId__1,
  'escrowedE8s' : bigint,
  'joinedAt' : Timestamp__1,
  'rewardE8s' : bigint,
  'verifiedDistanceM' : bigint,
  'contributionStart' : Timestamp__1,
  'payoutE8s' : bigint,
}
export type StakeMode = { 'Group' : null } |
  { 'Solo' : null };
export type StakeMode__1 = { 'Group' : null } |
  { 'Solo' : null };
export interface StakeProgress {
  'requiredProvenance' : ProvenanceRequirement__1,
  'startTime' : Timestamp__1,
  'status' : StakeStatus__1,
  'endTime' : Timestamp__1,
  'stakeId' : StakeId,
  'liveDistanceM' : bigint,
  'timeRemainingNs' : bigint,
  'targetDistanceM' : bigint,
  'allSourcesDistanceM' : bigint,
  'progressBasisPoints' : bigint,
  'verifiedDistanceM' : bigint,
  'nowTs' : Timestamp__1,
  'unverifiedDistanceM' : bigint,
  'isSettleable' : boolean,
  'memberProgress' : Array<[UserId__1, bigint]>,
}
export interface StakeQuote {
  'stakeAmountE8s' : bigint,
  'targetDistanceKm' : bigint,
  'targetDistanceM' : bigint,
  'totalPayoutE8s' : bigint,
  'rewardE8s' : bigint,
  'rewardPercentMicro' : bigint,
  'durationNs' : bigint,
  'durationWeeks' : bigint,
}
export type StakeStatus = { 'Failed' : null } |
  { 'Active' : null } |
  { 'Settling' : null } |
  { 'Succeeded' : null } |
  { 'Cancelled' : null };
export type StakeStatus__1 = { 'Failed' : null } |
  { 'Active' : null } |
  { 'Settling' : null } |
  { 'Succeeded' : null } |
  { 'Cancelled' : null };
export interface StakeTerms {
  'startTime' : Timestamp__1,
  'endTime' : Timestamp__1,
  'targetDistanceKm' : bigint,
  'targetDistanceM' : bigint,
  'rewardPercentMicro' : bigint,
  'durationWeeks' : bigint,
}
export type StakeVisibility = { 'Private' : null } |
  { 'Public' : null };
export interface StakingInfo {
  'unlockTime' : Timestamp,
  'stakedAt' : Timestamp,
  'userId' : UserId,
  'isActive' : boolean,
  'rewardsEarned' : TokenAmount,
  'amount' : TokenAmount,
}
export type Timestamp = bigint;
export type Timestamp__1 = bigint;
export type TokenAmount = bigint;
export type UserId = Principal;
export type UserId__1 = Principal;
export interface UserReward {
  'userId' : UserId,
  'isClaimed' : boolean,
  'claimedAt' : [] | [Timestamp],
  'roundId' : [] | [RoundId],
  'timestamp' : Timestamp,
  'amount' : TokenAmount,
  'reason' : RewardReason,
}
export type Visibility = { 'Private' : null } |
  { 'Public' : null };
export interface _SERVICE {
  'addAdminPrincipal' : ActorMethod<[Principal], Result>,
  'adminCancelMovementStake' : ActorMethod<[MovementStakeId, string], Result_5>,
  'calculateGoalStakingRewards' : ActorMethod<
    [Timestamp, Timestamp],
    Result_10
  >,
  'claimLockedMovementStake' : ActorMethod<[MovementStakeId], Result_2>,
  'claimReward' : ActorMethod<[bigint, UserId], Result>,
  'clearOldData' : ActorMethod<[], Result>,
  'createGroupStake' : ActorMethod<[CreateGroupStakeRequest], Result_5>,
  'createSoloStake' : ActorMethod<[CreateSoloStakeRequest], Result_5>,
  'distributeAchievementReward' : ActorMethod<[UserId, string], Result>,
  'distributeDistanceReward' : ActorMethod<[UserId, Distance], Result_9>,
  'distributeGoalStakingRewards' : ActorMethod<[bigint], Result>,
  'distributeMiningRewards' : ActorMethod<
    [RoundId, Array<UserId>, TokenAmount],
    Result
  >,
  'distributeReferralReward' : ActorMethod<[UserId, UserId], Result>,
  'emergencyPause' : ActorMethod<[], Result>,
  'emergencyResume' : ActorMethod<[], Result>,
  'forceResetMovementSettlement' : ActorMethod<[MovementStakeId], Result>,
  'getActiveStaking' : ActorMethod<[UserId, [] | [bigint]], Array<StakingInfo>>,
  'getAllRewards' : ActorMethod<[], Array<[UserId, Array<UserReward>]>>,
  'getAllRewardsCapped' : ActorMethod<
    [[] | [bigint], [] | [bigint]],
    Array<[UserId, Array<UserReward>]>
  >,
  'getCanisterStatus' : ActorMethod<[], Result_8>,
  'getClaimRequest' : ActorMethod<[string], [] | [ClaimRequest]>,
  'getGoalSnapshot' : ActorMethod<[bigint], [] | [GoalStakingSnapshot]>,
  'getGoalStakePositions' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<GoalStakePosition>
  >,
  'getGoalStakingConfig' : ActorMethod<[], GoalStakingConfig>,
  'getGoalStakingEligibility' : ActorMethod<[UserId], Result_7>,
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
  'getMovementAttestationPolicy' : ActorMethod<[], MovementAttestationPolicy>,
  'getMovementRewardPercentMicro' : ActorMethod<[bigint, bigint], bigint>,
  'getMovementRewardPercentMicroForMode' : ActorMethod<
    [StakeMode, bigint, bigint],
    bigint
  >,
  'getMovementSlashPoolBalance' : ActorMethod<[], Result_2>,
  'getMovementStake' : ActorMethod<[MovementStakeId], [] | [MovementStake]>,
  'getMovementStakeInviteCode' : ActorMethod<[MovementStakeId], Result>,
  'getMovementStakeProgress' : ActorMethod<[MovementStakeId], Result_6>,
  'getMovementStakeRequirement' : ActorMethod<
    [MovementStakeId],
    ProvenanceRequirement
  >,
  'getMovementStakesDueForSettlement' : ActorMethod<
    [[] | [bigint]],
    Array<MovementStakeId>
  >,
  'getMovementStakingBounds' : ActorMethod<
    [],
    {
      'groupMaxDistanceKm' : bigint,
      'groupMinDistanceKm' : bigint,
      'e8sPerToken' : bigint,
      'soloMaxDistanceKm' : bigint,
      'soloMinDistanceKm' : bigint,
      'maxDistanceKm' : bigint,
      'minDistanceKm' : bigint,
      'percentScale' : bigint,
      'maxDurationWeeks' : bigint,
      'minDurationWeeks' : bigint,
    }
  >,
  'getMovementStakingConfig' : ActorMethod<[], MovementStakingConfig>,
  'getMovementStakingMetrics' : ActorMethod<[], MovementStakingMetrics>,
  'getMovementStakingSummary' : ActorMethod<[UserId], MovementStakingSummary>,
  'getPendingClaimRequests' : ActorMethod<[], Array<[string, ClaimRequest]>>,
  'getPendingGoalSnapshots' : ActorMethod<[], Array<GoalStakingSnapshot>>,
  'getRewardConfig' : ActorMethod<[], RewardConfig>,
  'getRewardDistribution' : ActorMethod<[RoundId], [] | [RewardDistribution]>,
  'getRewardMatchRows' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<RewardMatchRow>
  >,
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
  'getUserMovementStakes' : ActorMethod<
    [UserId, [] | [bigint], [] | [bigint]],
    Array<MovementStake>
  >,
  'getUserRewards' : ActorMethod<[UserId, [] | [bigint]], Array<UserReward>>,
  'getUserRewardsSnapshot' : ActorMethod<
    [UserId],
    {
      'rewardHistory' : Array<UserReward>,
      'pendingRewards' : TokenAmount,
      'totalRewards' : TokenAmount,
      'activeStakes' : bigint,
      'nextClaimTime' : [] | [Timestamp],
      'canClaim' : boolean,
      'stakedAmount' : TokenAmount,
      'lastReward' : [] | [UserReward],
    }
  >,
  'isAutomatedGoalStakingActive' : ActorMethod<[], boolean>,
  'isAutomatedMovementSettlementActive' : ActorMethod<[], boolean>,
  'isSystemPaused' : ActorMethod<[], boolean>,
  'joinGroupStake' : ActorMethod<[JoinGroupStakeRequest], Result_5>,
  'listGoalSnapshots' : ActorMethod<
    [[] | [bigint]],
    Array<GoalStakingSnapshot>
  >,
  'listOpenGroupStakes' : ActorMethod<
    [[] | [bigint], [] | [bigint]],
    Array<MovementStake>
  >,
  'previewMovementStake' : ActorMethod<[bigint, bigint, bigint], Result_4>,
  'previewMovementStakeForMode' : ActorMethod<
    [StakeMode, bigint, bigint, bigint],
    Result_4
  >,
  'processClaimRequest' : ActorMethod<[string, boolean], Result>,
  'reconcileMovementRelease' : ActorMethod<
    [MovementStakeId, Principal, boolean],
    Result
  >,
  'removeAdminPrincipal' : ActorMethod<[Principal], Result>,
  'setCanisterReferences' : ActorMethod<
    [CanisterId, CanisterId, CanisterId],
    Result
  >,
  'setMovementAttestationPolicy' : ActorMethod<
    [MovementAttestationPolicy],
    Result
  >,
  'setMovementStakingPaused' : ActorMethod<[boolean], Result>,
  'setUserCanisterReference' : ActorMethod<[CanisterId], Result>,
  'settleDueMovementStakes' : ActorMethod<[], Result>,
  'settleMovementStake' : ActorMethod<[MovementStakeId], Result_3>,
  'stakeGoalTokens' : ActorMethod<[TokenAmount], Result_1>,
  'stakeTokens' : ActorMethod<[TokenAmount, UserId], Result>,
  'startAutomatedGoalStakingRewards' : ActorMethod<[], Result>,
  'startAutomatedMovementSettlement' : ActorMethod<[], Result>,
  'stopAutomatedGoalStakingRewards' : ActorMethod<[], Result>,
  'stopAutomatedMovementSettlement' : ActorMethod<[], Result>,
  'sweepMovementSlashPool' : ActorMethod<[Principal, bigint], Result_2>,
  'testAddReward' : ActorMethod<[UserId, TokenAmount, [] | [RoundId]], Result>,
  'unstakeGoalTokens' : ActorMethod<[GoalStakeId], Result_1>,
  'unstakeTokens' : ActorMethod<[bigint, UserId], Result>,
  'updateGoalStakingConfig' : ActorMethod<[GoalStakingConfig], Result>,
  'updateMovementStakingConfig' : ActorMethod<[MovementStakingConfig], Result>,
  'updateRewardConfig' : ActorMethod<[RewardConfig], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
