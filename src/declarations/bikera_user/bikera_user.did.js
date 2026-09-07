export const idlFactory = ({ IDL }) => {
  const UserId = IDL.Principal;
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Timestamp = IDL.Int;
  const Speed = IDL.Nat;
  const Distance = IDL.Nat;
  const LocationPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'longitude' : IDL.Float64,
    'timestamp' : Timestamp,
    'accuracy' : IDL.Opt(IDL.Float64),
  });
  const ActivitySession = IDL.Record({
    'id' : IDL.Text,
    'startTime' : Timestamp,
    'duration' : IDL.Nat,
    'avgSpeed' : Speed,
    'maxSpeed' : Speed,
    'endTime' : IDL.Opt(Timestamp),
    'userId' : UserId,
    'distance' : Distance,
    'isActive' : IDL.Bool,
    'route' : IDL.Vec(LocationPoint),
  });
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'activeSessions' : IDL.Nat,
      'totalUsers' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const PrivacySettings = IDL.Record({
    'showLocation' : IDL.Bool,
    'profileVisibility' : IDL.Text,
    'showAchievements' : IDL.Bool,
    'allowFriendRequests' : IDL.Bool,
    'showDistance' : IDL.Bool,
    'showSpeed' : IDL.Bool,
  });
  const SocialLinks = IDL.Record({
    'strava' : IDL.Opt(IDL.Text),
    'twitter' : IDL.Opt(IDL.Text),
    'instagram' : IDL.Opt(IDL.Text),
    'website' : IDL.Opt(IDL.Text),
  });
  const NotificationSettings = IDL.Record({
    'social' : IDL.Bool,
    'marketing' : IDL.Bool,
    'push' : IDL.Bool,
    'email' : IDL.Bool,
    'achievements' : IDL.Bool,
    'rewards' : IDL.Bool,
  });
  const UserPreferences = IDL.Record({
    'theme' : IDL.Text,
    'notifications' : NotificationSettings,
    'autoStart' : IDL.Bool,
    'language' : IDL.Text,
    'units' : IDL.Text,
    'dataSharing' : IDL.Bool,
    'voiceGuidance' : IDL.Bool,
  });
  const TokenAmount = IDL.Nat;
  const UserProfile = IDL.Record({
    'id' : UserId,
    'bio' : IDL.Opt(IDL.Text),
    'privacySettings' : PrivacySettings,
    'referralCode' : IDL.Text,
    'username' : IDL.Text,
    'displayName' : IDL.Opt(IDL.Text),
    'totalXP' : IDL.Nat,
    'socialLinks' : SocialLinks,
    'lastActivity' : Timestamp,
    'createdAt' : Timestamp,
    'isActive' : IDL.Bool,
    'email' : IDL.Opt(IDL.Text),
    'preferences' : UserPreferences,
    'updatedAt' : Timestamp,
    'achievements' : IDL.Vec(IDL.Text),
    'referredBy' : IDL.Opt(UserId),
    'isVerified' : IDL.Bool,
    'totalDistance' : Distance,
    'totalIMERA' : TokenAmount,
    'solanaAddress' : IDL.Opt(IDL.Text),
    'avatar' : IDL.Opt(IDL.Text),
  });
  const FriendRequest = IDL.Record({
    'id' : IDL.Text,
    'to' : UserId,
    'status' : IDL.Text,
    'from' : UserId,
    'createdAt' : Timestamp,
    'respondedAt' : IDL.Opt(Timestamp),
  });
  const UserStats = IDL.Record({
    'avgSpeed' : Speed,
    'maxSpeed' : Speed,
    'longestSession' : IDL.Nat,
    'totalTime' : IDL.Nat,
    'achievements' : IDL.Nat,
    'totalDistance' : Distance,
    'longestStreak' : IDL.Nat,
    'totalSessions' : IDL.Nat,
    'friends' : IDL.Nat,
    'currentStreak' : IDL.Nat,
  });
  const UserDashboardSnapshot = IDL.Record({
    'referralCode' : IDL.Text,
    'recentSessions' : IDL.Vec(ActivitySession),
    'lastActivity' : Timestamp,
    'stats' : UserStats,
    'achievements' : IDL.Vec(IDL.Text),
    'friends' : IDL.Vec(UserId),
    'profile' : UserProfile,
  });
  const ReferralSummary = IDL.Record({
    'totalReferrals' : IDL.Nat,
    'referredUsers' : IDL.Vec(UserId),
  });
  const Result_1 = IDL.Variant({ 'ok' : UserProfile, 'err' : IDL.Text });
  const RideSummary = IDL.Record({
    'duration' : IDL.Nat,
    'avgSpeed' : Speed,
    'pointCount' : IDL.Nat,
    'maxSpeed' : Speed,
    'distance' : Distance,
    'timestamp' : Timestamp,
    'routePoints' : IDL.Vec(LocationPoint),
    'endPoint' : IDL.Record({
      'latitude' : IDL.Float64,
      'longitude' : IDL.Float64,
      'timestamp' : Timestamp,
      'accuracy' : IDL.Opt(IDL.Float64),
    }),
    'startPoint' : IDL.Record({
      'latitude' : IDL.Float64,
      'longitude' : IDL.Float64,
      'timestamp' : Timestamp,
      'accuracy' : IDL.Opt(IDL.Float64),
    }),
  });
  return IDL.Service({
    'clearUserData' : IDL.Func([UserId], [Result], []),
    'deactivateUser' : IDL.Func([UserId], [Result], []),
    'endActivitySession' : IDL.Func([IDL.Text, UserId], [Result], []),
    'eraseUserDataGDPR' : IDL.Func([UserId], [Result], []),
    'getActiveUsers' : IDL.Func([Timestamp], [IDL.Vec(UserId)], ['query']),
    'getActiveUsersCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getActivitySession' : IDL.Func(
        [UserId, IDL.Text],
        [IDL.Opt(ActivitySession)],
        ['query'],
      ),
    'getActivitySessions' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [IDL.Vec(ActivitySession)],
        ['query'],
      ),
    'getCanisterStatus' : IDL.Func([], [Result_2], []),
    'getCurrentUserProfile' : IDL.Func(
        [UserId],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'getReferralSummary' : IDL.Func(
        [UserId],
        [ReferralSummary],
        ['query'],
      ),
    'getFriendRequests' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(FriendRequest)],
        ['query'],
      ),
    'getFriends' : IDL.Func([UserId], [IDL.Vec(UserId)], ['query']),
    'getLeaderboard' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(IDL.Tuple(UserId, Distance))],
        ['query'],
      ),
    'getSolanaAddress' : IDL.Func([UserId], [IDL.Opt(IDL.Text)], ['query']),
    'getTotalUsersCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getUserDashboardSnapshot' : IDL.Func(
        [UserId],
        [IDL.Opt(UserDashboardSnapshot)],
        ['query'],
      ),
    'getUserProfile' : IDL.Func([UserId], [IDL.Opt(UserProfile)], ['query']),
    'getUserStats' : IDL.Func([UserId], [UserStats], ['query']),
    'recordUserActivity' : IDL.Func([UserId], [], []),
    'registerUser' : IDL.Func(
        [
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          UserId,
        ],
        [Result_1],
        [],
      ),
    'respondToFriendRequest' : IDL.Func(
        [IDL.Text, IDL.Bool, UserId],
        [Result],
        [],
      ),
    'sendFriendRequest' : IDL.Func([UserId, UserId], [Result], []),
    'startActivitySession' : IDL.Func([UserId], [Result], []),
    'updateActivitySession' : IDL.Func(
        [IDL.Text, Distance, Speed, Speed, IDL.Opt(LocationPoint), UserId],
        [Result],
        [],
      ),
    'updateActivitySessionWithPoints' : IDL.Func(
        [IDL.Text, Distance, Speed, Speed, IDL.Vec(LocationPoint), UserId],
        [Result],
        [],
      ),
    'updateActivitySessionWithSummary' : IDL.Func(
        [UserId, RideSummary],
        [Result],
        [],
      ),
    'updatePreferences' : IDL.Func([UserPreferences, UserId], [Result], []),
    'updatePrivacySettings' : IDL.Func([PrivacySettings, UserId], [Result], []),
    'updateProfile' : IDL.Func(
        [
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(SocialLinks),
          UserId,
        ],
        [Result],
        [],
      ),
    'updateSolanaAddress' : IDL.Func([IDL.Opt(IDL.Text), UserId], [Result], []),
    'verifyUser' : IDL.Func([UserId], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
