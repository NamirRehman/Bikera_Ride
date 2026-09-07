# Backend Recommendations for Faster App Loading

This document suggests **canister and web backend** changes to reduce slow loading in the Bikera mobile and web apps. It is based on a review of the web frontend (`BikApp/src/bikera_frontend`), the efficient data service, and the canisters: **bikera_user**, **bikera_xp**, **bikera_validator**, and **bikera_rewards**.

---

## Summary

| Priority | Canister      | Change | Benefit |
|----------|---------------|--------|---------|
| High     | bikera_user   | Add `getBatchUserProfiles(userIds)` | Leaderboard & Friends: 2N → 1 call for usernames/avatars |
| Medium   | bikera_xp     | Use existing `getBatchUserProfiles` from mobile/web | Leaderboard: 61 → 3 calls (with user batch above) |
| Medium   | bikera_validator | Default limit for `getUserRouteHistory(userId, null)` | Prevents unbounded history fetches |
| Medium   | bikera_xp     | Default limit for `getXPTransactions(userId, null)` | Prevents unbounded transaction fetches |
| Low      | bikera_rewards | `getSystemStatsSnapshot` (optional) | Dashboard: single call instead of multiple admin calls |

---

## 1. bikera_user: Add `getBatchUserProfiles(userIds)`

### Problem

- **Leaderboard (web and mobile):** After `getLeaderboardWithFilter(limit, filter)` we need usernames and avatars. Today each client does **N** calls to `getUserProfile(userId)` (one per user).
- **Friends (mobile):** For each friend and each request we call `getUserProfile` + `getPublicUserXPProfile`, i.e. **2×(N+M)** calls.

So the **user canister** is the bottleneck for “show display info for many principals in one go.”

### Existing pattern elsewhere

- **bikera_xp** already has `getBatchUserProfiles(userIds)`, returning `[(UserId, { totalXP, level, isActive })].`  
- The web `efficientDataService.ts` uses it, but the **Leaderboard page** does not; it still does N×`getUserProfile` + N×`getPublicUserXPProfile`.

### Recommendation

Add a **batch profile** query to **bikera_user** that returns only the fields needed for lists (leaderboard, friends):

- **Name:** `getBatchUserProfiles(userIds: [UserId])`
- **Return type:** `[(UserId, { username: Text; displayName: ?Text; avatar: ?Text })]`
- **Behavior:** For each `userId` in `userIds`, look up the profile and return the lite record; if not found, omit or return a placeholder (e.g. `User` + slice of principal). Cap input size (e.g. max 100 principals) to avoid abuse.

**Effect:**

- **Leaderboard:** 1 (getLeaderboardWithFilter) + 1 (XP getBatchUserProfiles) + 1 (user getBatchUserProfiles) = **3 canister calls** instead of 1 + 2N (e.g. 61 for N=30).
- **Friends:** getFriends + getFriendRequests(limit) + 1 (user getBatchUserProfiles for friends+request senders) + 1 (XP getBatchUserProfiles) = **4 calls** instead of 2 + 2N + 2M.

---

## 2. bikera_xp: Use existing batch and snapshot APIs on clients

### What already exists

- `getBatchUserProfiles(userIds: [UserId]): async [(UserId, { totalXP, level, isActive })]`  
- `getUserProfileLite(userId): async { totalXP, level, currentStreak, lastActivity, isActive }`  
- `getXPSnapshot(userId): async XPSnapshot` (replaces multiple calls for one user)

### Problem

- **Web Leaderboard** (`Leaderboard.tsx`): Uses `getLeaderboardWithFilter(100)` then **per user** `getUserProfile(userId)` and `getPublicUserXPProfile(userId)` → 1 + 200 calls.
- **Mobile Leaderboard:** Already improved to batches of 10, but still 1 + 60 calls (getLeaderboardWithFilter(30) + 30×2 profile calls).

### Recommendation (backend + client)

