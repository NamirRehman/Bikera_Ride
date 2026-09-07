export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Speed = IDL.Nat;
  const Distance = IDL.Nat;
  const AntiGamingRule = IDL.Record({
    'minTimeBetweenWins' : IDL.Nat,
    'maxSpeed' : Speed,
    'minDistance' : Distance,
    'maxDailyWins' : IDL.Nat,
    'maxConsecutiveWins' : IDL.Nat,
    'suspiciousPatternThreshold' : IDL.Nat,
  });
  const Timestamp = IDL.Int;
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({
      'totalActivities' : IDL.Nat,
      'canisterName' : IDL.Text,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'totalRounds' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const RoundId = IDL.Nat;
  const UserId = IDL.Principal;
  const ConsensusResult = IDL.Record({
    'totalParticipants' : IDL.Nat,
    'roundId' : RoundId,
    'antiGamingViolations' : IDL.Nat,
    'totalDistance' : Distance,
    'consensusTime' : Timestamp,
    'winners' : IDL.Vec(UserId),
    'averageSpeed' : Speed,
  });
  const UserActivity = IDL.Record({
    'userId' : UserId,
    'distance' : Distance,
    'speed' : Speed,
    'timestamp' : Timestamp,
    'antiGamingScore' : IDL.Nat,
    'isValid' : IDL.Bool,
  });
  const Result_1 = IDL.Variant({ 'ok' : ConsensusResult, 'err' : IDL.Text });
  return IDL.Service({
    'clearOldData' : IDL.Func([], [Result], []),
    'getAntiGamingRules' : IDL.Func([], [AntiGamingRule], ['query']),
    'getCanisterStatus' : IDL.Func([], [Result_2], []),
    'getConsensusResult' : IDL.Func(
        [RoundId],
        [IDL.Opt(ConsensusResult)],
        ['query'],
      ),
    'getDailyWinCount' : IDL.Func([UserId], [IDL.Nat], ['query']),
    'getUserActivities' : IDL.Func(
        [UserId],
        [IDL.Vec(UserActivity)],
        ['query'],
      ),
    'getUserWinHistory' : IDL.Func([UserId], [IDL.Vec(Timestamp)], ['query']),
    'recordActivity' : IDL.Func([UserId, Distance, Speed], [Result], []),
    'resetUserData' : IDL.Func([UserId], [Result], []),
    'selectWinners' : IDL.Func(
        [RoundId, IDL.Vec(UserId), IDL.Nat],
        [Result_1],
        [],
      ),
    'updateAntiGamingRules' : IDL.Func([AntiGamingRule], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
