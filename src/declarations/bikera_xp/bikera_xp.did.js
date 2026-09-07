export const idlFactory = ({ IDL }) => {
  const UserId = IDL.Principal;
  const XPAmount = IDL.Nat;
  const Result_3 = IDL.Variant({ 'ok' : XPAmount, 'err' : IDL.Text });
  const Distance = IDL.Nat;
  const XPReason = IDL.Variant({
    'Achievement' : IDL.Text,
    'Distance' : Distance,
    'Mining' : IDL.Nat,
    'Referral' : UserId,
    'Penalty' : IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Achievement = IDL.Record({
    'id' : IDL.Text,
    'reward' : XPAmount,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'isUnlocked' : IDL.Bool,
    'requiredXP' : XPAmount,
  });
  const Timestamp = IDL.Int;
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'totalXP' : IDL.Nat,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'totalUsers' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const Day = IDL.Nat;
  const TimeFilter = IDL.Variant({
    'AllTime' : IDL.Null,
    'Weekly' : IDL.Null,
    'Daily' : IDL.Null,
    'Monthly' : IDL.Null,
  });
  const LevelConfig = IDL.Record({
    'level' : IDL.Nat,
    'benefits' : IDL.Vec(IDL.Text),
    'requiredXP' : XPAmount,
  });
  const UserXPProfile = IDL.Record({
    'userId' : UserId,
    'totalXP' : XPAmount,
    'lastActivity' : Timestamp,
    'streakDays' : IDL.Nat,
    'referralCount' : IDL.Nat,
    'achievements' : IDL.Vec(IDL.Text),
    'totalDistance' : Distance,
    'lastStreakDay' : IDL.Opt(Day),
    'currentLevel' : IDL.Nat,
    'xpToNextLevel' : XPAmount,
  });
  const XPTransaction = IDL.Record({
    'metadata' : IDL.Opt(IDL.Text),
    'userId' : UserId,
    'distance' : IDL.Opt(Distance),
    'timestamp' : Timestamp,
    'amount' : XPAmount,
    'reason' : XPReason,
  });
  const XPSnapshot = IDL.Record({
    'weeklyXP' : XPAmount,
    'totalXP' : XPAmount,
    'level' : IDL.Nat,
    'recentTransactions' : IDL.Vec(XPTransaction),
    'dailyXP' : XPAmount,
    'nextLevelXP' : XPAmount,
    'levelProgress' : IDL.Float64,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  return IDL.Service({
    'addAchievementXP' : IDL.Func([UserId, IDL.Text], [Result_3], []),
    'addDistanceXP' : IDL.Func([UserId, Distance], [Result_3], []),
    'addDistanceXPBatch' : IDL.Func([UserId, Distance], [Result_3], []),
    'addMiningBonus' : IDL.Func([UserId, XPAmount], [Result_3], []),
    'addReferralBonus' : IDL.Func([UserId, UserId], [Result_3], []),
    'addXP' : IDL.Func(
        [UserId, XPAmount, XPReason, IDL.Opt(Distance), IDL.Opt(IDL.Text)],
        [Result_3],
        [],
      ),
    'applyPenalty' : IDL.Func([UserId, XPAmount, IDL.Text], [Result_3], []),
    'clearOldTransactions' : IDL.Func([], [Result_1], []),
    'getAchievementDefinitions' : IDL.Func(
        [],
        [IDL.Vec(Achievement)],
        ['query'],
      ),
    'getAchievements' : IDL.Func([UserId], [IDL.Vec(IDL.Text)], ['query']),
    'getCanisterStatus' : IDL.Func([], [Result_2], []),
    'getDailyXPClaimed' : IDL.Func([UserId, Day], [XPAmount], ['query']),
    'getLeaderboard' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(UserId, XPAmount))],
        ['query'],
      ),
    'getLeaderboardWithFilter' : IDL.Func(
        [IDL.Nat, TimeFilter],
        [IDL.Vec(IDL.Tuple(UserId, XPAmount))],
        ['query'],
      ),
    'getLevel' : IDL.Func([UserId], [IDL.Nat], ['query']),
    'getLevelConfigs' : IDL.Func([], [IDL.Vec(LevelConfig)], ['query']),
    'getPublicUserXPProfile' : IDL.Func([UserId], [UserXPProfile], ['query']),
    'getReferralCount' : IDL.Func([UserId], [IDL.Nat], ['query']),
    'getStreakDays' : IDL.Func([UserId], [IDL.Nat], ['query']),
    'getTotalDistance' : IDL.Func([UserId], [Distance], ['query']),
    'getTotalXP' : IDL.Func([UserId], [XPAmount], ['query']),
    'getXPSnapshot' : IDL.Func([UserId], [XPSnapshot], ['query']),
    'getXPToNextLevel' : IDL.Func([UserId], [XPAmount], ['query']),
    'getXPTransactions' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(XPTransaction)],
        ['query'],
      ),
    'isAutomatedXPMintingActive' : IDL.Func([], [IDL.Bool], ['query']),
    'resetUserXP' : IDL.Func([UserId], [Result_1], []),
    'startAutomatedXPMinting' : IDL.Func([], [Result_1], []),
    'stopAutomatedXPMinting' : IDL.Func([], [Result_1], []),
    'updateLevelConfigs' : IDL.Func([IDL.Vec(LevelConfig)], [Result_1], []),
    'updateStreak' : IDL.Func([UserId], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
