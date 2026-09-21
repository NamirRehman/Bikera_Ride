const { withAndroidManifest } = require('expo/config-plugins');

const MLKIT_BARCODE_ACTIVITY =
  'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';

function ensureToolsNamespace(manifest) {
  manifest.$ = manifest.$ || {};
  if (!manifest.$['xmlns:tools']) {
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }
}

function unlockActivity(activity) {
  if (!activity.$) activity.$ = {};
  activity.$['android:screenOrientation'] = 'unspecified';
  const existing = activity.$['tools:replace'];
  const parts = new Set(
    String(existing || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
  );
  parts.add('android:screenOrientation');
  activity.$['tools:replace'] = Array.from(parts).join(',');
}

const withPlayAndroidFixes = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    ensureToolsNamespace(manifest);

    const application = manifest.application?.[0];
    if (!application) return config;

    application.$ = application.$ || {};
    application.$['android:resizeableActivity'] = 'true';

    const activities = application.activity || [];
    for (const activity of activities) {
      unlockActivity(activity);
    }

    let mlkitActivity = activities.find(
      (activity) => activity.$?.['android:name'] === MLKIT_BARCODE_ACTIVITY
    );
    if (!mlkitActivity) {
      mlkitActivity = { $: { 'android:name': MLKIT_BARCODE_ACTIVITY } };
      activities.push(mlkitActivity);
    }
    unlockActivity(mlkitActivity);
    application.activity = activities;

    return config;
  });
};

module.exports = withPlayAndroidFixes;
