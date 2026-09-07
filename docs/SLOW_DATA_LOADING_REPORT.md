# Slow Data Loading – Analysis Report

This document summarizes the causes of slow data loading on four screens: **FriendsScreen**, **LeaderboardScreen**, **StakingScreen**, and **HistoryScreen**, and notes which have been fixed and which still need attention.

---

## 1. FriendsScreen (`src/screens/FriendsScreen.tsx`)

### Current behavior

- **Initial fetch:** 2 canister calls in parallel:
  - `getFriends(p)` – returns full list of friend principals (no limit; size depends on canister data).
  - `getFriendRequests(p, [])` – **unbounded**: `[]` means no limit, so all pending requests are returned.
- **Per friend:** 2 canister calls per friend (profile + XP):
  - `getUserProfile(friendPrincipal)`
  - `getPublicUserXPProfile(friendPrincipal)`
  All friend profiles are requested in a single `Promise.all`, so **2 × N** calls at once for N friends.
- **Per request:** 2 canister calls per request (profile + XP):
  - Same pattern for each pending friend request.
  All request profiles are requested in another `Promise.all`, so **2 × M** calls at once for M requests.

### Why it’s slow

| Issue | Impact |
|-------|--------|
| **Unbounded `getFriendRequests(p, [])`** | Can return a very large number of requests; more data and more per-request profile work. |
| **N+1-style pattern** | 1 + 2N + 2M total calls (e.g. 50 friends + 20 requests → 2 + 100 + 40 = **142 canister calls**). |
| **Large parallel bursts** | Firing 100+ profile/XP calls at once can overwhelm the network/canister and cause timeouts or retries. |

### Recommendations

1. **Limit friend requests:** Call `getFriendRequests(p, [BigInt(50)])` (or similar) instead of `getFriendRequests(p, [])`.
2. **Batch profile fetching:** For friends (and optionally requests), fetch profiles in small batches (e.g. 10 at a time) instead of one big `Promise.all`, similar to LeaderboardScreen.
3. **Optional cap on friends:** If the canister supports a limit for `getFriends`, use it; otherwise the list is already bounded by what the canister stores.

---

## 2. LeaderboardScreen (`src/screens/LeaderboardScreen.tsx`)

### Current behavior (after fixes)

- **Initial fetch:** 1 canister call:
  - `getLeaderboardWithFilter(limit, timeFilter)` with **limit = 30** (was 100).
- **Per user:** Profiles are fetched in **batches of 10** (3 batches for 30 users):
  - Each batch: `getUserProfile` + `getPublicUserXPProfile` per user, then next batch.
- **Total:** 1 + (2 × 30) = **61 canister calls**, in controlled batches.

### Why it was slow (before fixes)

| Issue | Before | After |
|-------|--------|--------|
| **Leaderboard size** | 100 users | 30 users |
| **Profile fetches** | 200 calls in one `Promise.all` | 60 calls in 3 batches of 20 |
| **Total calls** | **201** | **61** |

### Status

**Fixed.** Limit reduced to 30 and profile fetching batched (10 users per batch). Load time and reliability should be significantly better.

---

## 3. StakingScreen (`src/screens/StakingScreen.tsx`)

### Current behavior

- **Single fetch:** 5 canister calls in one `Promise.all`:
  - `getGoalStakingEligibility(userId, identity)`
  - `getGoalStakingSummary(userId, identity)`
  - `getGoalStakingConfig(identity)`
  - `getUserBalance(identity, userId)`
  - `getPendingGoalStakingRewards(userId, identity)`
- **Refresh:** `refetch()` is called every **30 seconds** via `setInterval`.

### Why it can feel slow

| Issue | Impact |
|-------|--------|
| **Five different canisters/services** | Total time is dominated by the slowest of the 5 calls (rewards, IMERA, etc.). |
| **Heavy summary/eligibility** | If `getGoalStakingSummary` or `getGoalStakingEligibility` do a lot of work or return large data (e.g. many positions), they can be slow. |
| **30s refresh** | Full refetch every 30s can make the screen feel like it’s “loading” again and can compete with user actions. |

### Recommendations

1. **Keep using cache:** Screen already uses `useCachedData`; ensure cache TTL is reasonable so 30s refresh doesn’t always trigger a full reload if data is still fresh.
2. **Softer refresh:** Consider refreshing only when the screen is focused (e.g. `useFocusEffect`) instead of a fixed 30s interval, or increase the interval (e.g. 60–90s).
3. **Backend:** If slowness persists, profile the rewards/IMERA canisters (e.g. `getGoalStakingSummary`, `getGoalStakingEligibility`) for heavy work or large responses.

---

## 4. HistoryScreen (`src/screens/HistoryScreen.tsx`)

### Current behavior (after fixes)

- **Single fetch:** 3 canister calls in one `Promise.all` with **limits**:
  - `getUserRouteHistory(p, [BigInt(80)])` – last 80 routes.
  - `getXPTransactions(p, [BigInt(150)])` – last 150 transactions.
  - `getUserRewards(p, [BigInt(150)])` – last 150 rewards.
- **Processing:** Time and activity filters are applied in memory to the 80 routes; XP/rewards are matched in memory (no extra canister calls).

### Why it was slow (before fixes)

| Issue | Before | After |
|-------|--------|--------|
| **Route history** | `getUserRouteHistory(p, [])` – unbounded | `[BigInt(80)]` |
| **XP transactions** | `getXPTransactions(p, [])` – unbounded | `[BigInt(150)]` |
| **Rewards** | `getUserRewards(p, [])` – unbounded | `[BigInt(150)]` |
| **Parallelism** | Route history was fetched separately from XP + rewards | All 3 in one `Promise.all` |

Unbounded calls could return hundreds or thousands of entries, causing large payloads and slow processing.

### Status

**Fixed.** Limits (80 routes, 150 XP, 150 rewards) and a single parallel batch of 3 calls are in place. Load time should be much better.

---

## Summary table

| Screen            | Root cause of slowness                          | Status   | Action |
|-------------------|-------------------------------------------------|----------|--------|
| **FriendsScreen** | Unbounded requests + 2N+2M profile/XP calls     | Open     | Add limit for `getFriendRequests`; batch profile fetches. |
| **LeaderboardScreen** | 201 calls (100 users × 2 + 1), all at once  | Fixed    | Limit 30, batched profile fetch (10 per batch). |
| **StakingScreen** | 5 parallel calls; 30s refetch; possible heavy backend | Partial | Consider less aggressive refresh; profile canisters if needed. |
| **HistoryScreen** | Unbounded route/XP/reward lists; extra round-trip | Fixed    | Limits 80/150/150; single `Promise.all`. |

---

## General patterns that cause slow loading

1. **Unbounded canister calls** – Passing `[]` or no limit so the canister returns “all” data (history, requests, etc.).
2. **N+1 patterns** – One call to get a list, then one or two calls per item (e.g. profile + XP per user).
3. **Large parallel bursts** – Hundreds of calls in a single `Promise.all` causing timeouts or canister/network load.
4. **Sequential instead of parallel** – Multiple independent fetches done one after another instead of in one `Promise.all`.
5. **Aggressive refetch** – Short refetch intervals (e.g. 30s) triggering full reloads often.

---

*Report generated for the bikera_mobile app. Apply the recommended changes to FriendsScreen and optionally to StakingScreen for further improvements.*
