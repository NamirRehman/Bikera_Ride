// babel.config.cjs
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      // Temporarily disabled for step-by-step testing
      // 'react-native-reanimated/plugin',
    ],
  };
};
