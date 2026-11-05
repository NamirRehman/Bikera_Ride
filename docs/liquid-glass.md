# Liquid Glass on Expo SDK 54

The app stays on Expo SDK 54. On supported iOS builds, the bottom tabs use
React Navigation's native `UITabBarController` implementation from
`@react-navigation/bottom-tabs/unstable`, already included in the installed
7.9.0 package. UIKit owns the floating glass bar, selection lens, gestures,
SF Symbol icons, labels, and accessibility behavior. There is no custom glass
backdrop or hand-drawn selection pill on this path.

Other platforms and unsupported iOS builds keep the existing solid tab bar with
its animated selection indicator. The separate `expo-glass-effect` dependency
continues to provide glass material for selected Home cards.

## Availability

Native glass tabs require all of the following:

- iOS 26 or later.
- An iOS binary built with Xcode 26 or later that includes `expo-glass-effect`.
- Both native Liquid Glass availability checks passing.
- The installed binary registering `RNSBottomTabs`, `RNSBottomTabsScreen`, and
  `RNSSafeAreaView` from `react-native-screens` (the locked version is 4.19.0).

Older iOS versions, Android, web, and existing binaries without the native module
use the previous solid tabs. Native iOS tabs handle Reduce Transparency and Reduce
Motion through UIKit, without replacing the navigator or resetting mounted ride
state when preferences change. Home cards separately switch to solid surfaces
when Reduce Transparency is enabled or its value cannot be read.

Installing this JavaScript alone in an existing development or store build does
not add the native module. Create a fresh iOS development/preview/store build with
Xcode 26 or later before checking the effect. No SDK upgrade is needed.

## Surfaces

- Bottom tabs: the real system tab bar on supported iOS devices, with the brand's
  cyan active tint. Native safe-area handling reserves room for Ride controls and
  lists; scrolling pages use automatic content inset adjustment. The bar stays
  expanded so all five destinations remain visible.
- Home: stats, signed-in wallet summary, and latest-actions cards.
- Reuse `GlassSurface` for another existing surface, or pass `glass` to `Card` to
  opt in. The supplied style remains the fallback. Avoid wrapping a glass surface
  in an opacity animation or a parent with `overflow: 'hidden'`.

## Device checks

1. On an iOS 26+ build, open Home as guest and signed in. Check the stats, wallet,
   and latest-actions card text against the glass material.
2. Switch rapidly between all five tabs, and drag across the native selection
   lens. Check the system glass interaction, selected labels and SF Symbols,
   More's return-to-menu behavior, and Ride's Start/Stop controls.
3. Scroll Home to the end, then check Friends and Ranks lists. Last items and
   buttons must stay reachable above the floating tab bar. Repeat in landscape.
4. Turn Reduce Transparency on and off while the app is open. UIKit should adapt
   its tab bar, cards should return to solid surfaces, and the selected route and
   any active ride must be preserved.
5. Turn Reduce Motion on and repeat tab selection. Selection remains visible
   while spring motion is suppressed. Also check larger system text and VoiceOver.
6. On older iOS, Android, and web, verify the existing tab layout and card colors.

The native material and animation feel require a real iOS device to validate.
The native navigator API in these SDK 54-era packages is experimental; use the
locked dependency versions and repeat device checks before changing them.
