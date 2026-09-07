export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const Tokens = IDL.Nat;
  const Result_2 = IDL.Variant({ 'ok' : IDL.Bool, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'totalSupply' : Tokens,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : IDL.Nat64,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
      'totalTransactions' : IDL.Nat,
    }),
    'err' : IDL.Text,
  });
  const Memo = IDL.Vec(IDL.Nat8);
  const Timestamp = IDL.Nat64;
  const Value = IDL.Variant({
    'Int' : IDL.Int,
    'Nat' : IDL.Nat,
    'Blob' : IDL.Vec(IDL.Nat8),
    'Text' : IDL.Text,
  });
  const TxIndex = IDL.Nat;
  const TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'BadBurn' : IDL.Record({ 'min_burn_amount' : Tokens }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : TxIndex }),
    'BadFee' : IDL.Record({ 'expected_fee' : Tokens }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : Timestamp }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens }),
  });
  const StdResult_2 = IDL.Variant({ 'Ok' : TxIndex, 'Err' : TransferError });
  const Allowance = IDL.Record({
    'allowance' : IDL.Nat,
    'expires_at' : IDL.Opt(IDL.Nat64),
  });
  const ApproveError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'Duplicate' : IDL.Record({ 'duplicate_of' : TxIndex }),
    'BadFee' : IDL.Record({ 'expected_fee' : Tokens }),
    'AllowanceChanged' : IDL.Record({ 'current_allowance' : IDL.Nat }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : Timestamp }),
    'TooOld' : IDL.Null,
    'Expired' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens }),
  });
  const StdResult_1 = IDL.Variant({ 'Ok' : TxIndex, 'Err' : ApproveError });
  const TransferFromError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'InsufficientAllowance' : IDL.Record({ 'allowance' : IDL.Nat }),
    'BadBurn' : IDL.Record({ 'min_burn_amount' : Tokens }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : TxIndex }),
    'BadFee' : IDL.Record({ 'expected_fee' : Tokens }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : Timestamp }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens }),
  });
  const StdResult = IDL.Variant({ 'Ok' : TxIndex, 'Err' : TransferFromError });
  const BikeraIMERA = IDL.Service({
    'addAuthorizedMinter' : IDL.Func([IDL.Principal], [Result], []),
    'admin_clear_logo' : IDL.Func([], [Result], []),
    'admin_register_lock_owner' : IDL.Func([IDL.Principal], [Result], []),
    'admin_remove_lock_owner' : IDL.Func([IDL.Principal], [Result], []),
    'admin_set_foundation_fee_percentage' : IDL.Func([IDL.Nat], [Result], []),
    'admin_set_lock_owner_reward_percentage' : IDL.Func(
        [IDL.Nat],
        [Result],
        [],
      ),
    'admin_set_logo' : IDL.Func([IDL.Text], [Result], []),
    'admin_set_minting_account' : IDL.Func([Account], [Result], []),
    'admin_set_token_decimals' : IDL.Func([IDL.Nat8], [Result], []),
    'admin_set_token_name' : IDL.Func([IDL.Text], [Result], []),
    'admin_set_token_symbol' : IDL.Func([IDL.Text], [Result], []),
    'admin_set_transfer_fee' : IDL.Func([IDL.Nat], [Result], []),
    'burn' : IDL.Func([Account, Tokens], [Result], []),
    'burnForSolanaClaim' : IDL.Func([Account, Tokens], [Result], []),
    'canClaimToSolana' : IDL.Func(
        [IDL.Principal, Tokens],
        [Result_2],
        ['query'],
      ),
    'canUserWin' : IDL.Func([IDL.Principal], [Result_2], ['query']),
    'claimLockOwnerRewards' : IDL.Func([], [Result], []),
    'clearWeeklyClaimReport' : IDL.Func([], [Result], []),
    'distributeLockOwnerRewards' : IDL.Func([Tokens], [Result], []),
    'emergencyPause' : IDL.Func([], [Result], []),
    'emergencyResume' : IDL.Func([], [Result], []),
    'executePremine' : IDL.Func([Account], [Result], []),
    'getAccountBalance' : IDL.Func([Account], [Tokens], ['query']),
    'getBikeraStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'totalMined' : Tokens,
            'solanaCapRemaining' : Tokens,
            'totalClaimedToSolana' : Tokens,
            'totalSupply' : Tokens,
            'premineComplete' : IDL.Bool,
            'mineableRemaining' : Tokens,
            'totalFoundationEarned' : Tokens,
          }),
        ],
        ['query'],
      ),
    'getBurnAddress' : IDL.Func([], [IDL.Text], ['query']),
    'getCanisterStatus' : IDL.Func([], [Result_1], []),
    'getFoundationAccount' : IDL.Func([], [IDL.Opt(Account)], ['query']),
    'getFoundationFeeStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'currentPercentage' : IDL.Nat,
            'maxPercentage' : IDL.Nat,
            'minPercentage' : IDL.Nat,
            'totalFoundationEarned' : Tokens,
          }),
        ],
        ['query'],
      ),
    'getLockOwnerRewards' : IDL.Func([IDL.Principal], [Tokens], ['query']),
    'getLockOwnerStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'registeredLockOwners' : IDL.Vec(IDL.Principal),
            'totalLockOwnerRewards' : Tokens,
            'currentPercentage' : IDL.Nat,
            'maxPercentage' : IDL.Nat,
            'minPercentage' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getSolanaClaimBalance' : IDL.Func([], [Tokens], []),
    'getTotalClaimedToSolana' : IDL.Func([], [Tokens], ['query']),
    'getTotalSupply' : IDL.Func([], [Tokens], ['query']),
    'getTransactionHistory' : IDL.Func(
        [IDL.Opt(IDL.Nat)],
        [
          IDL.Vec(
            IDL.Record({
              'to' : Account,
              'fee' : Tokens,
              'from' : Account,
              'memo' : IDL.Opt(Memo),
              'timestamp' : Timestamp,
              'amount' : Tokens,
            })
          ),
        ],
        ['query'],
      ),
    'getUserBikeraStats' : IDL.Func(
        [IDL.Principal],
        [
          IDL.Record({
            'dailyWins' : IDL.Nat,
            'lifetimeClaimed' : Tokens,
            'lifetimeMined' : Tokens,
            'lastWinTime' : IDL.Opt(Timestamp),
            'consecutiveWins' : IDL.Nat,
            'remainingClaimable' : Tokens,
          }),
        ],
        ['query'],
      ),
    'getUserClaimStats' : IDL.Func(
        [IDL.Principal],
        [
          IDL.Record({
            'lifetimeClaimed' : Tokens,
            'lifetimeMined' : Tokens,
            'cooldownEndsAt' : IDL.Opt(Timestamp),
            'globalSolanaRemaining' : Tokens,
            'remainingClaimable' : Tokens,
          }),
        ],
        ['query'],
      ),
    'getWeeklyClaimReport' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, Account, IDL.Text, Tokens))],
        ['query'],
      ),
    'get_foundation_fee_percentage' : IDL.Func([], [IDL.Nat], ['query']),
    'get_minting_account' : IDL.Func([], [Account], ['query']),
    'get_transfer_fee' : IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_balance_of' : IDL.Func([Account], [Tokens], ['query']),
    'icrc1_decimals' : IDL.Func([], [IDL.Nat8], ['query']),
    'icrc1_fee' : IDL.Func([], [IDL.Nat], ['query']),
    'icrc1_logo' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'icrc1_metadata' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, Value))],
        ['query'],
      ),
    'icrc1_minting_account' : IDL.Func([], [IDL.Opt(Account)], ['query']),
    'icrc1_name' : IDL.Func([], [IDL.Text], ['query']),
    'icrc1_supported_standards' : IDL.Func(
        [],
        [IDL.Vec(IDL.Record({ 'url' : IDL.Text, 'name' : IDL.Text }))],
        ['query'],
      ),
    'icrc1_symbol' : IDL.Func([], [IDL.Text], ['query']),
    'icrc1_total_supply' : IDL.Func([], [Tokens], ['query']),
    'icrc1_transfer' : IDL.Func(
        [
          IDL.Record({
            'to' : Account,
            'fee' : IDL.Opt(Tokens),
            'memo' : IDL.Opt(Memo),
            'from_subaccount' : IDL.Opt(Subaccount),
            'created_at_time' : IDL.Opt(Timestamp),
            'amount' : Tokens,
          }),
        ],
        [StdResult_2],
        [],
      ),
    'icrc2_allowance' : IDL.Func(
        [IDL.Record({ 'account' : Account, 'spender' : Account })],
        [Allowance],
        ['query'],
      ),
    'icrc2_approve' : IDL.Func(
        [
          IDL.Record({
            'fee' : IDL.Opt(Tokens),
            'memo' : IDL.Opt(Memo),
            'from_subaccount' : IDL.Opt(Subaccount),
            'created_at_time' : IDL.Opt(Timestamp),
            'amount' : IDL.Nat,
            'expected_allowance' : IDL.Opt(IDL.Nat),
            'expires_at' : IDL.Opt(IDL.Nat64),
            'spender' : Account,
          }),
        ],
        [StdResult_1],
        [],
      ),
    'icrc2_transfer_from' : IDL.Func(
        [
          IDL.Record({
            'to' : Account,
            'fee' : IDL.Opt(Tokens),
            'spender_subaccount' : IDL.Opt(Subaccount),
            'from' : Account,
            'memo' : IDL.Opt(Memo),
            'created_at_time' : IDL.Opt(Timestamp),
            'amount' : Tokens,
          }),
        ],
        [StdResult],
        [],
      ),
    'initialize' : IDL.Func([IDL.Vec(IDL.Principal)], [Result], []),
    'initializeAdmin' : IDL.Func([IDL.Principal], [Result], []),
    'isLockOwner' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'isPremined' : IDL.Func([], [IDL.Bool], ['query']),
    'isSystemPaused' : IDL.Func([], [IDL.Bool], ['query']),
    'is_authorized_minter' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'mint' : IDL.Func([Account, Tokens], [Result], []),
    'recordSolanaClaim' : IDL.Func([IDL.Principal, Tokens], [Result], []),
    'recordWin' : IDL.Func(
        [IDL.Principal, Tokens, IDL.Opt(IDL.Text)],
        [Result],
        [],
      ),
    'removeAuthorizedMinter' : IDL.Func([IDL.Principal], [Result], []),
    'resetConsecutiveWins' : IDL.Func([IDL.Principal], [Result], []),
    'setArchiveCanister' : IDL.Func([IDL.Principal], [], []),
    'setFoundationAccount' : IDL.Func([Account], [Result], []),
  });
  return BikeraIMERA;
};
export const init = ({ IDL }) => {
  return [
    IDL.Record({
      'decimals' : IDL.Nat8,
      'token_symbol' : IDL.Text,
      'transfer_fee' : IDL.Nat,
      'minting_account' : IDL.Record({
        'owner' : IDL.Principal,
        'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
      }),
      'authorized_minters' : IDL.Vec(IDL.Principal),
      'initial_mints' : IDL.Vec(
        IDL.Record({
          'account' : IDL.Record({
            'owner' : IDL.Principal,
            'subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
          }),
          'amount' : IDL.Nat,
        })
      ),
      'token_name' : IDL.Text,
      'admin_principal' : IDL.Principal,
    }),
  ];
};
