# Production Build Checklist

## ✅ Pre-Build Verification

### 1. Configuration Files
- [x] **app.json**: 
  - ✅ Slug: `bikeramobileapp`
  - ✅ Project ID: `25e23a87-bdec-46a8-bab3-0b2ea4f11bd9`
  - ✅ Version: `1.0.0`
  - ✅ Version Code: `1` (Android)
  - ✅ Bundle ID: `com.bikera.mobile` (iOS & Android)
  - ✅ Compile SDK: `35` (required by dependencies)
  - ✅ Target SDK: `34`
  - ✅ Min SDK: `24`

- [x] **eas.json**:
  - ✅ `appVersionSource: "remote"` configured
  - ✅ `apk` profile configured for APK builds
  - ✅ `production` profile available for AAB builds

- [x] **metro.config.cjs**:
  - ✅ Extends `@expo/metro-config`

### 2. Assets
- [x] **icon.png**: Present in `./assets/icon.png`
- [x] **splash-icon.png**: Present in `./assets/splash-icon.png`
- [x] **adaptive-icon.png**: Present in `./assets/adaptive-icon.png`

### 3. Environment Configuration
- [x] **Production Canister IDs**: Configured in `src/utils/actors.ts`
- [x] **Production Host**: `https://ic0.app` (used when `__DEV__ === false`)
- [x] **Internet Identity Bridge URL**: 
  - Production: `https://fn3mc-ryaaa-aaaap-an4zq-cai.icp0.io/ii-bridge.html`
  - ⚠️ **VERIFY**: Ensure this URL is correct and accessible

### 4. Permissions
- [x] **Android Permissions**: All required permissions configured
- [x] **iOS Info.plist**: All required usage descriptions configured

### 5. Build Configuration
- [x] **compileSdkVersion**: `35` (fixed)
- [x] **targetSdkVersion**: `34`
- [x] **minSdkVersion**: `24` (fixed)
- [x] **buildToolsVersion**: `35.0.0`

## ⚠️ Items to Verify Before Production Build

### Critical
1. **Internet Identity Bridge URL** (`src/contexts/AuthContext.tsx:245`):
   - Current: `https://fn3mc-ryaaa-aaaap-an4zq-cai.icp0.io/ii-bridge.html`
   - **Action**: Verify this URL is correct and the bridge HTML is deployed there
   - **Test**: Open the URL in a browser and verify it loads

2. **Production Canister IDs** (`src/utils/actors.ts`):
   - Verify all canister IDs are correct for production
   - Test canister calls work in production environment

3. **Deep Link Configuration**:
   - Scheme: `bikera://auth/callback`
   - Android Package: `com.bikera.mobile`
   - iOS Associated Domain: `applinks:bikera.app`
   - **Action**: Test deep links work on physical devices

### Recommended (Non-Blocking)
1. **Console Logs**: 
   - 205 console.log statements found
   - Consider removing or gating with `__DEV__` checks for production
   - **Note**: React Native production builds typically strip console logs automatically

2. **EAS Submit Configuration** (`eas.json`):
   - Placeholder values present (only affects `eas submit`, not `eas build`)
   - Update if planning to submit to app stores

3. **Version Numbers**:
   - Current: `1.0.0` / `1`
   - Update for future releases

## 🚀 Build Commands

### For APK Build (Current):
```bash
eas build --platform android --profile apk --clear-cache
```

### For Production AAB Build (Play Store):
```bash
eas build --platform android --profile production --clear-cache
```

### For iOS Production Build:
```bash
eas build --platform ios --profile production --clear-cache
```

## 📝 Post-Build Verification

After successful build:
1. [ ] Install APK/AAB on physical device
2. [ ] Test Internet Identity login flow
3. [ ] Verify authenticated canister calls work
4. [ ] Test all core features (tracking, groups, staking, etc.)
5. [ ] Verify deep links work
6. [ ] Check app performance and memory usage
7. [ ] Test on different Android versions (API 24+)

## 🔍 Known Issues Fixed

1. ✅ `compileSdkVersion` updated from 34 to 35
2. ✅ `minSdkVersion` updated from 21 to 24
3. ✅ `buildToolsVersion` updated to 35.0.0
4. ✅ Metro config extends `@expo/metro-config`
5. ✅ `appVersionSource` configured in `eas.json`
6. ✅ Notification sound file reference removed
7. ✅ `kotlinVersion` removed (auto-managed by Expo)

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android Build Configuration](https://docs.expo.dev/build-reference/android-build-config/)
- [Internet Identity Setup](./INTERNET_IDENTITY_SETUP.md)

