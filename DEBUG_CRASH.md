# Debugging Android Crash

## Current Status
App is still crashing on Android. We've applied:
- ✅ Polyfills (URL, crypto, Buffer, process)
- ✅ GestureHandlerRootView and SafeAreaProvider
- ✅ Platform-specific shadows
- ✅ Safe URL parsing (no `new URL()`)
- ✅ Fixed WebBrowser initialization

## Next Steps to Debug

### 1. Get the actual crash log
Run this command to see the exact error:
```bash
adb logcat *:E | grep -i "error\|crash\|exception\|fatal"
```

Or for more detailed logs:
```bash
adb logcat *:E
```

### 2. Check if it's a specific module
The crash might be happening when:
- Loading declarations (actors.ts imports all canisters at module load)
- Initializing AuthClient
- Loading a specific screen component

### 3. Test with minimal app
Temporarily comment out imports in `actors.ts` to see if a specific canister declaration is causing the crash.

### 4. Check for WebCrypto issues
If you see `crypto.subtle` errors, we may need to add `@fungible-systems/webcrypto-expo`:
```bash
npm i @fungible-systems/webcrypto-expo
```

Then add to `polyfills.ts`:
```typescript
import '@fungible-systems/webcrypto-expo/install';
```

### 5. Check React Native version compatibility
The app uses React Native 0.81.5 with Expo SDK 54. Make sure all native modules are compatible.

## Most Likely Causes

1. **Declaration files loading at module time** - The `actors.ts` file imports all canister declarations synchronously
2. **WebCrypto missing** - Some @dfinity libraries need `crypto.subtle`
3. **Native module not linked** - A native module might not be properly linked
4. **Memory issue** - Too many imports at module load time

## Quick Test

Try commenting out the canister imports in `actors.ts` temporarily:
```typescript
// import { createActor as createBikeraMainActor } from "../declarations/bikera_main";
// ... etc
```

If the app starts, then one of the declaration files is causing the crash.

