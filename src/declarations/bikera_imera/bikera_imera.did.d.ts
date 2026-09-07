import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Account {
  'owner' : Principal,
  'subaccount' : [] | [Subaccount],
}
export interface Allowance {
  'allowance' : bigint,
  'expires_at' : [] | [bigint],
}
export type ApproveError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'Duplicate' : { 'duplicate_of' : TxIndex } } |
  { 'BadFee' : { 'expected_fee' : Tokens } } |
  { 'AllowanceChanged' : { 'current_allowance' : bigint } } |
  { 'CreatedInFuture' : { 'ledger_time' : Timestamp } } |
  { 'TooOld' : null } |
  { 'Expired' : { 'ledger_time' : bigint } } |
  { 'InsufficientFunds' : { 'balance' : Tokens } };
export interface BikeraIMERA {
  'addAuthorizedMinter' : ActorMethod<[Principal], Result>,
  'admin_clear_logo' : ActorMethod<[], Result>,
  'admin_register_lock_owner' : ActorMethod<[Principal], Result>,
  'admin_remove_lock_owner' : ActorMethod<[Principal], Result>,
  'admin_set_foundation_fee_percentage' : ActorMethod<[bigint], Result>,
  'admin_set_lock_owner_reward_percentage' : ActorMethod<[bigint], Result>,
  'admin_set_logo' : ActorMethod<[string], Result>,
  'admin_set_minting_account' : ActorMethod<[Account], Result>,
  'admin_set_token_decimals' : ActorMethod<[number], Result>,
  'admin_set_token_name' : ActorMethod<[string], Result>,
  'admin_set_token_symbol' : ActorMethod<[string], Result>,
  'admin_set_transfer_fee' : ActorMethod<[bigint], Result>,
  'burn' : ActorMethod<[Account, Tokens], Result>,
  'burnForSolanaClaim' : ActorMethod<[Account, Tokens], Result>,
  'canClaimToSolana' : ActorMethod<[Principal, Tokens], Result_2>,
  'canUserWin' : ActorMethod<[Principal], Result_2>,
  'claimLockOwnerRewards' : ActorMethod<[], Result>,
  'clearWeeklyClaimReport' : ActorMethod<[], Result>,
  'distributeLockOwnerRewards' : ActorMethod<[Tokens], Result>,
  'emergencyPause' : ActorMethod<[], Result>,
  'emergencyResume' : ActorMethod<[], Result>,
  'executePremine' : ActorMethod<[Account], Result>,
  'getAccountBalance' : ActorMethod<[Account], Tokens>,
  'getBikeraStats' : ActorMethod<
    [],
    {
      'totalMined' : Tokens,
      'solanaCapRemaining' : Tokens,
      'totalClaimedToSolana' : Tokens,
      'totalSupply' : Tokens,
      'premineComplete' : boolean,
      'mineableRemaining' : Tokens,
      'totalFoundationEarned' : Tokens,
    }
  >,
  'getBurnAddress' : ActorMethod<[], string>,
  'getCanisterStatus' : ActorMethod<[], Result_1>,
  'getFoundationAccount' : ActorMethod<[], [] | [Account]>,
  'getFoundationFeeStats' : ActorMethod<
    [],
    {
      'currentPercentage' : bigint,
      'maxPercentage' : bigint,
      'minPercentage' : bigint,
      'totalFoundationEarned' : Tokens,
    }
  >,
  'getLockOwnerRewards' : ActorMethod<[Principal], Tokens>,
  'getLockOwnerStats' : ActorMethod<
    [],
    {
      'registeredLockOwners' : Array<Principal>,
      'totalLockOwnerRewards' : Tokens,
      'currentPercentage' : bigint,
      'maxPercentage' : bigint,
      'minPercentage' : bigint,
    }
  >,
  'getSolanaClaimBalance' : ActorMethod<[], Tokens>,
  'getTotalClaimedToSolana' : ActorMethod<[], Tokens>,
  'getTotalSupply' : ActorMethod<[], Tokens>,
  'getTransactionHistory' : ActorMethod<
    [[] | [bigint]],
    Array<
      {
        'to' : Account,
        'fee' : Tokens,
        'from' : Account,
        'memo' : [] | [Memo],
        'timestamp' : Timestamp,
        'amount' : Tokens,
      }
    >
  >,
  'getUserBikeraStats' : ActorMethod<
    [Principal],
    {
      'dailyWins' : bigint,
      'lifetimeClaimed' : Tokens,
      'lifetimeMined' : Tokens,
      'lastWinTime' : [] | [Timestamp],
      'consecutiveWins' : bigint,
      'remainingClaimable' : Tokens,
    }
  >,
  'getUserClaimStats' : ActorMethod<
    [Principal],
    {
      'lifetimeClaimed' : Tokens,
      'lifetimeMined' : Tokens,
      'cooldownEndsAt' : [] | [Timestamp],
      'globalSolanaRemaining' : Tokens,
      'remainingClaimable' : Tokens,
    }
  >,
  'getWeeklyClaimReport' : ActorMethod<
    [],
    Array<[Principal, Account, string, Tokens]>
  >,
  'get_foundation_fee_percentage' : ActorMethod<[], bigint>,
  'get_minting_account' : ActorMethod<[], Account>,
  'get_transfer_fee' : ActorMethod<[], bigint>,
  'icrc1_balance_of' : ActorMethod<[Account], Tokens>,
  'icrc1_decimals' : ActorMethod<[], number>,
  'icrc1_fee' : ActorMethod<[], bigint>,
  'icrc1_logo' : ActorMethod<[], [] | [string]>,
  'icrc1_metadata' : ActorMethod<[], Array<[string, Value]>>,
  'icrc1_minting_account' : ActorMethod<[], [] | [Account]>,
  'icrc1_name' : ActorMethod<[], string>,
  'icrc1_supported_standards' : ActorMethod<
    [],
    Array<{ 'url' : string, 'name' : string }>
  >,
  'icrc1_symbol' : ActorMethod<[], string>,
  'icrc1_total_supply' : ActorMethod<[], Tokens>,
  'icrc1_transfer' : ActorMethod<
    [
      {
        'to' : Account,
        'fee' : [] | [Tokens],
        'memo' : [] | [Memo],
        'from_subaccount' : [] | [Subaccount],
        'created_at_time' : [] | [Timestamp],
        'amount' : Tokens,
      },
    ],
    StdResult_2
  >,
  'icrc2_allowance' : ActorMethod<
    [{ 'account' : Account, 'spender' : Account }],
    Allowance
  >,
  'icrc2_approve' : ActorMethod<
    [
      {
        'fee' : [] | [Tokens],
        'memo' : [] | [Memo],
        'from_subaccount' : [] | [Subaccount],
        'created_at_time' : [] | [Timestamp],
        'amount' : bigint,
        'expected_allowance' : [] | [bigint],
        'expires_at' : [] | [bigint],
        'spender' : Account,
      },
    ],
    StdResult_1
  >,
  'icrc2_transfer_from' : ActorMethod<
    [
      {
        'to' : Account,
        'fee' : [] | [Tokens],
        'spender_subaccount' : [] | [Subaccount],
        'from' : Account,
        'memo' : [] | [Memo],
        'created_at_time' : [] | [Timestamp],
        'amount' : Tokens,
      },
    ],
    StdResult
  >,
  'initialize' : ActorMethod<[Array<Principal>], Result>,
  'initializeAdmin' : ActorMethod<[Principal], Result>,
  'isLockOwner' : ActorMethod<[Principal], boolean>,
  'isPremined' : ActorMethod<[], boolean>,
  'isSystemPaused' : ActorMethod<[], boolean>,
  'is_authorized_minter' : ActorMethod<[Principal], boolean>,
  'mint' : ActorMethod<[Account, Tokens], Result>,
  'recordSolanaClaim' : ActorMethod<[Principal, Tokens], Result>,
  'recordWin' : ActorMethod<[Principal, Tokens, [] | [string]], Result>,
  'removeAuthorizedMinter' : ActorMethod<[Principal], Result>,
  'resetConsecutiveWins' : ActorMethod<[Principal], Result>,
  'setArchiveCanister' : ActorMethod<[Principal], undefined>,
  'setFoundationAccount' : ActorMethod<[Account], Result>,
}
export type Memo = Uint8Array | number[];
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = {
    'ok' : {
      'canisterName' : string,
      'totalSupply' : Tokens,
      'version' : string,
      'cycles' : bigint,
      'uptime' : bigint,
      'memorySize' : bigint,
      'canisterId' : string,
      'totalTransactions' : bigint,
    }
  } |
  { 'err' : string };
