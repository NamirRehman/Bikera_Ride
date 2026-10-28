export const idlFactory = ({ IDL }) => {
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const HandoffStatus = IDL.Variant({
    'Open' : IDL.Null,
    'Attributed' : IDL.Text,
  });
  const Timestamp = IDL.Int;
  const Handoff = IDL.Record({
    'id' : IDL.Text,
    'status' : HandoffStatus,
    'latitude' : IDL.Opt(IDL.Float64),
    'createdAt' : Timestamp,
    'systemId' : IDL.Text,
    'stationId' : IDL.Opt(IDL.Text),
    'longitude' : IDL.Opt(IDL.Float64),
    'operatorId' : IDL.Text,
    'rider' : IDL.Principal,
    'vehicleId' : IDL.Opt(IDL.Text),
    'vehicleTypeId' : IDL.Opt(IDL.Text),
  });
  const AttributionSignal = IDL.Variant({
    'PromoCode' : IDL.Null,
    'DeepLinkHandoff' : IDL.Null,
    'Geofence' : IDL.Null,
    'OperatorReport' : IDL.Null,
  });
  const FareEstimate = IDL.Record({
    'amountMinor' : IDL.Nat,
    'pricingPlanId' : IDL.Opt(IDL.Text),
    'currency' : IDL.Text,
  });
  const Reconciliation = IDL.Record({
    'reconciledAt' : Timestamp,
    'reconciledBy' : IDL.Principal,
    'reference' : IDL.Text,
    'currency' : IDL.Text,
    'commissionMinor' : IDL.Nat,
    'operatorFareMinor' : IDL.Nat,
  });
  const PartnerRide = IDL.Record({
    'id' : IDL.Text,
    'startTime' : Timestamp,
    'distanceM' : IDL.Nat,
    'endTime' : Timestamp,
    'commissionEligible' : IDL.Bool,
    'commissionBps' : IDL.Nat,
    'estimatedCommissionMinor' : IDL.Nat,
    'systemId' : IDL.Text,
    'handoffId' : IDL.Opt(IDL.Text),
    'recordedAt' : Timestamp,
    'rideSessionId' : IDL.Opt(IDL.Text),
    'operatorId' : IDL.Text,
    'signal' : AttributionSignal,
    'confidencePercent' : IDL.Nat,
    'estimatedFare' : IDL.Opt(FareEstimate),
    'reconciliation' : IDL.Opt(Reconciliation),
    'rider' : IDL.Principal,
    'evidenceHash' : IDL.Text,
  });
  const OperatorStatus = IDL.Variant({
    'Paused' : IDL.Null,
    'Active' : IDL.Null,
  });
  const OperatorCapabilities = IDL.Record({
    'deepLinks' : IDL.Bool,
    'gbfs' : IDL.Bool,
    'partnerApi' : IDL.Bool,
    'inAppUnlock' : IDL.Bool,
  });
  const GbfsSystem = IDL.Record({
    'city' : IDL.Text,
    'systemId' : IDL.Text,
    'countryCode' : IDL.Text,
    'gbfsUrl' : IDL.Text,
  });
  const Operator = IDL.Record({
    'id' : IDL.Text,
    'status' : OperatorStatus,
    'capabilities' : OperatorCapabilities,
    'name' : IDL.Text,
    'createdAt' : Timestamp,
    'commissionBps' : IDL.Nat,
    'attributionWindowMinutes' : IDL.Nat,
    'website' : IDL.Text,
    'updatedAt' : Timestamp,
    'systems' : IDL.Vec(GbfsSystem),
  });
  const CurrencyTotals = IDL.Record({
    'estimatedCommissionMinor' : IDL.Nat,
    'estimatedFareMinor' : IDL.Nat,
    'reconciledCommissionMinor' : IDL.Nat,
    'currency' : IDL.Text,
    'reconciledFareMinor' : IDL.Nat,
  });
  const OperatorLedger = IDL.Record({
    'attributedRides' : IDL.Nat,
    'toTs' : Timestamp,
    'totals' : IDL.Vec(CurrencyTotals),
    'operatorId' : IDL.Text,
    'commissionEligibleRides' : IDL.Nat,
    'fromTs' : Timestamp,
    'handoffs' : IDL.Nat,
    'totalDistanceM' : IDL.Nat,
    'reconciledRides' : IDL.Nat,
  });
  const Result_6 = IDL.Variant({ 'ok' : OperatorLedger, 'err' : IDL.Text });
  const Result_5 = IDL.Variant({ 'ok' : IDL.Vec(Handoff), 'err' : IDL.Text });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Vec(PartnerRide),
    'err' : IDL.Text,
  });
  const ReconcileRequest = IDL.Record({
    'reference' : IDL.Text,
    'currency' : IDL.Text,
    'commissionMinor' : IDL.Nat,
    'operatorFareMinor' : IDL.Nat,
  });
  const Result_2 = IDL.Variant({ 'ok' : PartnerRide, 'err' : IDL.Text });
  const HandoffRequest = IDL.Record({
    'latitude' : IDL.Opt(IDL.Float64),
    'systemId' : IDL.Text,
    'stationId' : IDL.Opt(IDL.Text),
    'longitude' : IDL.Opt(IDL.Float64),
    'operatorId' : IDL.Text,
    'vehicleId' : IDL.Opt(IDL.Text),
    'vehicleTypeId' : IDL.Opt(IDL.Text),
  });
  const Result_3 = IDL.Variant({ 'ok' : Handoff, 'err' : IDL.Text });
  const PartnerRideReport = IDL.Record({
    'startTime' : Timestamp,
    'distanceM' : IDL.Nat,
    'endTime' : Timestamp,
    'systemId' : IDL.Text,
    'handoffId' : IDL.Opt(IDL.Text),
    'rideSessionId' : IDL.Opt(IDL.Text),
    'operatorId' : IDL.Text,
    'signal' : AttributionSignal,
    'confidencePercent' : IDL.Nat,
    'estimatedFare' : IDL.Opt(FareEstimate),
    'rider' : IDL.Principal,
    'evidenceHash' : IDL.Text,
  });
  const UpsertOperatorRequest = IDL.Record({
    'id' : IDL.Text,
    'capabilities' : OperatorCapabilities,
    'name' : IDL.Text,
    'commissionBps' : IDL.Nat,
    'attributionWindowMinutes' : IDL.Nat,
    'website' : IDL.Text,
    'systems' : IDL.Vec(GbfsSystem),
  });
  const Result = IDL.Variant({ 'ok' : Operator, 'err' : IDL.Text });
  return IDL.Service({
    'addAdminPrincipal' : IDL.Func([IDL.Principal], [Result_1], []),
    'addTrustedAttributor' : IDL.Func([IDL.Principal], [Result_1], []),
    'eraseRiderData' : IDL.Func([IDL.Principal], [Result_1], []),
    'getMyHandoffs' : IDL.Func(
        [IDL.Opt(IDL.Nat)],
        [IDL.Vec(Handoff)],
        ['query'],
      ),
    'getMyPartnerRides' : IDL.Func(
        [IDL.Opt(IDL.Nat)],
        [IDL.Vec(PartnerRide)],
        ['query'],
      ),
    'getOperator' : IDL.Func([IDL.Text], [IDL.Opt(Operator)], ['query']),
    'getOperatorLedger' : IDL.Func(
        [IDL.Text, Timestamp, Timestamp],
        [Result_6],
        ['query'],
      ),
    'getStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'operators' : IDL.Nat,
            'trustedAttributors' : IDL.Nat,
            'handoffs' : IDL.Nat,
            'partnerRides' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getTrustedAttributors' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listOpenHandoffs' : IDL.Func(
        [Timestamp, IDL.Opt(IDL.Nat)],
        [Result_5],
        ['query'],
      ),
    'listOperators' : IDL.Func([], [IDL.Vec(Operator)], ['query']),
    'listPartnerRides' : IDL.Func(
        [IDL.Text, Timestamp, Timestamp, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
        [Result_4],
        ['query'],
      ),
    'reconcilePartnerRide' : IDL.Func(
        [IDL.Text, ReconcileRequest],
        [Result_2],
        [],
      ),
    'recordHandoff' : IDL.Func([HandoffRequest], [Result_3], []),
    'recordPartnerRide' : IDL.Func([PartnerRideReport], [Result_2], []),
    'removeAdminPrincipal' : IDL.Func([IDL.Principal], [Result_1], []),
    'removeTrustedAttributor' : IDL.Func([IDL.Principal], [Result_1], []),
    'setOperatorStatus' : IDL.Func([IDL.Text, OperatorStatus], [Result_1], []),
    'upsertOperator' : IDL.Func([UpsertOperatorRequest], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
