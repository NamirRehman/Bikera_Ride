const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { Principal } = require('@dfinity/principal');

// Exercise the actual service code without a phone, network calls or account mutations.
function loadService(name, mocks = {}, globals = {}) {
  const file = path.join(__dirname, '../src/services', `${name}.ts`);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console, Error, setTimeout, clearTimeout,
    URLSearchParams, AbortController, fetch: () => { throw new Error('Unexpected network request'); },
    require(specifier) {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (specifier === './integration-utils') return loadService('integration-utils', {}, globals);
      if (specifier === '@dfinity/principal') return { Principal };
      throw new Error(`Unexpected dependency: ${specifier}`);
    },
    ...globals,
  }, { filename: file });
  return module.exports;
}

const rider = Principal.fromUint8Array(Uint8Array.from([1]));
const other = Principal.fromUint8Array(Uint8Array.from([2]));
const identity = { getPrincipal: () => rider };
const principal = rider.toText();
const plain = (value) => JSON.parse(JSON.stringify(value));

test('private owner queries reject missing, anonymous and changed identities', async () => {
  let actorCalls = 0;
  const evidence = loadService('rideEvidence', { '../utils/actors': {
    getBikeraUserActor: () => { actorCalls++; throw new Error('must not query'); },
  } });
  for (const invalid of [null, {}, { getPrincipal: () => Principal.anonymous() }, { getPrincipal: () => other }]) {
    await assert.rejects(evidence.getRideEvidenceOverview(invalid, principal), /Sign in|session has changed/);
  }
  assert.equal(actorCalls, 0);
});

test('evidence queries use the same signed owner and a 30-day range', async () => {
  const calls = [];
  const totals = { completedMeters: 2000n, attestedMeters: 1000n, rejectedMeters: 0n };
  const evidence = loadService('rideEvidence', { '../utils/actors': {
    getBikeraUserActor: (_options, signed) => {
      assert.equal(signed, identity);
      return {
        getActivitySessions: async (owner, limit) => { calls.push(owner.toText()); assert.equal(limit[0], 10n); return [{ id: 'done', endTime: [1n] }, { id: 'active', endTime: [] }]; },
        getDistanceInRange: async (owner, start, end) => { calls.push(owner.toText()); assert.equal(end - start, 30n * 86_400_000_000_000n); return totals; },
      };
    },
  } });
  const result = await evidence.getRideEvidenceOverview(identity, principal);
  assert.deepEqual(calls, [principal, principal]);
  assert.equal(result.rides.length, 1);
  assert.equal(result.rides[0].id, 'done');
  assert.equal(result.totals, totals);
});

test('ride provenance and both historical timestamp units export correctly', () => {
  const evidence = loadService('rideEvidence', { '../utils/actors': {} });
  assert.equal(evidence.rideEvidence().level, 'phone');
  assert.equal(evidence.rideEvidence({ deviceRecorded: true, attestations: [{ ShadowWorker: null }] }).level, 'confirmed');
  assert.equal(evidence.rideEvidence({ deviceRecorded: false, attestations: [{ Strava: null }] }).label, 'Strava');
  const points = evidence.sessionRoutePoints({ route: [
    { latitude: 1, longitude: 2, timestamp: 1793800000000n },
    { latitude: 3, longitude: 4, timestamp: 1793800000000000000n },
  ] });
  assert.equal(points[0].timestampMs, points[1].timestampMs);
});

test('account erasure preserves identity and deletes partner data after the profile', async () => {
  const calls = [];
  const service = loadService('accountData', { './rideFiles': { eraseLocalRides: async (owner) => { assert.equal(owner, principal); calls.push('local'); } }, '../utils/actors': {
    getBikeraUserActor: (_options, signed) => { assert.equal(signed, identity); return { eraseUserDataGDPR: async (owner) => { assert.equal(owner.toText(), principal); calls.push('profile'); return { ok: null }; } }; },
    getBikeraMobilityActor: (_options, signed) => { assert.equal(signed, identity); return { eraseRiderData: async () => { calls.push('partner'); return { ok: null }; } }; },
  } });
  assert.equal((await service.eraseRiderAccount(identity, principal)).partnerError, null);
  assert.deepEqual(calls, ['profile', 'partner', 'local']);
});

test('profile deletion failure stops; partner failure reports partial deletion', async () => {
  let partnerCalls = 0;
  let localCalls = 0;
  const actors = {
    getBikeraUserActor: () => ({ eraseUserDataGDPR: async () => ({ err: 'Profile unavailable' }) }),
    getBikeraMobilityActor: () => ({ eraseRiderData: async () => { partnerCalls++; return { err: 'Partner unavailable' }; } }),
  };
  const service = loadService('accountData', { '../utils/actors': actors, './rideFiles': { eraseLocalRides: async () => { localCalls++; } } });
  await assert.rejects(service.eraseRiderAccount(identity, principal), /Profile unavailable/);
  assert.equal(partnerCalls, 0);
  assert.equal(localCalls, 0);
  actors.getBikeraUserActor = () => ({ eraseUserDataGDPR: async () => ({ ok: null }) });
  assert.equal((await service.eraseRiderAccount(identity, principal)).partnerError, 'Partner unavailable');
  assert.equal(partnerCalls, 1);
  assert.equal(localCalls, 1);
});

