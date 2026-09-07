export const idlFactory = ({ IDL }) => {
  const RoundId = IDL.Nat;
  const UserId = IDL.Principal;
  const Result_6 = IDL.Variant({ 'ok' : IDL.Vec(UserId), 'err' : IDL.Text });
  const ContactId = IDL.Text;
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const ContactStatus = IDL.Variant({
    'Closed' : IDL.Null,
    'InProgress' : IDL.Null,
    'Resolved' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const Timestamp = IDL.Int;
  const ContactSubmission = IDL.Record({
    'id' : ContactId,
    'status' : ContactStatus,
    'subject' : IDL.Text,
    'userId' : IDL.Opt(UserId),
    'name' : IDL.Text,
    'email' : IDL.Text,
    'message' : IDL.Text,
    'timestamp' : Timestamp,
    'adminNotes' : IDL.Opt(IDL.Text),
    'respondedAt' : IDL.Opt(Timestamp),
  });
  const CanisterId = IDL.Principal;
  const TokenAmount = IDL.Nat;
  const Speed = IDL.Nat;
  const Distance = IDL.Nat;
  const SystemConfig = IDL.Record({
    'claimCooldown' : IDL.Nat,
    'premineAmount' : TokenAmount,
    'maxClaimPercentage' : IDL.Nat,
    'miningInterval' : IDL.Nat,
    'maxWinnersPerRound' : IDL.Nat,
    'maxSpeed' : Speed,
    'foundationShare' : IDL.Nat,
    'minDistancePerRound' : Distance,
    'tokensPerRound' : TokenAmount,
    'globalSolanaCap' : TokenAmount,
    'maxDailyWins' : IDL.Nat,
  });
  const Result_5 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'isPaused' : IDL.Bool,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'totalRounds' : IDL.Nat,
      'currentRoundId' : RoundId,
      'systemConfig' : SystemConfig,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Record({
      'resolved' : IDL.Nat,
      'closed' : IDL.Nat,
      'total' : IDL.Nat,
      'pending' : IDL.Nat,
      'inProgress' : IDL.Nat,
    }),
    'err' : IDL.Text,
  });
  const Result_3 = IDL.Variant({ 'ok' : ContactSubmission, 'err' : IDL.Text });
  const MiningRound = IDL.Record({
    'id' : RoundId,
    'startTime' : Timestamp,
    'activeUsers' : IDL.Vec(UserId),
    'totalMined' : TokenAmount,
    'isCompleted' : IDL.Bool,
    'endTime' : Timestamp,
    'winners' : IDL.Vec(UserId),
  });
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'isPaused' : IDL.Bool,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const MiningRoundSnapshot = IDL.Record({
    'userRank' : IDL.Opt(IDL.Nat),
    'userWins' : IDL.Nat,
    'currentRound' : IDL.Opt(MiningRound),
    'roundHistory' : IDL.Vec(MiningRound),
    'topWinners' : IDL.Vec(UserId),
    'userTotalDistance' : Distance,
  });
  const SystemStats = IDL.Record({
    'totalIMERAClaimed' : TokenAmount,
    'activeUsers' : IDL.Nat,
    'totalXP' : IDL.Nat,
    'totalIMERAMined' : TokenAmount,
    'systemUptime' : Timestamp,
    'totalRounds' : IDL.Nat,
    'totalUsers' : IDL.Nat,
  });
  const Result_1 = IDL.Variant({ 'ok' : ContactId, 'err' : IDL.Text });
  return IDL.Service({
    'completeMiningRound' : IDL.Func([RoundId], [Result_6], []),
    'deleteContactSubmission' : IDL.Func([ContactId], [Result], []),
    'getAllContactSubmissions' : IDL.Func(
        [IDL.Opt(IDL.Nat), IDL.Opt(ContactStatus)],
        [IDL.Vec(ContactSubmission)],
        ['query'],
      ),
    'getCallerText' : IDL.Func([], [IDL.Text], []),
    'getCanisterIds' : IDL.Func(
        [],
        [
          IDL.Record({
            'xp' : IDL.Opt(CanisterId),
            'validator' : IDL.Opt(CanisterId),
            'user' : IDL.Opt(CanisterId),
            'consensus' : IDL.Opt(CanisterId),
            'rewards' : IDL.Opt(CanisterId),
            'imera' : IDL.Opt(CanisterId),
          }),
        ],
        [],
      ),
    'getCanisterStatus' : IDL.Func([], [Result_5], []),
    'getContactStats' : IDL.Func([], [Result_4], ['query']),
    'getContactSubmission' : IDL.Func([ContactId], [Result_3], ['query']),
    'getCurrentRound' : IDL.Func([], [IDL.Opt(MiningRound)], ['query']),
    'getFrontendCanisterStatus' : IDL.Func([], [Result_2], []),
    'getMiningRoundSnapshot' : IDL.Func(
        [UserId],
        [MiningRoundSnapshot],
        ['query'],
      ),
    'getMyContactSubmissions' : IDL.Func(
        [],
        [IDL.Vec(ContactSubmission)],
        ['query'],
      ),
    'getRound' : IDL.Func([RoundId], [IDL.Opt(MiningRound)], ['query']),
    'getSystemConfig' : IDL.Func([], [SystemConfig], ['query']),
    'getSystemStats' : IDL.Func([], [SystemStats], []),
    'initializeCanisters' : IDL.Func(
        [
          IDL.Opt(CanisterId),
          IDL.Opt(CanisterId),
          IDL.Opt(CanisterId),
          IDL.Opt(CanisterId),
          IDL.Opt(CanisterId),
          IDL.Opt(CanisterId),
        ],
        [Result],
        [],
      ),
    'isAutomatedMiningActive' : IDL.Func([], [IDL.Bool], ['query']),
    'resetSystem' : IDL.Func([], [Result], []),
    'startAutomatedMining' : IDL.Func([], [Result], []),
    'stopAutomatedMining' : IDL.Func([], [Result], []),
    'submitContactForm' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text],
        [Result_1],
        [],
      ),
    'updateContactStatus' : IDL.Func(
        [ContactId, ContactStatus, IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
    'updateSystemConfig' : IDL.Func([SystemConfig], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
