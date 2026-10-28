import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ActivitySession {
  'id' : string,
  'provenance' : RideProvenance,
  'startTime' : Timestamp,
  'duration' : bigint,
  'avgSpeed' : Speed,
  'maxSpeed' : Speed,
  'endTime' : [] | [Timestamp],
  'userId' : UserId,
  'distance' : Distance,
  'isActive' : boolean,
  'route' : Array<LocationPoint>,
}
export type AttestationOutcome = { 'AlreadyRecorded' : null } |
  { 'Matched' : null } |
  { 'Inserted' : null };
export interface AttestationReceipt {
  'provenance' : RideProvenance,
  'distance' : Distance,
  'sessionId' : string,
  'outcome' : AttestationOutcome,
}
export type AttestationSource = { 'ShadowWorker' : null } |
  { 'Strava' : null } |
  { 'Garmin' : null } |
  { 'Other' : string } |
  { 'AppleHealth' : null } |
  { 'GoogleFit' : null };
export type AttestationSource__1 = { 'ShadowWorker' : null } |
  { 'Strava' : null } |
  { 'Garmin' : null } |
  { 'Other' : string } |
  { 'AppleHealth' : null } |
  { 'GoogleFit' : null };
export type Distance = bigint;
export interface DistanceInRange {
  'attestedMeters' : Distance,
  'confirmedSessions' : bigint,
  'completedSessions' : bigint,
  'rejectedSessions' : bigint,
  'rejectedMeters' : Distance,
  'toTs' : Timestamp,
  'attestedSessions' : bigint,
  'completedMeters' : Distance,
  'activeMeters' : Distance,
  'confirmedMeters' : Distance,
  'activeSessions' : bigint,
  'fromTs' : Timestamp,
}
export interface ExternalLink {
  'linkedAt' : Timestamp,
  'lastAttestationAt' : [] | [Timestamp],
  'source' : AttestationSource,
  'attestationCount' : bigint,
  'accountHash' : string,
}
export interface ExternalLinkGrant { 'link' : ExternalLink, 'rider' : UserId }
export interface FriendRequest {
  'id' : string,
  'to' : UserId,
  'status' : string,
  'from' : UserId,
  'createdAt' : Timestamp,
  'respondedAt' : [] | [Timestamp],
}
export interface LocationPoint {
  'latitude' : number,
  'longitude' : number,
  'timestamp' : Timestamp,
  'accuracy' : [] | [number],
}
export interface NotificationSettings {
  'social' : boolean,
  'marketing' : boolean,
  'push' : boolean,
  'email' : boolean,
  'achievements' : boolean,
  'rewards' : boolean,
}
export interface PrivacySettings {
  'showLocation' : boolean,
  'profileVisibility' : string,
  'showAchievements' : boolean,
  'allowFriendRequests' : boolean,
  'showDistance' : boolean,
  'showSpeed' : boolean,
}
export interface PublicCard {
  'country' : [] | [string],
  'username' : string,
  'userId' : UserId,
  'totalXP' : bigint,
  'totalDistance' : Distance,
  'avatar' : [] | [string],
}
export interface ReferralSummary {
  'totalReferrals' : bigint,
  'referredUsers' : Array<UserId>,
  'lastReferredAt' : [] | [Timestamp],
}
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : AttestationReceipt } |
  { 'err' : string };
export type Result_2 = { 'ok' : UserProfile } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<ExternalLink> } |
  { 'err' : string };
