import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ActivitySession {
  'id' : string,
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
export type Distance = bigint;
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
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : UserProfile } |
  { 'err' : string };
export type Result_2 = {
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
export interface ReferralSummary {
  'totalReferrals' : bigint,
  'referredUsers' : Array<UserId>,
}
export type UserId = Principal;
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
  'clearUserData' : ActorMethod<[UserId], Result>,
  'deactivateUser' : ActorMethod<[UserId], Result>,
  'endActivitySession' : ActorMethod<[string, UserId], Result>,
  'eraseUserDataGDPR' : ActorMethod<[UserId], Result>,
  'getActiveUsers' : ActorMethod<[Timestamp], Array<UserId>>,
  'getActiveUsersCount' : ActorMethod<[], bigint>,
  'getActivitySession' : ActorMethod<[UserId, string], [] | [ActivitySession]>,
  'getActivitySessions' : ActorMethod<
    [UserId, [] | [bigint], [] | [bigint]],
    Array<ActivitySession>
  >,
  'getCanisterStatus' : ActorMethod<[], Result_2>,
  'getCurrentUserProfile' : ActorMethod<[UserId], [] | [UserProfile]>,
  'getReferralSummary' : ActorMethod<[UserId], ReferralSummary>,
  'getFriendRequests' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<FriendRequest>
  >,
  'getFriends' : ActorMethod<[UserId], Array<UserId>>,
  'getLeaderboard' : ActorMethod<[bigint], Array<[UserId, Distance]>>,
  'getSolanaAddress' : ActorMethod<[UserId], [] | [string]>,
  'getTotalUsersCount' : ActorMethod<[], bigint>,
  'getUserDashboardSnapshot' : ActorMethod<
    [UserId],
    [] | [UserDashboardSnapshot]
  >,
  'getUserProfile' : ActorMethod<[UserId], [] | [UserProfile]>,
  'getUserStats' : ActorMethod<[UserId], UserStats>,
  'recordUserActivity' : ActorMethod<[UserId], undefined>,
  'registerUser' : ActorMethod<
    [string, [] | [string], [] | [string], [] | [string], UserId],
    Result_1
  >,
  'respondToFriendRequest' : ActorMethod<[string, boolean, UserId], Result>,
  'sendFriendRequest' : ActorMethod<[UserId, UserId], Result>,
  'startActivitySession' : ActorMethod<[UserId], Result>,
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
