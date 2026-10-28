export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const MovementStakeId = IDL.Nat;
  const StakeId = IDL.Nat;
  const StakeStatus__1 = IDL.Variant({
    'Failed' : IDL.Null,
    'Active' : IDL.Null,
    'Settling' : IDL.Null,
    'Succeeded' : IDL.Null,
    'Cancelled' : IDL.Null,
  });
  const Timestamp__1 = IDL.Int;
  const StakeTerms = IDL.Record({
    'startTime' : Timestamp__1,
    'endTime' : Timestamp__1,
    'targetDistanceKm' : IDL.Nat,
    'targetDistanceM' : IDL.Nat,
    'rewardPercentMicro' : IDL.Nat,
    'durationWeeks' : IDL.Nat,
  });
  const UserId__1 = IDL.Principal;
  const MemberStatus = IDL.Variant({
    'Refunded' : IDL.Null,
    'Paid' : IDL.Null,
    'Releasing' : IDL.Null,
    'Active' : IDL.Null,
    'Released' : IDL.Null,
    'Locked' : IDL.Null,
    'StakeReturned' : IDL.Null,
    'Slashed' : IDL.Null,
  });
  const StakeMember = IDL.Record({
    'status' : MemberStatus,
    'stakeAmountE8s' : IDL.Nat,
    'userId' : UserId__1,
    'escrowedE8s' : IDL.Nat,
    'joinedAt' : Timestamp__1,
    'rewardE8s' : IDL.Nat,
    'verifiedDistanceM' : IDL.Nat,
    'contributionStart' : Timestamp__1,
    'payoutE8s' : IDL.Nat,
  });
  const StakeMode__1 = IDL.Variant({ 'Group' : IDL.Null, 'Solo' : IDL.Null });
  const Visibility = IDL.Variant({ 'Private' : IDL.Null, 'Public' : IDL.Null });
  const MovementStake = IDL.Record({
    'id' : StakeId,
    'status' : StakeStatus__1,
    'terms' : StakeTerms,
    'title' : IDL.Text,
    'creator' : UserId__1,
    'members' : IDL.Vec(StakeMember),
    'settlementNote' : IDL.Text,
    'mode' : StakeMode__1,
    'createdAt' : Timestamp__1,
    'totalStakedE8s' : IDL.Nat,
    'maxMembers' : IDL.Nat,
    'verifiedDistanceM' : IDL.Nat,
    'inviteCode' : IDL.Opt(IDL.Text),
    'visibility' : Visibility,
    'joinDeadline' : Timestamp__1,
    'settledAt' : IDL.Opt(Timestamp__1),
  });
  const Result_5 = IDL.Variant({ 'ok' : MovementStake, 'err' : IDL.Text });
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
  const Result_10 = IDL.Variant({
    'ok' : GoalStakingSnapshot,
    'err' : IDL.Text,
  });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const StakeVisibility = IDL.Variant({
    'Private' : IDL.Null,
    'Public' : IDL.Null,
  });
  const CreateGroupStakeRequest = IDL.Record({
    'stakeAmountE8s' : IDL.Nat,
    'title' : IDL.Text,
    'invitedUsernames' : IDL.Vec(IDL.Text),
    'targetDistanceKm' : IDL.Nat,
    'maxMembers' : IDL.Nat,
    'inviteCode' : IDL.Opt(IDL.Text),
    'visibility' : StakeVisibility,
    'durationWeeks' : IDL.Nat,
    'joinWindowHours' : IDL.Opt(IDL.Nat),
  });
  const CreateSoloStakeRequest = IDL.Record({
    'stakeAmountE8s' : IDL.Nat,
    'title' : IDL.Text,
    'targetDistanceKm' : IDL.Nat,
    'durationWeeks' : IDL.Nat,
  });
  const Distance = IDL.Nat;
  const Result_9 = IDL.Variant({ 'ok' : TokenAmount, 'err' : IDL.Text });
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
  const Result_8 = IDL.Variant({
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
  const Result_7 = IDL.Variant({
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
  const ProvenanceRequirement = IDL.Variant({
    'Attested' : IDL.Null,
    'Confirmed' : IDL.Null,
    'AnyVerified' : IDL.Null,
  });
  const MovementAttestationPolicy = IDL.Record({
    'solo' : ProvenanceRequirement,
    'group' : ProvenanceRequirement,
  });
  const StakeMode = IDL.Variant({ 'Group' : IDL.Null, 'Solo' : IDL.Null });
  const ProvenanceRequirement__1 = IDL.Variant({
    'Attested' : IDL.Null,
    'Confirmed' : IDL.Null,
    'AnyVerified' : IDL.Null,
  });
  const StakeProgress = IDL.Record({
    'requiredProvenance' : ProvenanceRequirement__1,
    'startTime' : Timestamp__1,
    'status' : StakeStatus__1,
    'endTime' : Timestamp__1,
    'stakeId' : StakeId,
    'liveDistanceM' : IDL.Nat,
    'timeRemainingNs' : IDL.Nat,
    'targetDistanceM' : IDL.Nat,
    'allSourcesDistanceM' : IDL.Nat,
    'progressBasisPoints' : IDL.Nat,
    'verifiedDistanceM' : IDL.Nat,
    'nowTs' : Timestamp__1,
    'unverifiedDistanceM' : IDL.Nat,
    'isSettleable' : IDL.Bool,
    'memberProgress' : IDL.Vec(IDL.Tuple(UserId__1, IDL.Nat)),
  });
  const Result_6 = IDL.Variant({ 'ok' : StakeProgress, 'err' : IDL.Text });
  const MovementStakingConfig = IDL.Record({
    'maxSettlementsPerBatch' : IDL.Nat,
    'maxGroupMembers' : IDL.Nat,
    'autoSettleIntervalSeconds' : IDL.Nat,
    'paused' : IDL.Bool,
  });
  const MovementStakingMetrics = IDL.Record({
    'automatedSettlementActive' : IDL.Bool,
    'lifetimeRewardsPaidE8s' : IDL.Nat,
    'soloStakes' : IDL.Nat,
    'activeStakes' : IDL.Nat,
    'totalEscrowedE8s' : IDL.Nat,
    'succeededStakes' : IDL.Nat,
    'groupStakes' : IDL.Nat,
    'dueForSettlement' : IDL.Nat,
    'lifetimeStakeReturnedE8s' : IDL.Nat,
    'totalStakes' : IDL.Nat,
    'failedStakes' : IDL.Nat,
    'lifetimeSlashedE8s' : IDL.Nat,
  });
  const MovementStakingSummary = IDL.Record({
    'projectedRewardE8s' : IDL.Nat,
    'activeStakes' : IDL.Vec(MovementStake),
    'successCount' : IDL.Nat,
    'lifetimeRewardE8s' : IDL.Nat,
    'config' : MovementStakingConfig,
    'failureCount' : IDL.Nat,
    'settledStakes' : IDL.Vec(MovementStake),
    'activeStakedE8s' : IDL.Nat,
    'lifetimeSlashedE8s' : IDL.Nat,
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
  const RewardMatchRow = IDL.Record({
    'timestamp' : Timestamp,
    'amount' : TokenAmount,
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
  const JoinGroupStakeRequest = IDL.Record({
    'stakeAmountE8s' : IDL.Nat,
    'stakeId' : MovementStakeId,
    'inviteCode' : IDL.Opt(IDL.Text),
  });
  const StakeQuote = IDL.Record({
    'stakeAmountE8s' : IDL.Nat,
    'targetDistanceKm' : IDL.Nat,
    'targetDistanceM' : IDL.Nat,
    'totalPayoutE8s' : IDL.Nat,
    'rewardE8s' : IDL.Nat,
    'rewardPercentMicro' : IDL.Nat,
    'durationNs' : IDL.Nat,
    'durationWeeks' : IDL.Nat,
  });
  const Result_4 = IDL.Variant({ 'ok' : StakeQuote, 'err' : IDL.Text });
  const CanisterId = IDL.Principal;
  const StakeStatus = IDL.Variant({
    'Failed' : IDL.Null,
    'Active' : IDL.Null,
    'Settling' : IDL.Null,
    'Succeeded' : IDL.Null,
    'Cancelled' : IDL.Null,
  });
  const SettlementOutcome = IDL.Record({
    'status' : StakeStatus,
    'membersSlashed' : IDL.Nat,
    'membersLocked' : IDL.Nat,
    'stakeId' : MovementStakeId,
    'note' : IDL.Text,
    'unlockAt' : IDL.Opt(Timestamp),
    'stakeLockedE8s' : IDL.Nat,
    'targetMet' : IDL.Bool,
    'targetDistanceM' : IDL.Nat,
    'rewardPaidE8s' : IDL.Nat,
    'verifiedDistanceM' : IDL.Nat,
    'stakeSlashedE8s' : IDL.Nat,
    'stakeReturnedE8s' : IDL.Nat,
    'membersPaid' : IDL.Nat,
  });
  const Result_3 = IDL.Variant({ 'ok' : SettlementOutcome, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : GoalStakePosition, 'err' : IDL.Text });
  return IDL.Service({
    'addAdminPrincipal' : IDL.Func([IDL.Principal], [Result], []),
    'adminCancelMovementStake' : IDL.Func(
        [MovementStakeId, IDL.Text],
        [Result_5],
        [],
      ),
    'calculateGoalStakingRewards' : IDL.Func(
        [Timestamp, Timestamp],
        [Result_10],
        [],
      ),
    'claimLockedMovementStake' : IDL.Func([MovementStakeId], [Result_2], []),
    'claimReward' : IDL.Func([IDL.Nat, UserId], [Result], []),
    'clearOldData' : IDL.Func([], [Result], []),
    'createGroupStake' : IDL.Func([CreateGroupStakeRequest], [Result_5], []),
    'createSoloStake' : IDL.Func([CreateSoloStakeRequest], [Result_5], []),
    'distributeAchievementReward' : IDL.Func([UserId, IDL.Text], [Result], []),
    'distributeDistanceReward' : IDL.Func([UserId, Distance], [Result_9], []),
    'distributeGoalStakingRewards' : IDL.Func([IDL.Nat], [Result], []),
    'distributeMiningRewards' : IDL.Func(
        [RoundId, IDL.Vec(UserId), TokenAmount],
        [Result],
        [],
      ),
    'distributeReferralReward' : IDL.Func([UserId, UserId], [Result], []),
    'emergencyPause' : IDL.Func([], [Result], []),
    'emergencyResume' : IDL.Func([], [Result], []),
    'forceResetMovementSettlement' : IDL.Func([MovementStakeId], [Result], []),
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
    'getCanisterStatus' : IDL.Func([], [Result_8], []),
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
    'getGoalStakingEligibility' : IDL.Func([UserId], [Result_7], []),
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
    'getMovementAttestationPolicy' : IDL.Func(
        [],
        [MovementAttestationPolicy],
        ['query'],
      ),
    'getMovementRewardPercentMicro' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Nat],
        ['query'],
      ),
    'getMovementRewardPercentMicroForMode' : IDL.Func(
        [StakeMode, IDL.Nat, IDL.Nat],
        [IDL.Nat],
        ['query'],
      ),
    'getMovementSlashPoolBalance' : IDL.Func([], [Result_2], []),
    'getMovementStake' : IDL.Func(
        [MovementStakeId],
        [IDL.Opt(MovementStake)],
        ['query'],
      ),
    'getMovementStakeInviteCode' : IDL.Func(
        [MovementStakeId],
        [Result],
        ['query'],
      ),
    'getMovementStakeProgress' : IDL.Func([MovementStakeId], [Result_6], []),
    'getMovementStakeRequirement' : IDL.Func(
        [MovementStakeId],
        [ProvenanceRequirement],
        ['query'],
      ),
    'getMovementStakesDueForSettlement' : IDL.Func(
        [IDL.Opt(IDL.Nat)],
        [IDL.Vec(MovementStakeId)],
        ['query'],
      ),
    'getMovementStakingBounds' : IDL.Func(
        [],
        [
          IDL.Record({
            'groupMaxDistanceKm' : IDL.Nat,
            'groupMinDistanceKm' : IDL.Nat,
            'e8sPerToken' : IDL.Nat,
            'soloMaxDistanceKm' : IDL.Nat,
            'soloMinDistanceKm' : IDL.Nat,
            'maxDistanceKm' : IDL.Nat,
            'minDistanceKm' : IDL.Nat,
            'percentScale' : IDL.Nat,
            'maxDurationWeeks' : IDL.Nat,
            'minDurationWeeks' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getMovementStakingConfig' : IDL.Func(
        [],
        [MovementStakingConfig],
        ['query'],
      ),
    'getMovementStakingMetrics' : IDL.Func(
        [],
        [MovementStakingMetrics],
        ['query'],
      ),
    'getMovementStakingSummary' : IDL.Func(
        [UserId],
        [MovementStakingSummary],
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
    'getRewardMatchRows' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(RewardMatchRow)],
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
    'getUserMovementStakes' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(MovementStake)],
        ['query'],
      ),
    'getUserRewards' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(UserReward)],
        ['query'],
      ),
    'getUserRewardsSnapshot' : IDL.Func(
        [UserId],
        [
          IDL.Record({
            'rewardHistory' : IDL.Vec(UserReward),
            'pendingRewards' : TokenAmount,
            'totalRewards' : TokenAmount,
            'activeStakes' : IDL.Nat,
            'nextClaimTime' : IDL.Opt(Timestamp),
            'canClaim' : IDL.Bool,
            'stakedAmount' : TokenAmount,
            'lastReward' : IDL.Opt(UserReward),
          }),
        ],
        [],
      ),
    'isAutomatedGoalStakingActive' : IDL.Func([], [IDL.Bool], ['query']),
    'isAutomatedMovementSettlementActive' : IDL.Func([], [IDL.Bool], ['query']),
    'isSystemPaused' : IDL.Func([], [IDL.Bool], ['query']),
    'joinGroupStake' : IDL.Func([JoinGroupStakeRequest], [Result_5], []),
    'listGoalSnapshots' : IDL.Func(
        [IDL.Opt(IDL.Nat)],
        [IDL.Vec(GoalStakingSnapshot)],
        ['query'],
      ),
    'listOpenGroupStakes' : IDL.Func(
        [IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(MovementStake)],
        ['query'],
      ),
    'previewMovementStake' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat],
        [Result_4],
        ['query'],
      ),
    'previewMovementStakeForMode' : IDL.Func(
        [StakeMode, IDL.Nat, IDL.Nat, IDL.Nat],
        [Result_4],
        ['query'],
      ),
    'processClaimRequest' : IDL.Func([IDL.Text, IDL.Bool], [Result], []),
    'reconcileMovementRelease' : IDL.Func(
        [MovementStakeId, IDL.Principal, IDL.Bool],
        [Result],
        [],
      ),
    'removeAdminPrincipal' : IDL.Func([IDL.Principal], [Result], []),
    'setCanisterReferences' : IDL.Func(
        [CanisterId, CanisterId, CanisterId],
        [Result],
        [],
      ),
    'setMovementAttestationPolicy' : IDL.Func(
        [MovementAttestationPolicy],
        [Result],
        [],
      ),
    'setMovementStakingPaused' : IDL.Func([IDL.Bool], [Result], []),
    'setUserCanisterReference' : IDL.Func([CanisterId], [Result], []),
    'settleDueMovementStakes' : IDL.Func([], [Result], []),
    'settleMovementStake' : IDL.Func([MovementStakeId], [Result_3], []),
    'stakeGoalTokens' : IDL.Func([TokenAmount], [Result_1], []),
    'stakeTokens' : IDL.Func([TokenAmount, UserId], [Result], []),
    'startAutomatedGoalStakingRewards' : IDL.Func([], [Result], []),
    'startAutomatedMovementSettlement' : IDL.Func([], [Result], []),
    'stopAutomatedGoalStakingRewards' : IDL.Func([], [Result], []),
    'stopAutomatedMovementSettlement' : IDL.Func([], [Result], []),
    'sweepMovementSlashPool' : IDL.Func(
        [IDL.Principal, IDL.Nat],
        [Result_2],
        [],
      ),
    'testAddReward' : IDL.Func(
        [UserId, TokenAmount, IDL.Opt(RoundId)],
        [Result],
        [],
      ),
    'unstakeGoalTokens' : IDL.Func([GoalStakeId], [Result_1], []),
    'unstakeTokens' : IDL.Func([IDL.Nat, UserId], [Result], []),
    'updateGoalStakingConfig' : IDL.Func([GoalStakingConfig], [Result], []),
    'updateMovementStakingConfig' : IDL.Func(
        [MovementStakingConfig],
        [Result],
        [],
      ),
    'updateRewardConfig' : IDL.Func([RewardConfig], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