export type Result_2 = { 'ok' : boolean } |
  { 'err' : string };
export type StdResult = { 'Ok' : TxIndex } |
  { 'Err' : TransferFromError };
export type StdResult_1 = { 'Ok' : TxIndex } |
  { 'Err' : ApproveError };
export type StdResult_2 = { 'Ok' : TxIndex } |
  { 'Err' : TransferError };
export type Subaccount = Uint8Array | number[];
export type Timestamp = bigint;
export type Tokens = bigint;
export type TransferError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'BadBurn' : { 'min_burn_amount' : Tokens } } |
  { 'Duplicate' : { 'duplicate_of' : TxIndex } } |
  { 'BadFee' : { 'expected_fee' : Tokens } } |
  { 'CreatedInFuture' : { 'ledger_time' : Timestamp } } |
  { 'TooOld' : null } |
  { 'InsufficientFunds' : { 'balance' : Tokens } };
export type TransferFromError = {
    'GenericError' : { 'message' : string, 'error_code' : bigint }
  } |
  { 'TemporarilyUnavailable' : null } |
  { 'InsufficientAllowance' : { 'allowance' : bigint } } |
  { 'BadBurn' : { 'min_burn_amount' : Tokens } } |
  { 'Duplicate' : { 'duplicate_of' : TxIndex } } |
  { 'BadFee' : { 'expected_fee' : Tokens } } |
  { 'CreatedInFuture' : { 'ledger_time' : Timestamp } } |
  { 'TooOld' : null } |
  { 'InsufficientFunds' : { 'balance' : Tokens } };
export type TxIndex = bigint;
export type Value = { 'Int' : bigint } |
  { 'Nat' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Text' : string };
export interface _SERVICE extends BikeraIMERA {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
