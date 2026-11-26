const assert = require('node:assert/strict');
const path = require('node:path');
const { getPrebuildConfigAsync } = require('@expo/prebuild-config');
const { compileModsAsync } = require('expo/config-plugins');

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const { exp } = await getPrebuildConfigAsync(projectRoot, { platforms: ['ios'] });
  const regression = process.argv.includes('--with-legacy-entry');
  if (regression) {
    // Exercise the entire prebuild plugin chain with stale native configuration.
    exp.ios.infoPlist.NSUserTrackingUsageDescription = 'Obsolete tracking purpose';
    exp.ios.infoPlist.NSUserTrackingMarkdownUsageDescription = 'Obsolete markdown purpose';
  }
  const generated = await compileModsAsync(exp, {
    projectRoot, platforms: ['ios'], introspect: true,
  });
  const plist = generated._internal.modResults.ios.infoPlist;
  assert.equal(Object.hasOwn(plist, 'NSUserTrackingUsageDescription'), false, 'Unused ATT purpose string remains');
  assert.equal(Object.hasOwn(plist, 'NSUserTrackingMarkdownUsageDescription'), false, 'Unused ATT markdown purpose remains');
  assert.ok(plist.NSLocationWhenInUseUsageDescription, 'Ride location permission description is missing');
  assert.ok(plist.NSLocationAlwaysAndWhenInUseUsageDescription, 'Background ride location description is missing');
  assert.ok(plist.UIBackgroundModes.includes('location'), 'Ride background location mode is missing');
  assert.equal(generated.ios.privacyManifests.NSPrivacyTracking, false, 'App privacy manifest indicates tracking');
  assert.deepEqual(generated.ios.privacyManifests.NSPrivacyTrackingDomains, [], 'Tracking domains remain configured');
  console.log('Verified iOS prebuild: no ATT purpose strings; ride location permissions retained; app manifest declares no tracking.');
  if (regression) console.log('Verified stale ATT entries are removed by the configured prebuild plugin chain.');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
