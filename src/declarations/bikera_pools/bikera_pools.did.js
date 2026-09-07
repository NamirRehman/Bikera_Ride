export const idlFactory = ({ IDL }) => {
  const PoolId = IDL.Text;
  const Timestamp = IDL.Int;
  const PoolStatus = IDL.Variant({
    'Closed' : IDL.Null,
    'Active' : IDL.Null,
    'Draft' : IDL.Null,
    'Cancelled' : IDL.Null,
  });
  const RewardModel = IDL.Variant({
    'Proportional' : IDL.Null,
    'TopThree' : IDL.Null,
    'WinnerTakesAll' : IDL.Null,
  });
  const ObjectiveType = IDL.Variant({
    'TotalTime' : IDL.Nat,
    'Custom' : IDL.Text,
    'AverageSpeed' : IDL.Nat,
    'TotalRides' : IDL.Nat,
    'TotalDistance' : IDL.Nat,
  });
  const PoolObjective = IDL.Record({
    'description' : IDL.Opt(IDL.Text),
    'objectiveType' : ObjectiveType,
    'targetValue' : IDL.Nat,
  });
  const PoolVisibility = IDL.Variant({
    'Private' : IDL.Null,
    'Public' : IDL.Null,
  });
  const PoolType = IDL.Variant({
    'SpeedEfficiency' : IDL.Null,
    'Custom' : IDL.Null,
    'Consistency' : IDL.Null,
    'TeamRelay' : IDL.Null,
    'CheckpointRally' : IDL.Null,
    'DistanceKing' : IDL.Null,
    'EcoMode' : IDL.Null,
  });
  const Pool = IDL.Record({
    'id' : PoolId,
    'startTime' : Timestamp,
    'status' : PoolStatus,
    'title' : IDL.Text,
    'rewardModel' : RewardModel,
    'endTime' : Timestamp,
    'owner' : IDL.Principal,
    'objective' : IDL.Opt(PoolObjective),
    'createdAt' : Timestamp,
    'description' : IDL.Text,
    'networkFee' : IDL.Nat,
    'seedAmount' : IDL.Nat,
    'updatedAt' : Timestamp,
    'inviteCode' : IDL.Opt(IDL.Text),
    'participantCount' : IDL.Nat,
    'maxParticipants' : IDL.Nat,
    'entryFee' : IDL.Nat,
    'visibility' : PoolVisibility,
    'poolType' : PoolType,
    'potAmount' : IDL.Nat,
  });
  const Result_12 = IDL.Variant({ 'ok' : Pool, 'err' : IDL.Text });
  const Result_13 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const CreatePoolRequest = IDL.Record({
    'startTime' : Timestamp,
    'title' : IDL.Text,
    'rewardModel' : RewardModel,
    'endTime' : Timestamp,
    'objective' : IDL.Opt(PoolObjective),
    'description' : IDL.Text,
    'networkFee' : IDL.Nat,
    'seedAmount' : IDL.Nat,
    'inviteCode' : IDL.Opt(IDL.Text),
    'maxParticipants' : IDL.Nat,
    'entryFee' : IDL.Nat,
    'visibility' : PoolVisibility,
    'poolType' : PoolType,
  });
  const CreatePoolResponse = IDL.Record({ 'pool' : Pool });
  const Result_11 = IDL.Variant({
    'ok' : CreatePoolResponse,
    'err' : IDL.Text,
  });
  const PoolSummary = IDL.Record({
    'id' : PoolId,
    'startTime' : Timestamp,
    'status' : PoolStatus,
    'title' : IDL.Text,
    'rewardModel' : RewardModel,
    'endTime' : Timestamp,
    'owner' : IDL.Principal,
    'createdAt' : Timestamp,
    'description' : IDL.Text,
    'networkFee' : IDL.Nat,
    'participantCount' : IDL.Nat,
    'maxParticipants' : IDL.Nat,
    'entryFee' : IDL.Nat,
    'visibility' : PoolVisibility,
    'poolType' : PoolType,
    'potAmount' : IDL.Nat,
  });
  const Result_10 = IDL.Variant({
    'ok' : IDL.Record({
      'activePools' : IDL.Nat,
      'canisterName' : IDL.Text,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'totalPools' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const Team = IDL.Variant({ 'TeamA' : IDL.Null, 'TeamB' : IDL.Null });
  const RideSessionId = IDL.Text;
  const RideSubmission = IDL.Record({
    'duration' : IDL.Nat,
    'avgSpeed' : IDL.Nat,
    'maxSpeed' : IDL.Nat,
    'submittedAt' : Timestamp,
    'distance' : IDL.Nat,
    'sessionId' : RideSessionId,
  });
  const ParticipantScore = IDL.Record({
    'userId' : IDL.Principal,
    'team' : IDL.Opt(Team),
    'submissions' : IDL.Vec(RideSubmission),
    'score' : IDL.Nat,
    'totalDistance' : IDL.Nat,
    'bestAvgSpeed' : IDL.Nat,
    'bestMaxSpeed' : IDL.Nat,
  });
  const Result_9 = IDL.Variant({
    'ok' : IDL.Vec(ParticipantScore),
    'err' : IDL.Text,
  });
  const Result_8 = IDL.Variant({
    'ok' : IDL.Record({
      'total' : IDL.Nat,
      'hasMore' : IDL.Bool,
      'leaderboard' : IDL.Vec(ParticipantScore),
    }),
    'err' : IDL.Text,
  });
  const Participant = IDL.Record({
    'userId' : IDL.Principal,
    'joinedAt' : Timestamp,
    'team' : IDL.Opt(Team),
    'hasPaidEntry' : IDL.Bool,
    'rideSubmissions' : IDL.Vec(RideSubmission),
  });
  const Result_7 = IDL.Variant({
    'ok' : IDL.Vec(Participant),
    'err' : IDL.Text,
  });
  const Result_6 = IDL.Variant({
    'ok' : IDL.Record({
      'participants' : IDL.Vec(Participant),
      'total' : IDL.Nat,
      'hasMore' : IDL.Bool,
    }),
    'err' : IDL.Text,
  });
  const DepositAccount = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Vec(IDL.Nat8),
  });
  const Result_5 = IDL.Variant({ 'ok' : DepositAccount, 'err' : IDL.Text });
  const PoolResult = IDL.Record({
    'leaderboard' : IDL.Vec(ParticipantScore),
    'totalPot' : IDL.Nat,
    'finalizedAt' : Timestamp,
    'payouts' : IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat)),
  });
  const TeamScore = IDL.Record({
    'participants' : IDL.Vec(ParticipantScore),
    'team' : Team,
    'totalScore' : IDL.Nat,
    'totalDistance' : IDL.Nat,
    'participantCount' : IDL.Nat,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Record({ 'teamA' : TeamScore, 'teamB' : TeamScore }),
    'err' : IDL.Text,
  });
  const TeamProgress = IDL.Record({
    'completedAt' : IDL.Opt(Timestamp),
    'isCompleted' : IDL.Bool,
    'team' : Team,
    'percentageComplete' : IDL.Nat,
    'currentValue' : IDL.Nat,
    'targetValue' : IDL.Nat,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Record({ 'teamA' : TeamProgress, 'teamB' : TeamProgress }),
    'err' : IDL.Text,
  });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Bool, 'err' : IDL.Text });
  const JoinPoolRequest = IDL.Record({
    'team' : IDL.Opt(Team),
    'inviteCode' : IDL.Opt(IDL.Text),
    'poolId' : PoolId,
  });
  const JoinPoolResponse = IDL.Record({
    'pool' : Pool,
    'participant' : Participant,
  });
  const Result_1 = IDL.Variant({ 'ok' : JoinPoolResponse, 'err' : IDL.Text });
  const ListPoolsRequest = IDL.Record({
    'status' : IDL.Opt(PoolStatus),
    'sortBy' : IDL.Opt(
      IDL.Variant({
        'PotAmount' : IDL.Null,
        'StartTime' : IDL.Null,
        'ParticipantCount' : IDL.Null,
        'CreatedAt' : IDL.Null,
        'EndTime' : IDL.Null,
      })
    ),
    'sortOrder' : IDL.Opt(IDL.Variant({ 'Asc' : IDL.Null, 'Desc' : IDL.Null })),
    'offset' : IDL.Nat,
    'onlyPublic' : IDL.Bool,
    'limit' : IDL.Nat,
    'poolType' : IDL.Opt(PoolType),
  });
  const ListPoolsResponse = IDL.Record({
    'total' : IDL.Nat,
    'hasMore' : IDL.Bool,
    'pools' : IDL.Vec(PoolSummary),
  });
  const SubmitRideRequest = IDL.Record({
    'sessionId' : RideSessionId,
    'poolId' : PoolId,
  });
  const Result = IDL.Variant({ 'ok' : RideSubmission, 'err' : IDL.Text });
  return IDL.Service({
    'activatePool' : IDL.Func([PoolId], [Result_12], []),
    'autoCloseExpiredPools' : IDL.Func([], [IDL.Nat], []),
    'cancelPool' : IDL.Func([PoolId, IDL.Opt(IDL.Text)], [Result_12], []),
    'claimReward' : IDL.Func([PoolId], [Result_13], []),
    'closePool' : IDL.Func([PoolId], [Result_12], []),
    'createPool' : IDL.Func([CreatePoolRequest], [Result_11], []),
    'getActivePools' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(PoolSummary)],
        ['query'],
      ),
    'getAllPools' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(PoolSummary)],
        ['query'],
      ),
    'getCanisterStatus' : IDL.Func([], [Result_10], []),
    'getClosedPools' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(PoolSummary)],
        ['query'],
      ),
    'getLeaderboard' : IDL.Func([PoolId], [Result_9], ['query']),
    'getLeaderboardPaginated' : IDL.Func(
        [PoolId, IDL.Nat, IDL.Nat],
        [Result_8],
        ['query'],
      ),
    'getParticipants' : IDL.Func([PoolId], [Result_7], ['query']),
    'getParticipantsPaginated' : IDL.Func(
        [PoolId, IDL.Nat, IDL.Nat],
        [Result_6],
        ['query'],
      ),
    'getPool' : IDL.Func([PoolId], [IDL.Opt(Pool)], ['query']),
    'getPoolDepositAccount' : IDL.Func([PoolId], [Result_5], ['query']),
    'getPoolObjective' : IDL.Func(
        [PoolId],
        [IDL.Opt(PoolObjective)],
        ['query'],
      ),
    'getPoolResult' : IDL.Func([PoolId], [IDL.Opt(PoolResult)], ['query']),
    'getTeamLeaderboard' : IDL.Func([PoolId], [Result_4], ['query']),
    'getTeamProgress' : IDL.Func([PoolId], [Result_3], ['query']),
    'getTotalNetworkFees' : IDL.Func([], [IDL.Nat], ['query']),
    'hasClaimedReward' : IDL.Func(
        [PoolId, IDL.Principal],
        [IDL.Bool],
        ['query'],
      ),
    'hasTeamCompletedObjective' : IDL.Func(
        [PoolId, Team],
        [Result_2],
        ['query'],
      ),
    'isParticipant' : IDL.Func([PoolId, IDL.Principal], [IDL.Bool], ['query']),
    'joinPool' : IDL.Func([JoinPoolRequest], [Result_1], []),
    'listPools' : IDL.Func([IDL.Bool], [IDL.Vec(PoolSummary)], ['query']),
    'listPoolsPaginated' : IDL.Func(
        [ListPoolsRequest],
        [ListPoolsResponse],
        ['query'],
      ),
    'submitRide' : IDL.Func([SubmitRideRequest], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
