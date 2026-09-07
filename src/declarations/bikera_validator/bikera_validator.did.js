export const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const UserId = IDL.Principal;
  const AntiGamingRule = IDL.Record({
    'suspiciousLocationThreshold' : IDL.Float64,
    'maxIdenticalRoutes' : IDL.Nat,
    'maxConsecutiveIdentical' : IDL.Nat,
    'minTimeBetweenRoutes' : IDL.Nat,
    'maxRoutesPerDay' : IDL.Nat,
  });
  const Timestamp = IDL.Int;
  const Result_2 = IDL.Variant({
    'ok' : IDL.Record({
      'canisterName' : IDL.Text,
      'registeredWorkers' : IDL.Nat,
      'version' : IDL.Text,
      'cycles' : IDL.Nat,
      'uptime' : Timestamp,
      'totalRoutes' : IDL.Nat,
      'memorySize' : IDL.Nat,
      'canisterId' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const Speed = IDL.Nat;
  const ValidationViolation = IDL.Record({
    'description' : IDL.Text,
    'timestamp' : Timestamp,
    'severity' : IDL.Text,
    'violationType' : IDL.Text,
  });
  const Distance = IDL.Nat;
  const LocationPoint = IDL.Record({
    'latitude' : IDL.Float64,
    'altitude' : IDL.Opt(IDL.Float64),
    'heading' : IDL.Opt(IDL.Float64),
    'longitude' : IDL.Float64,
    'timestamp' : Timestamp,
    'accuracy' : IDL.Opt(IDL.Float64),
  });
  const RouteValidation = IDL.Record({
    'duration' : IDL.Nat,
    'avgSpeed' : Speed,
    'maxSpeed' : Speed,
    'userId' : UserId,
    'createdAt' : Timestamp,
    'violations' : IDL.Vec(ValidationViolation),
    'qualityScore' : IDL.Float64,
    'routeId' : IDL.Text,
    'totalDistance' : Distance,
    'isValid' : IDL.Bool,
    'points' : IDL.Vec(LocationPoint),
  });
  const ValidationConfig = IDL.Record({
    'maxPoints' : IDL.Nat,
    'maxSpeed' : Speed,
    'minAccuracy' : IDL.Float64,
    'speedChangeThreshold' : IDL.Float64,
    'minPoints' : IDL.Nat,
    'maxGapTime' : IDL.Nat,
    'minDistance' : Distance,
    'gpsDriftThreshold' : IDL.Float64,
    'suspiciousPatternThreshold' : IDL.Float64,
  });
  const ShadowBatchSummary = IDL.Record({
    'duration' : IDL.Nat,
    'avgSpeed' : IDL.Float64,
    'maxSpeed' : IDL.Float64,
    'distance' : IDL.Nat,
  });
  const ShadowProof = IDL.Record({
    'pointCount' : IDL.Nat,
    'merkleRoot' : IDL.Text,
    'timestamp' : IDL.Nat,
    'batchHash' : IDL.Text,
  });
  const ShadowBatch = IDL.Record({
    'workerId' : IDL.Text,
    'userId' : IDL.Principal,
    'summary' : ShadowBatchSummary,
    'proof' : ShadowProof,
  });
  const ValidationResult = IDL.Record({
    'duration' : IDL.Nat,
    'avgSpeed' : Speed,
    'maxSpeed' : Speed,
    'violations' : IDL.Vec(ValidationViolation),
    'distance' : Distance,
    'qualityScore' : IDL.Float64,
    'confidence' : IDL.Float64,
    'isValid' : IDL.Bool,
  });
  const Result = IDL.Variant({ 'ok' : ValidationResult, 'err' : IDL.Text });
  const MovementAggregate = IDL.Record({
    'duration' : IDL.Nat,
    'signature' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'avgSpeed' : Speed,
    'maxSpeed' : Speed,
    'sampleCount' : IDL.Nat,
    'distance' : Distance,
    'timestamp' : Timestamp,
  });
  return IDL.Service({
    'clearOldData' : IDL.Func([], [Result_1], []),
    'clearUserData' : IDL.Func([UserId], [Result_1], []),
    'getAntiGamingRules' : IDL.Func([], [AntiGamingRule], ['query']),
    'getCanisterStatus' : IDL.Func([], [Result_2], []),
    'getRegisteredWorkers' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'getSuspiciousPatterns' : IDL.Func(
        [UserId],
        [IDL.Vec(IDL.Text)],
        ['query'],
      ),
    'getUserDailyRouteCount' : IDL.Func(
        [UserId, IDL.Nat],
        [IDL.Nat],
        ['query'],
      ),
    'getUserRouteHistory' : IDL.Func(
        [UserId, IDL.Opt(IDL.Nat)],
        [IDL.Vec(RouteValidation)],
        ['query'],
      ),
    'getValidationConfig' : IDL.Func([], [ValidationConfig], ['query']),
    'getValidationResult' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(RouteValidation)],
        ['query'],
      ),
    'markSuspiciousPattern' : IDL.Func([UserId, IDL.Text], [Result_1], []),
    'registerWorker' : IDL.Func([IDL.Text], [Result_1], []),
    'submitValidatedBatch' : IDL.Func([ShadowBatch], [Result], []),
    'updateAntiGamingRules' : IDL.Func([AntiGamingRule], [Result_1], []),
    'updateValidationConfig' : IDL.Func([ValidationConfig], [Result_1], []),
    'validateMovementAggregate' : IDL.Func(
        [UserId, MovementAggregate],
        [Result],
        [],
      ),
    'validateRoute' : IDL.Func([UserId, IDL.Vec(LocationPoint)], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
