export const idlFactory = ({ IDL }) => {
  const Timestamp = IDL.Int;
  const GoalStakingSnapshotStatus = IDL.Variant({
    'Distributed' : IDL.Null,
    'PendingDistribution' : IDL.Null,
  });
  const TokenAmount = IDL.Nat;
  const UserId = IDL.Principal;
  const GoalStakingSnapshot = IDL.Record({
    'id' : IDL.Nat,
    'status' : GoalStakingSnapshotStatus,
    'totalEligibleStake' : TokenAmount,
    'rewardAmount' : TokenAmount,
    'createdAt' : Timestamp,
    'periodEnd' : Timestamp,
    'allocations' : IDL.Vec(IDL.Tuple(UserId, TokenAmount)),
    'periodStart' : Timestamp,
  });
  const Result_5 = IDL.Variant({
    'ok' : GoalStakingSnapshot,
    'err' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Distance = IDL.Nat;
  const Result_4 = IDL.Variant({ 'ok' : TokenAmount, 'err' : IDL.Text });
  const RoundId = IDL.Nat;
  const StakingInfo = IDL.Record({
    'unlockTime' : Timestamp,
    'stakedAt' : Timestamp,
    'userId' : UserId,
    'isActive' : IDL.Bool,
    'rewardsEarned' : TokenAmount,
    'amount' : TokenAmount,
  });
  const RewardReason = IDL.Variant({
    'GoalStaking' : IDL.Nat,
    'Achievement' : IDL.Text,
    'Distance' : Distance,
    'Bonus' : IDL.Text,
    'Mining' : RoundId,
    'Referral' : UserId,
    'Staking' : TokenAmount,
  });
  const UserReward = IDL.Record({
    'userId' : UserId,
    'isClaimed' : IDL.Bool,
    'claimedAt' : IDL.Opt(Timestamp),
    'roundId' : IDL.Opt(RoundId),
    'timestamp' : Timestamp,
    'amount' : TokenAmount,
    'reason' : RewardReason,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'isPaused' : IDL.Bool,
      'totalRewards' : IDL.Nat,
      'pendingGoalRewards' : TokenAmount,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'totalStaked' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const ClaimRequest = IDL.Record({
    'status' : IDL.Text,
    'userId' : UserId,
    'processedAt' : IDL.Opt(Timestamp),
    'timestamp' : Timestamp,
    'amount' : TokenAmount,
    'reason' : RewardReason,
  });
  const GoalStakeId = IDL.Nat;
  const GoalStakeStatus = IDL.Variant({
    'Closed' : IDL.Null,
    'Active' : IDL.Null,
    'PendingUnstake' : IDL.Null,
  });
  const GoalStakePosition = IDL.Record({
    'id' : GoalStakeId,
    'status' : GoalStakeStatus,
    'stakedAt' : Timestamp,
    'accumulatedRewards' : TokenAmount,
    'userId' : UserId,
    'unlockAt' : Timestamp,
    'lastSnapshotId' : IDL.Opt(IDL.Nat),
    'amountE8s' : IDL.Nat,
    'amount' : TokenAmount,
  });
  const GoalStakingConfig = IDL.Record({
    'roundRewardShare' : IDL.Nat,
    'lockPeriod' : IDL.Nat,
    'minHoldings' : TokenAmount,
    'minStakeAmount' : TokenAmount,
  });
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({
      'holdings' : TokenAmount,
      'minHoldings' : TokenAmount,
      'meetsHoldingsRequirement' : IDL.Bool,
      'holdingsE8s' : IDL.Nat,
      'minStakeAmount' : TokenAmount,
      'canStake' : IDL.Bool,
    }),
    'err' : IDL.Text,
  });
  const RewardConfig = IDL.Record({
    'minStakingAmount' : TokenAmount,
    'stakingLockPeriod' : IDL.Nat,
    'stakingRewardRate' : IDL.Nat,
    'distanceRewardRate' : IDL.Nat,
    'foundationSharePercentage' : IDL.Nat,
    'miningRewardPerRound' : TokenAmount,
    'referralBonus' : TokenAmount,
    'achievementBonus' : TokenAmount,
  });
  const RewardDistribution = IDL.Record({
    'isCompleted' : IDL.Bool,
    'foundationShare' : TokenAmount,
    'distributedAt' : Timestamp,
    'userRewards' : IDL.Vec(IDL.Tuple(UserId, TokenAmount)),
    'roundId' : RoundId,
    'totalReward' : TokenAmount,
  });
  const RewardsSnapshot = IDL.Record({
    'pendingRewards' : TokenAmount,
    'totalRewards' : TokenAmount,
    'stakingInfo' : IDL.Vec(StakingInfo),
    'recentRewards' : IDL.Vec(UserReward),
    'goalStakingSummary' : IDL.Record({
      'activePositions' : IDL.Nat,
      'pendingRewards' : TokenAmount,
      'totalStaked' : TokenAmount,
    }),
  });
  const CanisterId = IDL.Principal;
  const Result_1 = IDL.Variant({ 'ok' : GoalStakePosition, 'err' : IDL.Text });
  return IDL.Service({
    'calculateGoalStakingRewards' : IDL.Func(
        [Timestamp, Timestamp],
        [Result_5],
        [],
      ),
    'claimReward' : IDL.Func([IDL.Nat, UserId], [Result], []),
    'clearOldData' : IDL.Func([], [Result], []),
    'distributeAchievementReward' : IDL.Func([UserId, IDL.Text], [Result], []),
    'distributeDistanceReward' : IDL.Func([UserId, Distance], [Result_4], []),
    'distributeGoalStakingRewards' : IDL.Func([IDL.Nat], [Result], []),
    'distributeMiningRewards' : IDL.Func(
        [RoundId, IDL.Vec(UserId), TokenAmount],
        [Result],
        [],
      ),
    'distributeReferralReward' : IDL.Func([UserId, UserId], [Result], []),
    'emergencyPause' : IDL.Func([], [Result], []),
    'emergencyResume' : IDL.Func([], [Result], []),
    'getActiveStaking' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(StakingInfo)],
        ['query'],
      ),
    'getAllRewards' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(UserId, IDL.Vec(UserReward)))],
        ['query'],
      ),
    'getAllRewardsCapped' : IDL.Func(
        [IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(IDL.Tuple(UserId, IDL.Vec(UserReward)))],
        ['query'],
      ),
    'getCanisterStatus' : IDL.Func([], [Result_3], []),
    'getClaimRequest' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(ClaimRequest)],
        ['query'],
      ),
    'getGoalSnapshot' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(GoalStakingSnapshot)],
        ['query'],
      ),
    'getGoalStakePositions' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(GoalStakePosition)],
        ['query'],
      ),
    'getGoalStakingConfig' : IDL.Func([], [GoalStakingConfig], ['query']),
    'getGoalStakingEligibility' : IDL.Func([UserId], [Result_2], []),
    'getGoalStakingMetrics' : IDL.Func(
        [],
        [
          IDL.Record({
            'totalSnapshots' : IDL.Nat,
            'totalDistributedRewards' : TokenAmount,
            'automatedSystemActive' : IDL.Bool,
            'totalActiveStakeAmount' : TokenAmount,
            'pendingSnapshots' : IDL.Nat,
            'totalActiveStakes' : IDL.Nat,
            'totalPendingRewards' : TokenAmount,
          }),
        ],
        ['query'],
      ),
    'getGoalStakingSummary' : IDL.Func(
        [UserId],
        [
          IDL.Record({
            'totalActiveStake' : TokenAmount,
            'pendingDistributionPool' : TokenAmount,
            'accumulatedRewards' : TokenAmount,
            'config' : GoalStakingConfig,
            'positions' : IDL.Vec(GoalStakePosition),
          }),
        ],
        ['query'],
      ),
    'getPendingClaimRequests' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, ClaimRequest))],
        ['query'],
      ),
    'getPendingGoalSnapshots' : IDL.Func(
        [],
        [IDL.Vec(GoalStakingSnapshot)],
        ['query'],
      ),
    'getRewardConfig' : IDL.Func([], [RewardConfig], ['query']),
    'getRewardDistribution' : IDL.Func(
        [RoundId],
        [IDL.Opt(RewardDistribution)],
        ['query'],
      ),
    'getRewardsByRound' : IDL.Func(
        [RoundId],
        [IDL.Vec(IDL.Tuple(UserId, UserReward))],
        ['query'],
      ),
    'getRewardsSnapshot' : IDL.Func([UserId], [RewardsSnapshot], ['query']),
    'getRewardsSummary' : IDL.Func(
        [],
        [
          IDL.Record({
            'rewardsByUser' : IDL.Vec(IDL.Tuple(UserId, IDL.Nat, TokenAmount)),
            'totalRewards' : IDL.Nat,
            'totalAmount' : TokenAmount,
            'totalUsers' : IDL.Nat,
            'unclaimedAmount' : TokenAmount,
          }),
        ],
        ['query'],
      ),
    'getStakingInfo' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(StakingInfo)],
        ['query'],
      ),
    'getTotalDistributed' : IDL.Func([], [TokenAmount], ['query']),
    'getTotalStaked' : IDL.Func([], [TokenAmount], ['query']),
    'getTotalUnclaimedRewards' : IDL.Func([UserId], [TokenAmount], ['query']),
    'getUnclaimedRewards' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(UserReward)],
        ['query'],
      ),
    'getUserRewards' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(UserReward)],
        ['query'],
      ),
    'isAutomatedGoalStakingActive' : IDL.Func([], [IDL.Bool], ['query']),
    'isSystemPaused' : IDL.Func([], [IDL.Bool], ['query']),
    'listGoalSnapshots' : IDL.Func(
        [IDL.Opt(IDL.Nat)],
        [IDL.Vec(GoalStakingSnapshot)],
        ['query'],
      ),
    'processClaimRequest' : IDL.Func([IDL.Text, IDL.Bool], [Result], []),
    'setCanisterReferences' : IDL.Func(
        [CanisterId, CanisterId, CanisterId],
        [Result],
        [],
      ),
    'stakeGoalTokens' : IDL.Func([TokenAmount], [Result_1], []),
    'stakeTokens' : IDL.Func([TokenAmount, UserId], [Result], []),
    'startAutomatedGoalStakingRewards' : IDL.Func([], [Result], []),
    'stopAutomatedGoalStakingRewards' : IDL.Func([], [Result], []),
    'testAddReward' : IDL.Func(
        [UserId, TokenAmount, IDL.Opt(RoundId)],
        [Result],
        [],
      ),
    'unstakeGoalTokens' : IDL.Func([GoalStakeId], [Result_1], []),
    'unstakeTokens' : IDL.Func([IDL.Nat, UserId], [Result], []),
    'updateGoalStakingConfig' : IDL.Func([GoalStakingConfig], [Result], []),
    'updateRewardConfig' : IDL.Func([RewardConfig], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
