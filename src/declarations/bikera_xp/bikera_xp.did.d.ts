import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Achievement {
  'id' : string,
  'reward' : XPAmount,
  'name' : string,
  'description' : string,
  'isUnlocked' : boolean,
  'requiredXP' : XPAmount,
}
export type Day = bigint;
export type Distance = bigint;
export interface LevelConfig {
  'level' : bigint,
  'benefits' : Array<string>,
  'requiredXP' : XPAmount,
}
export type Result = { 'ok' : bigint } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_2 = {
    'ok' : {
      'canisterName' : string,
      'totalXP' : bigint,
      'version' : string,
      'cycles' : bigint,
      'uptime' : Timestamp,
      'totalUsers' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type Result_3 = { 'ok' : XPAmount } |
  { 'err' : string };
export type TimeFilter = { 'AllTime' : null } |
  { 'Weekly' : null } |
  { 'Daily' : null } |
  { 'Monthly' : null };
export type Timestamp = bigint;
export type UserId = Principal;
export interface UserXPProfile {
  'userId' : UserId,
  'totalXP' : XPAmount,
  'lastActivity' : Timestamp,
  'streakDays' : bigint,
  'referralCount' : bigint,
  'achievements' : Array<string>,
  'totalDistance' : Distance,
  'lastStreakDay' : [] | [Day],
  'currentLevel' : bigint,
  'xpToNextLevel' : XPAmount,
}
export type XPAmount = bigint;
export type XPReason = { 'Achievement' : string } |
  { 'Distance' : Distance } |
  { 'Mining' : bigint } |
  { 'Referral' : UserId } |
  { 'Penalty' : string };
export interface XPSnapshot {
  'weeklyXP' : XPAmount,
  'totalXP' : XPAmount,
  'level' : bigint,
  'recentTransactions' : Array<XPTransaction>,
  'dailyXP' : XPAmount,
  'nextLevelXP' : XPAmount,
  'levelProgress' : number,
}
export interface XPTransaction {
  'metadata' : [] | [string],
  'userId' : UserId,
  'distance' : [] | [Distance],
  'timestamp' : Timestamp,
  'amount' : XPAmount,
  'reason' : XPReason,
}
export interface _SERVICE {
  'addAchievementXP' : ActorMethod<[UserId, string], Result_3>,
  'addDistanceXP' : ActorMethod<[UserId, Distance], Result_3>,
  'addDistanceXPBatch' : ActorMethod<[UserId, Distance], Result_3>,
  'addMiningBonus' : ActorMethod<[UserId, XPAmount], Result_3>,
  'addReferralBonus' : ActorMethod<[UserId, UserId], Result_3>,
  'addXP' : ActorMethod<
    [UserId, XPAmount, XPReason, [] | [Distance], [] | [string]],
    Result_3
  >,
  'applyPenalty' : ActorMethod<[UserId, XPAmount, string], Result_3>,
  'clearOldTransactions' : ActorMethod<[], Result_1>,
  'getAchievementDefinitions' : ActorMethod<[], Array<Achievement>>,
  'getAchievements' : ActorMethod<[UserId], Array<string>>,
  'getCanisterStatus' : ActorMethod<[], Result_2>,
  'getDailyXPClaimed' : ActorMethod<[UserId, Day], XPAmount>,
  'getLeaderboard' : ActorMethod<[bigint], Array<[UserId, XPAmount]>>,
  'getLeaderboardWithFilter' : ActorMethod<
    [bigint, TimeFilter],
    Array<[UserId, XPAmount]>
  >,
  'getLevel' : ActorMethod<[UserId], bigint>,
  'getLevelConfigs' : ActorMethod<[], Array<LevelConfig>>,
  'getPublicUserXPProfile' : ActorMethod<[UserId], UserXPProfile>,
  'getReferralCount' : ActorMethod<[UserId], bigint>,
  'getStreakDays' : ActorMethod<[UserId], bigint>,
  'getTotalDistance' : ActorMethod<[UserId], Distance>,
  'getTotalXP' : ActorMethod<[UserId], XPAmount>,
  'getXPSnapshot' : ActorMethod<[UserId], XPSnapshot>,
  'getXPToNextLevel' : ActorMethod<[UserId], XPAmount>,
  'getXPTransactions' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<XPTransaction>
  >,
  'isAutomatedXPMintingActive' : ActorMethod<[], boolean>,
  'resetUserXP' : ActorMethod<[UserId], Result_1>,
  'startAutomatedXPMinting' : ActorMethod<[], Result_1>,
  'stopAutomatedXPMinting' : ActorMethod<[], Result_1>,
  'updateLevelConfigs' : ActorMethod<[Array<LevelConfig>], Result_1>,
  'updateStreak' : ActorMethod<[UserId], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
