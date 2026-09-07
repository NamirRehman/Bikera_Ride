import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface BridgeConfig {
  'minBridgeAmount' : TokenAmount,
  'processingDelay' : bigint,
  'dailyBridgeLimit' : TokenAmount,
  'maxPendingRequests' : bigint,
  'bridgeFee' : TokenAmount,
  'maxBridgeAmount' : TokenAmount,
}
export interface BridgeRequest {
  'id' : string,
  'status' : BridgeStatus,
  'transactionHash' : [] | [string],
  'userId' : UserId,
  'createdAt' : Timestamp,
  'errorMessage' : [] | [string],
  'processedAt' : [] | [Timestamp],
  'solanaAddress' : SolanaAddress,
  'amount' : TokenAmount,
}
export type BridgeStatus = { 'Failed' : null } |
  { 'Cancelled' : null } |
  { 'Processing' : null } |
  { 'Completed' : null } |
  { 'Pending' : null };
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = {
    'ok' : {
      'canisterName' : string,
      'version' : string,
      'cycles' : bigint,
      'pendingRequests' : bigint,
      'uptime' : Timestamp,
      'totalRequests' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
    }
  } |
  { 'err' : string };
export type SolanaAddress = string;
export type Timestamp = bigint;
export type TokenAmount = bigint;
export type UserId = Principal;
export interface _SERVICE {
  'cancelBridgeRequest' : ActorMethod<[string], Result>,
  'clearOldData' : ActorMethod<[], Result>,
  'completeBridgeRequest' : ActorMethod<[string, string], Result>,
  'emergencyPause' : ActorMethod<[], Result>,
  'emergencyResume' : ActorMethod<[], Result>,
  'failBridgeRequest' : ActorMethod<[string, string], Result>,
  'generateWeeklyClaimReport' : ActorMethod<[], Result>,
  'getAdminPrincipal' : ActorMethod<[], Principal>,
  'getBridgeConfig' : ActorMethod<[], BridgeConfig>,
  'getBridgeRequest' : ActorMethod<[string], [] | [BridgeRequest]>,
  'getCanisterStatus' : ActorMethod<[], Result_1>,
  'getPendingBridgeRequests' : ActorMethod<[], Array<BridgeRequest>>,
  'getUserBridgeHistory' : ActorMethod<
    [UserId, [] | [bigint]],
    Array<BridgeRequest>
  >,
  'initializeAdmin' : ActorMethod<[Principal], Result>,
  'isBridgePaused' : ActorMethod<[], boolean>,
  'processBridgeRequest' : ActorMethod<[string], Result>,
  'requestBridge' : ActorMethod<[SolanaAddress, TokenAmount], Result>,
  'setCanisterReferences' : ActorMethod<[Principal, Principal], Result>,
  'updateBridgeConfig' : ActorMethod<[BridgeConfig], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
