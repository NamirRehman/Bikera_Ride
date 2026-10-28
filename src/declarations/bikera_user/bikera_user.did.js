export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const AttestationSource = IDL.Variant({
    'ShadowWorker' : IDL.Null,
    'Strava' : IDL.Null,
    'Garmin' : IDL.Null,
    'Other' : IDL.Text,
    'AppleHealth' : IDL.Null,
    'GoogleFit' : IDL.Null,
  });
  const UserId = IDL.Principal;
  const Timestamp = IDL.Int;
  const ExternalLink = IDL.Record({
    'linkedAt' : Timestamp,
    'lastAttestationAt' : IDL.Opt(Timestamp),
    'source' : AttestationSource,
    'attestationCount' : IDL.Nat,
    'accountHash' : IDL.Text,
  });
  const ExternalLinkGrant = IDL.Record({
    'link' : ExternalLink,
    'rider' : UserId,
  });
  const Result_5 = IDL.Variant({ 'ok' : ExternalLinkGrant, 'err' : IDL.Text });
  const AttestationSource__1 = IDL.Variant({
    'ShadowWorker' : IDL.Null,
    'Strava' : IDL.Null,
    'Garmin' : IDL.Null,
    'Other' : IDL.Text,
    'AppleHealth' : IDL.Null,
    'GoogleFit' : IDL.Null,
  });
  const RideProvenance = IDL.Record({
    'attestations' : IDL.Vec(AttestationSource__1),
    'deviceRecorded' : IDL.Bool,
  });
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
    'provenance' : RideProvenance,
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
  const Result_4 = IDL.Variant({
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
  const DistanceInRange = IDL.Record({
    'attestedMeters' : Distance,
    'confirmedSessions' : IDL.Nat,
    'completedSessions' : IDL.Nat,
    'rejectedSessions' : IDL.Nat,
    'rejectedMeters' : Distance,
    'toTs' : Timestamp,
    'attestedSessions' : IDL.Nat,
    'completedMeters' : Distance,
    'activeMeters' : Distance,
    'confirmedMeters' : Distance,
    'activeSessions' : IDL.Nat,
    'fromTs' : Timestamp,
  });
  const Result_3 = IDL.Variant({
    'ok' : IDL.Vec(ExternalLink),
    'err' : IDL.Text,
  });
  const FriendRequest = IDL.Record({
    'id' : IDL.Text,
    'to' : UserId,
    'status' : IDL.Text,
    'from' : UserId,
    'createdAt' : Timestamp,
    'respondedAt' : IDL.Opt(Timestamp),
  });
  const PublicCard = IDL.Record({
    'country' : IDL.Opt(IDL.Text),
    'username' : IDL.Text,
    'userId' : UserId,
    'totalXP' : IDL.Nat,
    'totalDistance' : Distance,
    'avatar' : IDL.Opt(IDL.Text),
  });
  const ReferralSummary = IDL.Record({
    'totalReferrals' : IDL.Nat,
    'referredUsers' : IDL.Vec(UserId),
    'lastReferredAt' : IDL.Opt(Timestamp),
  });
  const RideMatchPolicy = IDL.Record({
    'matchDistanceTolerancePercent' : IDL.Nat,
    'matchWindowSeconds' : IDL.Nat,
  });
  const RideVerificationPolicy = IDL.Record({
    'maxDailyDistanceM' : IDL.Nat,
    'maxAvgSpeedKmh' : IDL.Nat,
  });
  const UserIdentity = IDL.Record({ 'id' : UserId, 'username' : IDL.Text });
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
  const Result_2 = IDL.Variant({ 'ok' : UserProfile, 'err' : IDL.Text });
  const RideAttestation = IDL.Record({
    'startTime' : Timestamp,
    'endTime' : Timestamp,
    'externalId' : IDL.Text,
    'sourceAccountHash' : IDL.Opt(IDL.Text),
    'distance' : Distance,
    'evidenceHash' : IDL.Text,
  });
  const AttestationOutcome = IDL.Variant({
    'AlreadyRecorded' : IDL.Null,
    'Matched' : IDL.Null,
    'Inserted' : IDL.Null,
  });
  const AttestationReceipt = IDL.Record({
    'provenance' : RideProvenance,
    'distance' : Distance,
    'sessionId' : IDL.Text,
    'outcome' : AttestationOutcome,
  });
  const Result_1 = IDL.Variant({ 'ok' : AttestationReceipt, 'err' : IDL.Text });
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
    'addAdminPrincipal' : IDL.Func([IDL.Principal], [Result], []),
    'addTrustedRideReader' : IDL.Func([IDL.Principal], [Result], []),
    'addTrustedRideWriter' : IDL.Func([IDL.Principal], [Result], []),
    'beginExternalLink' : IDL.Func([AttestationSource], [Result], []),
    'clearUserData' : IDL.Func([UserId], [Result], []),
    'completeExternalLink' : IDL.Func(
        [IDL.Text, AttestationSource, IDL.Text],
        [Result_5],
        [],
      ),
    'deactivateUser' : IDL.Func([UserId], [Result], []),
    'deleteUserByPrincipal' : IDL.Func([UserId], [Result], []),
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
    'getCanisterStatus' : IDL.Func([], [Result_4], []),
    'getCurrentUserProfile' : IDL.Func(
        [UserId],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'getDistanceInRange' : IDL.Func(
        [UserId, Timestamp, Timestamp],
        [DistanceInRange],
        ['query'],
      ),
    'getExternalLinks' : IDL.Func([UserId], [Result_3], ['query']),
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
    'getPublicCards' : IDL.Func(
        [IDL.Vec(UserId)],
        [IDL.Vec(PublicCard)],
        ['query'],
      ),
    'getReferralSummary' : IDL.Func([UserId], [ReferralSummary], ['query']),
    'getRideMatchPolicy' : IDL.Func([], [RideMatchPolicy], ['query']),
    'getRideVerificationPolicy' : IDL.Func(
        [],
        [RideVerificationPolicy],
        ['query'],
      ),
    'getSolanaAddress' : IDL.Func([UserId], [IDL.Opt(IDL.Text)], ['query']),
    'getTotalUsersCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getTrustedRideReaders' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getTrustedRideWriters' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'getUserByUsername' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(UserIdentity)],
        ['query'],
      ),
    'getUserDashboardSnapshot' : IDL.Func(
        [UserId],
        [IDL.Opt(UserDashboardSnapshot)],
        ['query'],
      ),
    'getUserProfile' : IDL.Func([UserId], [IDL.Opt(UserProfile)], ['query']),
    'getUserStats' : IDL.Func([UserId], [UserStats], ['query']),
    'getVerifiedDistanceInRange' : IDL.Func(
        [UserId, Timestamp, Timestamp],
        [Distance],
        ['query'],
      ),
    'recordUserActivity' : IDL.Func([UserId], [], []),
    'registerUser' : IDL.Func(
        [
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          IDL.Opt(IDL.Text),
          UserId,
        ],
        [Result_2],
        [],
      ),
    'removeAdminPrincipal' : IDL.Func([IDL.Principal], [Result], []),
    'removeTrustedRideReader' : IDL.Func([IDL.Principal], [Result], []),
    'removeTrustedRideWriter' : IDL.Func([IDL.Principal], [Result], []),
    'respondToFriendRequest' : IDL.Func(
        [IDL.Text, IDL.Bool, UserId],
        [Result],
        [],
      ),
    'revokeAttestedRide' : IDL.Func(
        [UserId, AttestationSource, IDL.Text],
        [Result],
        [],
      ),
    'sendFriendRequest' : IDL.Func([UserId, UserId], [Result], []),
    'setRideMatchPolicy' : IDL.Func([RideMatchPolicy], [Result], []),
    'setRideVerificationPolicy' : IDL.Func(
        [RideVerificationPolicy],
        [Result],
        [],
      ),
    'startActivitySession' : IDL.Func([UserId], [Result], []),
    'submitAttestedRide' : IDL.Func(
        [UserId, AttestationSource, RideAttestation],
        [Result_1],
        [],
      ),
    'submitCompletedRide' : IDL.Func([RideSummary], [Result], []),
    'unlinkExternalAccount' : IDL.Func(
        [UserId, AttestationSource],
        [Result],
        [],
      ),
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
