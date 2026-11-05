# Ride app parity with the 4 November BikApp pull

Compared with local BikApp commit `d7473084203ee4be7e9316555fb6342504043310`.
Its code matches `b4c7d4c`; the latest commit adds
`MOBILE_APPS_STATUS_AND_BUILD_GUIDE.md`. That guide supersedes older deployment
notes: the ride checker and partner connector are live, Strava is paused, and
ride-file import is removed.

## Coverage

| Relevant feature | Ride app status |
| --- | --- |
| Shadow-worker ride tickets, live GPS, final flush | Already present. Uses signed `beginShadowRide`, the plural `bikerashadowworkers-production` host, and a two-minute worker batch window. Now conditional on sharing consent. |
| Private recording versus sharing with Bikera | Added a sharing switch, initially off. Start freezes that choice. Private GPS does not enter session uploads, shadow-worker queues, consensus activity, XP or race submission. An exportable route is saved on this device when there are at least two valid GPS points. |
| Local file-save failures | Route remains in memory for retry; a new ride cannot overwrite an unsaved route. The rider can explicitly discard it. Closing the app before saving still loses that in-memory route. |
| Ride evidence / verified distance | Added signed owner queries, latest finished sessions with provenance, 30-day verified/attested/rejected distance, and GPX export for complete routes. Snapshots are keyed to the current owner and stale requests cannot replace the next account's data. |
| GPX / FIT import | Already removed. Export and deletion remain available for previously imported local files. |
| Strava | Remains paused. Profile explains the pause and links to GPX export. No linking or automatic import was added. |
| Partner availability | Added a native bike/station list, searchable cities, optional Near me, prices, battery/distance where supplied, directions, and refresh every 30 seconds while focused and active. The full interactive map remains on Bikera Web. |
| Operator hand-off | Shared helper for QR and availability screens: signed attribution first, maximum three-second wait, then open the platform rental link even when attribution fails. Returning within 30 minutes offers Open Ride; it never starts recording or enables sharing automatically. |
| Partner ride history | Added the owner's signed latest 20 partner rides, operator/date/distance and estimated fare in currency minor units. Commission/reconciliation data is not displayed. |
| Operator presets | All 30 presets and their systems match the pulled web app. Added the Donkey `dnky.bike` QR host alias. |
| Account erasure | User canister first, mobility canister second using the same identity, then only this owner's local ride files. Partial failures are reported before signing out; a failed profile erasure keeps the confirmation available for retry. |
| Android QR camera | Removed CAMERA from `blockedPermissions`; it remains requested and the camera plugin remains configured. Requires a new native build. |
| iOS config | Removed duplicate background modes and associated domains. Existing build number `3` and production iOS auto-increment are retained. |
| Build version increments | Production iOS and Android builds auto-increment their build numbers; Android production APK does too. Starting values remain iOS `3` and Android `11`; EAS increments them when building. |
| Public XP, wallet balance/ledger and race-session submission | Already present. No staking, emissions, race-management or admin screens were copied into Ride. |

Expo remains SDK 54. Existing native iOS glass tabs and animated fallback tabs are
retained. No new dependency was required for these parity changes.

## Verification

- `npm run test:ride-integrations`: 12 service/config tests using mocked actors
  and storage; no real ride submission, payment or account deletion.
- `npm run typecheck` and Expo exports for iOS, Android and web.
- Read-only public service checks: `/mobility/systems` returned 54 systems;
  a published New York centre returned 52 stations. Ride-checker `/health`
  returned HTTP 200 with `attestation.enabled: true`.
- Browser checks cover guest navigation, phone-sized layouts, loading/error/retry
  states and partner browsing. The connector does not send a CORS allowance for
  localhost, so a separate ignored preview/proxy is used for live browser data.
  Native requests use the production connector directly.

## Checks still requiring an iPhone / Android build

1. Sign in and confirm the principal matches Bikera Web.
2. Record with sharing off: route appears in Ride files and no new server-side
   session, goal distance or XP appears. Export the GPX.
3. Enable sharing and ride at least 200 m over 3+ minutes. Stop, then check app/web
   history and ride-checker confirmation after processing (roughly two minutes).
4. Repeat with the screen locked, then with interrupted connectivity.
5. Test Android camera permission and a real partner QR/rental deep link. Return
   to Bikera and verify the recording prompt, without automatic recording.
6. Use a disposable test account for full deletion; confirm its local routes and
   partner history are removed without touching another account's files.
7. Check native glass tabs on iOS 26+, including Reduce Transparency, and fallback
   tabs on older iOS and Android.

No EAS build, submission or backend deployment was started during this audit.

## Separate Staking checkout

The guide also describes changes in the Staking app. The local `bikera_staking`
checkout is on `5545b86` with existing uncommitted work, rather than the newer code
described by the guide. Its config still uses the old singular shadow-worker host,
and its staking copy still describes slashing instead of the guide's no-loss rule.
That checkout needs a separate update and review before it can be considered ready
under this guide. It was not changed as part of the Ride parity work.