export type Result_4 = {
    'ok' : {
      'canisterName' : string,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'activeSessions' : bigint,
      'totalUsers' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type Result_5 = { 'ok' : ExternalLinkGrant } |
  { 'err' : string };
export interface RideAttestation {
  'startTime' : Timestamp,
  'endTime' : Timestamp,
  'externalId' : string,
  'sourceAccountHash' : [] | [string],
  'distance' : Distance,
  'evidenceHash' : string,
}
export interface RideMatchPolicy {
  'matchDistanceTolerancePercent' : bigint,
  'matchWindowSeconds' : bigint,
}
export interface RideProvenance {
  'attestations' : Array<AttestationSource__1>,
  'deviceRecorded' : boolean,
}
export interface RideSummary {
  'duration' : bigint,
  'avgSpeed' : Speed,
  'pointCount' : bigint,
  'maxSpeed' : Speed,
  'distance' : Distance,
  'timestamp' : Timestamp,
  'routePoints' : Array<LocationPoint>,
  'endPoint' : {
    'latitude' : number,
    'longitude' : number,
    'timestamp' : Timestamp,
    'accuracy' : [] | [number],
  },
  'startPoint' : {
    'latitude' : number,
    'longitude' : number,
    'timestamp' : Timestamp,
    'accuracy' : [] | [number],
  },
}
export interface RideVerificationPolicy {
  'maxDailyDistanceM' : bigint,
  'maxAvgSpeedKmh' : bigint,
}
export interface SocialLinks {
  'strava' : [] | [string],
  'twitter' : [] | [string],
  'instagram' : [] | [string],
  'website' : [] | [string],
}
export type Speed = bigint;
export type Timestamp = bigint;
export type TokenAmount = bigint;
export interface UserDashboardSnapshot {
  'referralCode' : string,
  'recentSessions' : Array<ActivitySession>,
  'lastActivity' : Timestamp,
  'stats' : UserStats,
  'achievements' : Array<string>,
  'friends' : Array<UserId>,
  'profile' : UserProfile,
}
export type UserId = Principal;
export interface UserIdentity { 'id' : UserId, 'username' : string }
export interface UserPreferences {
  'theme' : string,
  'notifications' : NotificationSettings,
  'autoStart' : boolean,
  'language' : string,
  'units' : string,
  'dataSharing' : boolean,
  'voiceGuidance' : boolean,
}
export interface UserProfile {
  'id' : UserId,
  'bio' : [] | [string],
  'privacySettings' : PrivacySettings,
  'referralCode' : string,
  'username' : string,
  'displayName' : [] | [string],
  'totalXP' : bigint,
  'socialLinks' : SocialLinks,
  'lastActivity' : Timestamp,
  'createdAt' : Timestamp,
  'isActive' : boolean,
  'email' : [] | [string],
  'preferences' : UserPreferences,
  'updatedAt' : Timestamp,
  'achievements' : Array<string>,
  'referredBy' : [] | [UserId],
  'isVerified' : boolean,
  'totalDistance' : Distance,
  'totalIMERA' : TokenAmount,
  'solanaAddress' : [] | [string],
  'avatar' : [] | [string],
}
export interface UserStats {
  'avgSpeed' : Speed,
  'maxSpeed' : Speed,
  'longestSession' : bigint,
  'totalTime' : bigint,
  'achievements' : bigint,
  'totalDistance' : Distance,
  'longestStreak' : bigint,
  'totalSessions' : bigint,
  'friends' : bigint,
  'currentStreak' : bigint,
}
export interface _SERVICE {
  'addAdminPrincipal' : ActorMethod<[Principal], Result>,
  'addTrustedRideReader' : ActorMethod<[Principal], Result>,
  'addTrustedRideWriter' : ActorMethod<[Principal], Result>,
  'beginExternalLink' : ActorMethod<[AttestationSource], Result>,
  'clearUserData' : ActorMethod<[UserId], Result>,
  'completeExternalLink' : ActorMethod<
    [string, AttestationSource, string],
    Result_5
  >,
  'deactivateUser' : ActorMethod<[UserId], Result>,
  'deleteUserByPrincipal' : ActorMethod<[UserId], Result>,
  'endActivitySession' : ActorMethod<[string, UserId], Result>,
  'eraseUserDataGDPR' : ActorMethod<[UserId], Result>,
  'getActiveUsers' : ActorMethod<[Timestamp], Array<UserId>>,
  'getActiveUsersCount' : ActorMethod<[], bigint>,
  'getActivitySession' : ActorMethod<[UserId, string], [] | [ActivitySession]>,
  'getActivitySessions' : ActorMethod<
    [UserId, [] | [bigint], [] | [bigint]],
    Array<ActivitySession>
  >,
  'getCanisterStatus' : ActorMethod<[], Result_4>,
  'getCurrentUserProfile' : ActorMethod<[UserId], [] | [UserProfile]>,
  'getDistanceInRange' : ActorMethod<
    [UserId, Timestamp, Timestamp],
    DistanceInRange
  >,
  'getExternalLinks' : ActorMethod<[UserId], Result_3>,
  'getFriendRequests' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<FriendRequest>
  >,
  'getFriends' : ActorMethod<[UserId], Array<UserId>>,
  'getLeaderboard' : ActorMethod<[bigint], Array<[UserId, Distance]>>,
  'getPublicCards' : ActorMethod<[Array<UserId>], Array<PublicCard>>,
  'getReferralSummary' : ActorMethod<[UserId], ReferralSummary>,
  'getRideMatchPolicy' : ActorMethod<[], RideMatchPolicy>,
  'getRideVerificationPolicy' : ActorMethod<[], RideVerificationPolicy>,
  'getSolanaAddress' : ActorMethod<[UserId], [] | [string]>,
  'getTotalUsersCount' : ActorMethod<[], bigint>,
  'getTrustedRideReaders' : ActorMethod<[], Array<Principal>>,
  'getTrustedRideWriters' : ActorMethod<[], Array<Principal>>,
  'getUserByUsername' : ActorMethod<[string], [] | [UserIdentity]>,
  'getUserDashboardSnapshot' : ActorMethod<
    [UserId],
    [] | [UserDashboardSnapshot]
  >,
  'getUserProfile' : ActorMethod<[UserId], [] | [UserProfile]>,
  'getUserStats' : ActorMethod<[UserId], UserStats>,
  'getVerifiedDistanceInRange' : ActorMethod<
    [UserId, Timestamp, Timestamp],
    Distance
  >,
  'recordUserActivity' : ActorMethod<[UserId], undefined>,
  'registerUser' : ActorMethod<
    [string, [] | [string], [] | [string], [] | [string], UserId],
    Result_2
  >,
  'removeAdminPrincipal' : ActorMethod<[Principal], Result>,
  'removeTrustedRideReader' : ActorMethod<[Principal], Result>,
  'removeTrustedRideWriter' : ActorMethod<[Principal], Result>,
  'respondToFriendRequest' : ActorMethod<[string, boolean, UserId], Result>,
  'revokeAttestedRide' : ActorMethod<
    [UserId, AttestationSource, string],
    Result
  >,
  'sendFriendRequest' : ActorMethod<[UserId, UserId], Result>,
  'setRideMatchPolicy' : ActorMethod<[RideMatchPolicy], Result>,
  'setRideVerificationPolicy' : ActorMethod<[RideVerificationPolicy], Result>,
  'startActivitySession' : ActorMethod<[UserId], Result>,
  'submitAttestedRide' : ActorMethod<
    [UserId, AttestationSource, RideAttestation],
    Result_1
  >,
  'submitCompletedRide' : ActorMethod<[RideSummary], Result>,
  'unlinkExternalAccount' : ActorMethod<[UserId, AttestationSource], Result>,
  'updateActivitySession' : ActorMethod<
    [string, Distance, Speed, Speed, [] | [LocationPoint], UserId],
    Result
  >,
  'updateActivitySessionWithPoints' : ActorMethod<
    [string, Distance, Speed, Speed, Array<LocationPoint>, UserId],
    Result
  >,
  'updateActivitySessionWithSummary' : ActorMethod<
    [UserId, RideSummary],
    Result
  >,
  'updatePreferences' : ActorMethod<[UserPreferences, UserId], Result>,
  'updatePrivacySettings' : ActorMethod<[PrivacySettings, UserId], Result>,
  'updateProfile' : ActorMethod<
    [
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [SocialLinks],
      UserId,
    ],
    Result
  >,
  'updateSolanaAddress' : ActorMethod<[[] | [string], UserId], Result>,
  'verifyUser' : ActorMethod<[UserId], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