test('local route erasure removes only the requested owner, preserving other accounts', async () => {
  const index = [{ id: 'mine', ownerPrincipal: principal }, { id: 'theirs', ownerPrincipal: other.toText() }, { id: 'guest' }];
  const files = new Map([['index.json', JSON.stringify(index)], ['mine.json', '{}'], ['theirs.json', '{}'], ['guest.json', '{}']]);
  class File {
    constructor(_directory, name) { this.name = name; }
    get exists() { return files.has(this.name); }
    textSync() { return files.get(this.name); }
    write(value) { files.set(this.name, value); }
    delete() { files.delete(this.name); }
  }
  const rides = loadService('rideFiles', { 'expo-file-system': { File, Directory: class {}, Paths: { document: 'test' } }, 'expo-sharing': {} });
  await rides.eraseLocalRides(principal);
  assert.equal(files.has('mine.json'), false);
  assert.equal(files.has('theirs.json'), true);
  assert.equal(files.has('guest.json'), true);
  assert.equal(JSON.parse(files.get('index.json')).length, 2);
});

test('local route cleanup failures are reported after successful canister erasure', async () => {
  const service = loadService('accountData', {
    '../utils/actors': {
      getBikeraUserActor: () => ({ eraseUserDataGDPR: async () => ({ ok: null }) }),
      getBikeraMobilityActor: () => ({ eraseRiderData: async () => ({ ok: null }) }),
    },
    './rideFiles': { eraseLocalRides: async () => { throw new Error('Storage unavailable'); } },
  });
  const result = await service.eraseRiderAccount(identity, principal);
  assert.equal(result.partnerError, null);
  assert.equal(result.localError, 'Storage unavailable');
});

function mobility(mocks = {}, globals = {}) {
  return loadService('mobility', {
    '../utils/actors': {}, 'react-native': { Platform: { OS: 'ios' } },
    '../config': { MOBILITY_CONNECTOR_URL: 'https://connector.example' }, ...mocks,
  }, globals);
}

test('hand-off sends real system and vehicle fields with a signed identity', async () => {
  const service = mobility({ '../utils/actors': { getBikeraMobilityActor: (_options, signed) => {
    assert.equal(signed, identity);
    return { recordHandoff: async (request) => {
      assert.deepEqual(plain(request), { operatorId: 'donkey_republic', systemId: 'copenhagen', vehicleId: ['bike-1'], vehicleTypeId: ['electric'], stationId: [], latitude: [55.6], longitude: [12.5] });
      return { ok: { id: 'handoff-1' } };
    } };
  } } });
  assert.equal((await service.recordHandoff(identity, { operatorId: 'donkey_republic', systemId: 'copenhagen', vehicleId: 'bike-1', vehicleTypeId: 'electric', lat: 55.6, lon: 12.5 })).id, 'handoff-1');
});

test('slow hand-off rejects at its 3-second deadline instead of blocking the operator', async () => {
  let deadline;
  const service = mobility({ '../utils/actors': { getBikeraMobilityActor: () => ({ recordHandoff: () => new Promise(() => {}) }) } }, {
    setTimeout: (callback, ms) => { deadline = ms; return setTimeout(callback, 1); },
  });
  await assert.rejects(service.recordHandoff(identity, { operatorId: 'x', systemId: 'city' }), /still ride/);
  assert.equal(deadline, 3000);
});

test('availability rejects HTTP errors and invalid coordinates; keeps bicycles only', async () => {
  let requests = 0;
  const service = mobility({}, { fetch: async (url) => {
    requests++;
    assert.match(url, /radius=1500&limit=60&system=operator%3Acity/);
    return { ok: true, json: async () => ({ vehicles: [{ id: 'bike', vehicleType: { formFactor: 'bicycle' } }, { id: 'scooter', vehicleType: { formFactor: 'scooter' } }], stations: [] }) };
  } });
  await assert.rejects(service.getNearbyBikes(91, 0), /Choose a city/);
  assert.equal(requests, 0);
  const result = await service.getNearbyBikes(55, 12, 'operator:city');
  assert.equal(result.vehicles.length, 1);
  assert.equal(result.vehicles[0].id, 'bike');
  const failed = mobility({}, { fetch: async () => ({ ok: false, status: 503 }) });
  await assert.rejects(failed.getMobilitySystems(), /503/);
});

test('platform rental links and rider-visible fare estimates use the correct units', () => {
  const uris = { ios: 'operator://ios', android: 'operator://android', web: 'https://operator.example' };
  for (const os of ['ios', 'android', 'web']) {
    const service = mobility({ 'react-native': { Platform: { OS: os } } });
    assert.equal(service.rentalLink(uris), uris[os]);
    assert.match(service.formatFare(1250n, 'USD'), /12\.50/);
  }
});

test('camera permission is enabled and iOS app entitlements are not duplicated', () => {
  const config = require('../app.json').expo;
  assert.ok(config.android.permissions.includes('android.permission.CAMERA'));
  assert.ok(!config.android.blockedPermissions.includes('android.permission.CAMERA'));
  assert.equal(new Set(config.ios.infoPlist.UIBackgroundModes).size, config.ios.infoPlist.UIBackgroundModes.length);
  assert.equal(new Set(config.ios.associatedDomains).size, config.ios.associatedDomains.length);
  const builds = require('../eas.json').build;
  assert.equal(builds.production.ios.autoIncrement, true);
  assert.equal(builds.production.android.autoIncrement, true);
  assert.equal(builds['production-apk'].android.autoIncrement, true);
});
