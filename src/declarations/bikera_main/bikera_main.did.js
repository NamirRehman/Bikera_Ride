export const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const RoundId = IDL.Nat;
  const UserId = IDL.Principal;
  const Result_11 = IDL.Variant({ 'ok' : IDL.Vec(UserId), 'err' : IDL.Text });
  const ContactId = IDL.Text;
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result_10 = IDL.Variant({
    'ok' : IDL.Vec(IDL.Principal),
    'err' : IDL.Text,
  });
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
  const TokenAmount = IDL.Nat;
  const SystemStats = IDL.Record({
    'totalIMERAClaimed' : TokenAmount,
    'activeUsers' : IDL.Nat,
    'totalXP' : IDL.Nat,
    'totalIMERAMined' : TokenAmount,
    'systemUptime' : Timestamp,
    'totalRounds' : IDL.Nat,
    'totalUsers' : IDL.Nat,
  });
  const CanisterId = IDL.Principal;
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
  const Result_9 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'freezingThreshold' : IDL.Nat,
      'isPaused' : IDL.Bool,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'totalRounds' : IDL.Nat,
      'currentRoundId' : RoundId,
      'memoryAllocation' : IDL.Nat,
      'systemConfig' : SystemConfig,
      'computeAllocation' : IDL.Nat,
      'reservedCyclesLimit' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const Result_8 = IDL.Variant({
    'ok' : IDL.Record({
      'resolved' : IDL.Nat,
      'closed' : IDL.Nat,
      'total' : IDL.Nat,
      'pending' : IDL.Nat,
      'inProgress' : IDL.Nat,
    }),
    'err' : IDL.Text,
  });
  const Result_7 = IDL.Variant({ 'ok' : ContactSubmission, 'err' : IDL.Text });
  const RoundState = IDL.Variant({
    'Calculating' : IDL.Null,
    'Committed' : IDL.Null,
    'Open' : IDL.Null,
    'Finalized' : IDL.Null,
  });
  const MiningRound = IDL.Record({
    'id' : RoundId,
    'startTime' : Timestamp,
    'activeUsers' : IDL.Vec(UserId),
    'totalMined' : TokenAmount,
    'isCompleted' : IDL.Bool,
    'endTime' : Timestamp,
    'timeoutAt' : IDL.Opt(Timestamp),
    'submittedAt' : IDL.Opt(Timestamp),
    'state' : RoundState,
    'retryCount' : IDL.Nat,
    'finalizedAt' : IDL.Opt(Timestamp),
    'lastError' : IDL.Opt(IDL.Text),
    'committedAt' : IDL.Opt(Timestamp),
    'winners' : IDL.Vec(UserId),
  });
  const Result_6 = IDL.Variant({
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
  const Result_5 = IDL.Variant({
    'ok' : IDL.Record({
      'isStuck' : IDL.Bool,
      'timeSinceSubmission' : IDL.Opt(Timestamp),
      'monitoring' : IDL.Opt(
        IDL.Record({
          'duration' : Timestamp,
          'failedSubmissions' : IDL.Nat,
          'retryCount' : IDL.Nat,
        })
      ),
      'round' : IDL.Opt(MiningRound),
    }),
    'err' : IDL.Text,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Vec(MiningRound),
    'err' : IDL.Text,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Record({
      'cursor' : IDL.Nat,
      'sourceSize' : IDL.Nat,
      'complete' : IDL.Bool,
      'processed' : IDL.Nat,
    }),
    'err' : IDL.Text,
  });
  const Result_2 = IDL.Variant({ 'ok' : ContactId, 'err' : IDL.Text });
  return IDL.Service({
    'addAdminPrincipal' : IDL.Func([IDL.Principal], [Result_1], []),
    'completeMiningRound' : IDL.Func([RoundId], [Result_11], []),
    'deleteContactSubmission' : IDL.Func([ContactId], [Result_1], []),
    'forceRecoverRound' : IDL.Func([RoundId], [Result_1], []),
    'getAdminPasswordVersion' : IDL.Func([], [Result], ['query']),
    'getAdminPrincipals' : IDL.Func([], [Result_10], ['query']),
    'getAllContactSubmissions' : IDL.Func(
        [IDL.Opt(IDL.Nat), IDL.Opt(ContactStatus)],
        [IDL.Vec(ContactSubmission)],
        ['query'],
      ),
    'getCachedSystemStats' : IDL.Func([], [SystemStats], ['query']),
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
    'getCanisterStatus' : IDL.Func([], [Result_9], []),
    'getContactStats' : IDL.Func([], [Result_8], ['query']),
    'getContactSubmission' : IDL.Func([ContactId], [Result_7], ['query']),
    'getCurrentRound' : IDL.Func([], [IDL.Opt(MiningRound)], ['query']),
    'getFrontendCanisterStatus' : IDL.Func([], [Result_6], []),
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
    'getRoundArchiveStatus' : IDL.Func(
        [],
        [
          IDL.Record({
            'indexedUsers' : IDL.Nat,
            'hotRoundCount' : IDL.Nat,
            'cycleBalance' : IDL.Nat,
            'migrationCursor' : IDL.Nat,
            'archiveDataPages' : IDL.Nat64,
            'archiveDataBytes' : IDL.Nat64,
            'migrationComplete' : IDL.Bool,
            'migrationSourceSize' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getRoundMonitoring' : IDL.Func([RoundId], [Result_5], ['query']),
    'getStuckRounds' : IDL.Func([], [Result_4], ['query']),
    'getSuperAdminPrincipal' : IDL.Func([], [IDL.Principal], ['query']),
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
        [Result_1],
        [],
      ),
    'isAutomatedMiningActive' : IDL.Func([], [IDL.Bool], ['query']),
    'migrateRoundArchive' : IDL.Func([IDL.Nat], [Result_3], []),
    'removeAdminPrincipal' : IDL.Func([IDL.Principal], [Result_1], []),
    'resetSystem' : IDL.Func([], [Result_1], []),
    'rotateAdminPassword' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'startAutomatedMining' : IDL.Func([], [Result_1], []),
    'stopAutomatedMining' : IDL.Func([], [Result_1], []),
    'submitContactForm' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text],
        [Result_2],
        [],
      ),
    'updateContactStatus' : IDL.Func(
        [ContactId, ContactStatus, IDL.Opt(IDL.Text)],
        [Result_1],
        [],
      ),
    'updateSystemConfig' : IDL.Func([SystemConfig], [Result_1], []),
    'verifyAdminPassword' : IDL.Func([IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
