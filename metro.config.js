const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto.js' || moduleName === '@noble/hashes/crypto') {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'node_modules/@noble/hashes/crypto.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