- **Backend:** No change needed; `getBatchUserProfiles` already exists.
- **Clients (web + mobile):**
  1. Call `getLeaderboardWithFilter(limit, timeFilter)`.
  2. Extract principal list from the result.
  3. Call **bikera_xp** `getBatchUserProfiles(principals)` once.
  4. Call **bikera_user** `getBatchUserProfiles(principals)` once (after that API is added; see §1).

Then leaderboard becomes **3 canister calls** total. Implement this on both web and mobile.

---

## 3. bikera_validator: Default limit for `getUserRouteHistory`

### Current behavior

- `getUserRouteHistory(userId: UserId, limit: ?Nat): async [RouteValidation]`
- When `limit` is `null`, the canister returns **all** route validations for the user (unbounded).

### Recommendation

When `limit` is `null`, apply a **default maximum** (e.g. 100 or 200) so that clients that forget to pass a limit still get a bounded response. For example:

- `limit == null` → use `min(actualSize, 100)` (or 200).
- Optionally document that clients should pass an explicit limit for better performance.

**Effect:** Protects against accidental unbounded history loading (e.g. heavy users with thousands of routes). Mobile already passes an explicit limit (80); this is a safety net and helps any other client.

---

## 4. bikera_xp: Default limit for `getXPTransactions`

### Current behavior

- `getXPTransactions(userId: UserId, limit: ?Nat): async [XPTransaction]`
- When `limit` is `null`, the canister returns **all** transactions for the user (unbounded).

### Recommendation

When `limit` is `null`, apply a **default maximum** (e.g. 150 or 200), similar to rewards:

- `limit == null` → use `min(actualSize, 150)` (or 200).
- Document that clients should pass an explicit limit when they need a specific window.

**Effect:** Prevents unbounded XP transaction lists. Mobile already passes 150; this protects other callers and future screens.

---

## 5. bikera_rewards: Optional `getSystemStatsSnapshot`

### Current state

- **efficientDataService.ts** has a TODO for `getSystemStatsSnapshot()` (single call for dashboard/admin stats).
- Rewards canister already has:
  - `getUserRewardsSnapshot(userId)` (efficient single-call for one user)
  - `getRewardsSnapshot(userId)` (query version)

### Recommendation (low priority)

If the dashboard or admin UI needs system-wide stats (total users, total rewards, total staked, etc.), add a **query** `getSystemStatsSnapshot()` that returns those aggregates in one call, with optional caching on the client. This is optional and only needed if you have or plan such a dashboard.

---

## 6. What not to change (already in good shape)

- **bikera_user**
  - `getFriendRequests(userId, limit: ?Nat)` already applies a default (50) and max (200) when limit is provided; no backend change needed. Clients should pass an explicit limit (e.g. 50) for clarity.
- **bikera_rewards**
  - `getUserRewards(userId, limit: ?Nat)` already applies default/max; fine as is.
- **bikera_xp**
  - `getLeaderboardWithFilter(limit, timeFilter)` and `getBatchUserProfiles` are sufficient for leaderboard once clients use them together with user’s batch API.

---

## Implementation order

1. **bikera_user:** Implement `getBatchUserProfiles(userIds)` (see §1).
2. **Web:** Update Leaderboard (and any similar list) to use XP `getBatchUserProfiles` + user `getBatchUserProfiles` (after step 1).
3. **Mobile:** Same as web for Leaderboard; optionally use the same pattern for FriendsScreen (get friend/request principal lists, then one batch user + one batch XP).
4. **bikera_validator:** Add default limit for `getUserRouteHistory(_, null)` (§3).
5. **bikera_xp:** Add default limit for `getXPTransactions(_, null)` (§4).
6. **bikera_rewards:** Add `getSystemStatsSnapshot` only if a dashboard needs it (§5).

---

*These recommendations align with the causes described in `SLOW_DATA_LOADING_REPORT.md` and with the existing efficient APIs in the XP and rewards canisters.*
