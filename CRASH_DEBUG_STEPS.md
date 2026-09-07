# Android Crash Debugging Steps

## Current Status
App is still crashing on Android despite all fixes applied:
- ✅ Polyfills (URL, crypto, Buffer, process, WebCrypto)
- ✅ GestureHandlerRootView and SafeAreaProvider
- ✅ Platform-specific shadows
- ✅ Safe URL parsing
- ✅ Fixed WebBrowser initialization

## Critical: Get the Crash Log

**Run this command to see the exact error:**
```bash
adb logcat *:E | head -100
```

Or for continuous monitoring:
```bash
adb logcat *:E
```

Then open the app and copy the first red error block. This will tell us exactly what's crashing.

## Most Likely Causes (in order of probability)

### 1. Declaration Files Loading at Module Time
The `actors.ts` file imports all canister declarations synchronously:
```typescript
import { createActor as createBikeraMainActor } from "../declarations/bikera_main";
// ... 9 more imports
```

These declaration files might be:
- Accessing `process.env` before polyfills run
- Using `URL` constructor (even though we polyfilled it)
- Requiring WebCrypto APIs that aren't fully polyfilled

### 2. WebCrypto.subtle Missing
Some @dfinity libraries need `crypto.subtle` which we haven't fully polyfilled yet.

**Fix:** Install and add WebCrypto polyfill:
```bash
npm i @fungible-systems/webcrypto-expo
```

Then add to `src/polyfills.ts`:
```typescript
import '@fungible-systems/webcrypto-expo/install';
```

### 3. Native Module Not Linked
A native module might not be properly linked in the Android build.

**Check:** Run `npx expo prebuild --clean` and rebuild.

### 4. Memory/Stack Overflow
Too many synchronous imports at module load time.

## Quick Test: Isolate the Crash

1. **Temporarily comment out actor imports in LandingScreen:**
   ```typescript
   // import { getBikeraUserActor } from '../utils/actors';
   ```

2. **If app starts**, the issue is in `actors.ts` or declaration files.

3. **If still crashes**, the issue is earlier (AuthContext, polyfills, or native modules).

## Next Steps Based on Crash Log

### If you see: `ReferenceError: URL is not defined`
- The URL polyfill isn't loading before declarations
- **Fix:** Move polyfill import even earlier or check import order

### If you see: `crypto.subtle is not defined`
- Need WebCrypto polyfill
- **Fix:** Install `@fungible-systems/webcrypto-expo`

### If you see: `process.env is not defined`
- Process polyfill not working
- **Fix:** Check if polyfills.ts is being imported correctly

### If you see: `Cannot read property 'X' of undefined`
- A declaration file is accessing something that doesn't exist
- **Fix:** Need to see the full stack trace

### If you see native crash (Java/Kotlin stack trace)
- Native module issue
- **Fix:** Check if all native modules are properly installed and linked

## Please Share

1. The first 50 lines of `adb logcat *:E` output
2. Whether the ErrorBoundary shows anything on screen
3. Whether you see the splash screen before crash

This will help identify the exact cause.

