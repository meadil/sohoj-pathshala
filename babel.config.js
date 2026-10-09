module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Worklets plugin (Reanimated 4) MUST be last.
    plugins: ['react-native-worklets/plugin'],
  };
};
