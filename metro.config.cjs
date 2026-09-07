// Metro config extending @expo/metro-config
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add any custom Metro configuration here if needed
// For example, if you need nativewind or other transformers

module.exports = config;
