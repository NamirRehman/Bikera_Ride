# Bridge Identity Transfer Issue

## Problem

When using the Internet Identity bridge for React Native authentication:

1. **Bridge authenticates** in browser context and stores identity in browser IndexedDB
2. **Bridge redirects back** with only principal string (e.g., `bikera://auth/callback?principal=xxx`)
3. **React Native app** receives principal string but **cannot access the identity object** from bridge's browser storage
4. **Result**: App has principal for display/identification, but **no identity object for authenticated calls**

## Impact

- ✅ **Query calls work** (read-only, don't need authentication)
- ❌ **Update calls fail** (write operations require identity for signing)

## Current Workaround

The app checks if the React Native `AuthClient` has the identity after bridge callback. If not, it:
- Stores principal for display
- Shows warnings in console
- Falls back gracefully for query-only operations

## Solutions (Future)

### Option 1: Shared Storage
Configure both bridge and app `AuthClient` to use the same storage key so they share identity storage. This may not work if they're in different contexts (browser vs native).

### Option 2: Identity Transfer
Modify bridge to securely transfer identity to app (e.g., via postMessage or secure channel). **Security concern**: Private keys should not be exposed.

### Option 3: Delegation
Use Internet Identity delegation to create a temporary identity that can be used by the app. This requires modifying the bridge to create and transfer delegations.

### Option 4: Native AuthClient Login
If possible, trigger the React Native app's `AuthClient.login()` after bridge authentication to authenticate the app's AuthClient separately. This may require user interaction.

## Current Status

- Bridge authentication works ✅
- Principal string is received ✅
- Identity object is NOT available ❌
- Authenticated calls will fail ❌
- Query calls work ✅

## Recommendation

For now, the app handles this gracefully with warnings. For production, implement one of the solutions above to enable authenticated calls.

