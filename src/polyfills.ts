// React Native / Hermes polyfills required for @dfinity libraries
// MUST be imported before any @dfinity imports
// 
// IMPORTANT: If app crashes immediately, comment out polyfills one by one to isolate

// Wrap in try-catch to prevent polyfill failures from crashing the app
try {
  // 1. Crypto polyfill (required for @dfinity/identity, @dfinity/agent)
  require('react-native-get-random-values');
} catch (e) {
  // Silently fail - don't crash the app if polyfill fails
  // In production, we can't see console.warn anyway
}

try {
  // 2. URL polyfill (Hermes doesn't fully implement URL)
  require('react-native-url-polyfill/auto');
} catch (e) {
  // Silently fail - don't crash the app if polyfill fails
}

// 3. Buffer polyfill (required by many crypto libraries)
// Use require() instead of import to prevent module load time crashes
try {
  const { Buffer } = require('buffer');
  if (!(global as any).Buffer && Buffer) {
    (global as any).Buffer = Buffer;
  }
} catch (e) {
  // Silently fail - Buffer might not be needed immediately
}

// 4. Process polyfill (some libraries expect process.env)
if (!(global as any).process) {
  (global as any).process = { env: {} } as any;
}

// 5. WebCrypto polyfill (if crypto.subtle is not available)
// This is often needed for @dfinity libraries on React Native
// AuthClient requires crypto.subtle (SubtleCrypto API)
try {
  // Use @fungible-systems/webcrypto-expo for full WebCrypto API support
  // This provides crypto.subtle which is required by AuthClient
  // IMPORTANT: This is a native module - you may need to rebuild the app
  try {
    require('@fungible-systems/webcrypto-expo/install');
    
    // Verify that crypto.subtle is now available
    if (globalThis.crypto && globalThis.crypto.subtle) {
      console.log('[POLYFILLS] ✅ crypto.subtle is available via @fungible-systems/webcrypto-expo');
    } else {
      console.warn('[POLYFILLS] ⚠️ @fungible-systems/webcrypto-expo loaded but crypto.subtle not found');
      console.warn('[POLYFILLS] You may need to rebuild the app: npx expo prebuild --clean');
    }
  } catch (e) {
    console.warn('[POLYFILLS] Failed to load @fungible-systems/webcrypto-expo:', e);
    console.warn('[POLYFILLS] This is a native module - you may need to rebuild the app');
    
    // Fallback: Try expo-crypto for getRandomValues
    try {
      const { getRandomValues } = require('expo-crypto');
      if (getRandomValues) {
        // Ensure crypto object exists
        if (!globalThis.crypto) {
          (globalThis as any).crypto = {};
        }
        (globalThis as any).crypto.getRandomValues = getRandomValues;
      }
    } catch (e2) {
      // Minimal getRandomValues fallback
      if (!globalThis.crypto) {
        (globalThis as any).crypto = {};
      }
      (globalThis as any).crypto.getRandomValues = (arr: any) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      };
    }

    // Warn if subtle is still not available
    if (!globalThis.crypto?.subtle) {
      console.error('[POLYFILLS] ❌ crypto.subtle is not available. AuthClient will fail.');
      console.error('[POLYFILLS] Solution: Rebuild the app after installing @fungible-systems/webcrypto-expo');
      console.error('[POLYFILLS] Run: npx expo prebuild --clean (if using bare workflow)');
      console.error('[POLYFILLS] Or: Create a new build with EAS Build');
    }
  }
  
  // Final verification
  if (!globalThis.crypto) {
    console.error('[POLYFILLS] ❌ globalThis.crypto is not available');
  } else if (!globalThis.crypto.subtle) {
    console.error('[POLYFILLS] ❌ globalThis.crypto.subtle is not available');
  }
} catch (e) {
  console.error('[POLYFILLS] Failed to setup crypto polyfill:', e);
}

