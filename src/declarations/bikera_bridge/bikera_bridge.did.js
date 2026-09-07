export const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const TokenAmount = IDL.Nat;
  const BridgeConfig = IDL.Record({
    'minBridgeAmount' : TokenAmount,
    'processingDelay' : IDL.Nat,
    'dailyBridgeLimit' : TokenAmount,
    'maxPendingRequests' : IDL.Nat,
    'bridgeFee' : TokenAmount,
    'maxBridgeAmount' : TokenAmount,
  });
  const BridgeStatus = IDL.Variant({
    'Failed' : IDL.Null,
    'Cancelled' : IDL.Null,
    'Processing' : IDL.Null,
    'Completed' : IDL.Null,
    'Pending' : IDL.Null,
  });
  const UserId = IDL.Principal;
  const Timestamp = IDL.Int;
  const SolanaAddress = IDL.Text;
  const BridgeRequest = IDL.Record({
    'id' : IDL.Text,
    'status' : BridgeStatus,
    'transactionHash' : IDL.Opt(IDL.Text),
    'userId' : UserId,
    'createdAt' : Timestamp,
    'errorMessage' : IDL.Opt(IDL.Text),
    'processedAt' : IDL.Opt(Timestamp),
    'solanaAddress' : SolanaAddress,
    'amount' : TokenAmount,
  });
  const Result_1 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'pendingRequests' : IDL.Nat,
      'uptime' : Timestamp,
      'totalRequests' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  return IDL.Service({
    'cancelBridgeRequest' : IDL.Func([IDL.Text], [Result], []),
    'clearOldData' : IDL.Func([], [Result], []),
    'completeBridgeRequest' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'emergencyPause' : IDL.Func([], [Result], []),
    'emergencyResume' : IDL.Func([], [Result], []),
    'failBridgeRequest' : IDL.Func([IDL.Text, IDL.Text], [Result], []),
    'generateWeeklyClaimReport' : IDL.Func([], [Result], []),
    'getAdminPrincipal' : IDL.Func([], [IDL.Principal], ['query']),
    'getBridgeConfig' : IDL.Func([], [BridgeConfig], ['query']),
    'getBridgeRequest' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(BridgeRequest)],
        ['query'],
      ),
    'getCanisterStatus' : IDL.Func([], [Result_1], []),
    'getPendingBridgeRequests' : IDL.Func(
        [],
        [IDL.Vec(BridgeRequest)],
        ['query'],
      ),
    'getUserBridgeHistory' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(BridgeRequest)],
        ['query'],
      ),
    'initializeAdmin' : IDL.Func([IDL.Principal], [Result], []),
    'isBridgePaused' : IDL.Func([], [IDL.Bool], ['query']),
    'processBridgeRequest' : IDL.Func([IDL.Text], [Result], []),
    'requestBridge' : IDL.Func([SolanaAddress, TokenAmount], [Result], []),
    'setCanisterReferences' : IDL.Func(
        [IDL.Principal, IDL.Principal],
        [Result],
        [],
      ),
    'updateBridgeConfig' : IDL.Func([BridgeConfig], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
