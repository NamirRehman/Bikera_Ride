const { withInfoPlist } = require('expo/config-plugins');

// Ride uses location for cycling features, not advertising tracking. Keep this
// plugin last so an obsolete ATT purpose string cannot survive native prebuild.
module.exports = function withIosRidePrivacy(config) {
  return withInfoPlist(config, (mod) => {
    delete mod.modResults.NSUserTrackingUsageDescription;
    delete mod.modResults.NSUserTrackingMarkdownUsageDescription;
    return mod;
  });
};
