module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind is unused (no className in the app). Its babel preset was
    // wrapping host views via css-interop and blanking the login screen.
    presets: ['babel-preset-expo'],
    plugins: [],
  };
};
