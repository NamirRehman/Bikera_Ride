# Speed Improvement Roadmap – How to Start, Current vs Target

This guide explains **how to start** improving app speed, your **current standing** (where you are now), and **target speed** after all changes.

---

## Your Standing of Speed Now

### Summary (current state)

| Screen | Canister calls per load | Relative speed | Status |
|--------|-------------------------|----------------|--------|
| **LeaderboardScreen** | 61 (1 + 30×2, batched) | Medium | Fixed on mobile; still N+1 pattern |
| **HistoryScreen** | 3 (parallel, limited) | Good | Fixed |
| **FriendsScreen** | 2 + 2N + 2M (e.g. 142 for 50 friends + 20 requests) | Slow | Open |
| **StakingScreen** | 5 (parallel) | Depends on backend | Partial (30s refresh can feel slow) |

### Per-screen detail (current)

- **LeaderboardScreen**  
  - **Calls:** 1 (`getLeaderboardWithFilter(30)`) + 60 (30 users × `getUserProfile` + `getPublicUserXPProfile`) in 3 batches of 10.  
  - **Speed:** Much better than before (was 201 calls). Still ~61 round-trips, so load can take several seconds.

- **HistoryScreen**  
  - **Calls:** 3 in one `Promise.all`: route history (80), XP transactions (150), rewards (150).  
  - **Speed:** Good. One round-trip of 3 parallel calls; typically 1–3 seconds.

- **FriendsScreen**  
  - **Calls:** 2 (getFriends + getFriendRequests) + 2×friends + 2×requests. Example: 50 friends + 20 requests → **142 calls**.  
  - **Speed:** Slow. Large burst of profile/XP calls; can take 10+ seconds or time out.

- **StakingScreen**  
  - **Calls:** 5 in one `Promise.all`.  
  - **Speed:** Depends on rewards/IMERA canisters. 30s refetch can make the screen feel like it’s “always loading.”

**Overall now:** History is in good shape. Leaderboard is acceptable but still many calls. Friends is the slowest. Staking is OK except for refresh behavior.

---

## Speed at the End (target state)

After you complete the roadmap below, target numbers look like this:

| Screen | Target canister calls | Relative speed |
|--------|------------------------|----------------|
| **LeaderboardScreen** | **3** (leaderboard + XP batch + user batch) | Fast |
| **HistoryScreen** | **3** (unchanged; already good) | Good |
| **FriendsScreen** | **4** (friends + requests + user batch + XP batch) | Fast |
| **StakingScreen** | **5** (unchanged) + softer refresh | Good |

### What “fast” means here

- **Leaderboard:** 3 calls instead of 61 → one short round-trip (~1–2 s typical) instead of many.
- **Friends:** 4 calls instead of 142 → one short round-trip instead of a long burst.
- **History:** Already 3 calls; no change.
- **Staking:** Same 5 calls; improvement is less aggressive refresh (e.g. on focus or 60s) so the screen doesn’t feel like it’s constantly reloading.

---

## How to Start – Step-by-Step

Follow this order so each step has the APIs it needs.

### Phase 1: Backend (canisters)

1. **bikera_user – add batch profiles**
   - Implement `getBatchUserProfiles(userIds: [UserId])` returning lite profiles: `username`, `displayName?`, `avatar?`.
   - Cap input size (e.g. max 100 principals).
   - Deploy and update Candid/IDL for frontends.

2. **bikera_validator – safe default for history**
   - In `getUserRouteHistory(userId, limit)`, when `limit == null`, apply a default max (e.g. 100).
   - Protects any client that forgets to pass a limit.

3. **bikera_xp – safe default for transactions**
   - In `getXPTransactions(userId, limit)`, when `limit == null`, apply a default max (e.g. 150).
   - Same safety as above.

Details and signatures: see **BACKEND_RECOMMENDATIONS_SLOW_LOADING.md**.

---

### Phase 2: Mobile app (bikera_mobile)

4. **LeaderboardScreen – use batch APIs**
   - After step 1 is deployed:
     - Call `getLeaderboardWithFilter(30, timeFilter)`.
     - Extract principal list → call **bikera_xp** `getBatchUserProfiles(principals)` once.
     - Call **bikera_user** `getBatchUserProfiles(principals)` once.
   - Build the list from these 3 responses (no per-user profile calls).
   - **Result:** 61 calls → **3 calls**.

5. **FriendsScreen – limit + batch**
   - Call `getFriendRequests(p, [BigInt(50)])` instead of `[]`.
   - Collect all principals (friends + request senders).
   - One call to **bikera_user** `getBatchUserProfiles(principals)` and one to **bikera_xp** `getBatchUserProfiles(principals)`.
   - **Result:** 2 + 2N + 2M → **4 calls** (e.g. 142 → 4).

6. **StakingScreen (optional)**
   - Refresh on focus (e.g. `useFocusEffect`) or increase interval to 60–90s instead of 30s.
   - **Result:** Same 5 calls per load, but fewer unnecessary reloads.

---

### Phase 3: Web app (BikApp) – same idea

7. **Web Leaderboard**
   - Same pattern as mobile Leaderboard: `getLeaderboardWithFilter` + XP `getBatchUserProfiles` + user `getBatchUserProfiles`.
   - **Result:** 1 + 200 → **3 calls** for 100 users.

8. **Any other list screens**
   - Where you show many users (e.g. search results, other leaderboards), use the two batch APIs instead of N×getUserProfile and N×getPublicUserXPProfile.

---

## Quick reference

| Step | Where | What | Outcome |
|------|--------|------|---------|
| 1 | bikera_user | Add `getBatchUserProfiles(userIds)` | Enables 3-call leaderboard and 4-call friends |
| 2 | bikera_validator | Default limit for `getUserRouteHistory(_, null)` | Safe history |
| 3 | bikera_xp | Default limit for `getXPTransactions(_, null)` | Safe XP list |
| 4 | Mobile LeaderboardScreen | Use 2 batch APIs | 61 → **3** calls |
| 5 | Mobile FriendsScreen | Limit requests + 2 batch APIs | 142 → **4** calls |
| 6 | Mobile StakingScreen | Softer refresh | Better UX |
| 7–8 | Web | Same batch pattern on Leaderboard and lists | 201 → **3** calls |

---

## Current vs target at a glance

| Metric | Now | After roadmap |
|--------|-----|----------------|
| **Leaderboard (mobile)** | 61 calls, medium load | **3 calls**, fast |
| **Leaderboard (web)** | 201 calls, slow | **3 calls**, fast |
| **Friends (mobile)** | 142 calls (example), slow | **4 calls**, fast |
| **History (mobile)** | 3 calls, good | 3 calls, good |
| **Staking (mobile)** | 5 calls, 30s refresh | 5 calls, refresh on focus or 60s |

Start with **Phase 1 (backend)** so the batch API exists; then **Phase 2 (mobile)** for the biggest user-facing gains. Use **SLOW_DATA_LOADING_REPORT.md** for causes and **BACKEND_RECOMMENDATIONS_SLOW_LOADING.md** for full backend details.

---

## Declarations when you deploy from WSL

If you deploy canisters from **WSL** (or another machine), the **declarations** in your Windows project (e.g. `BikApp/.../declarations/`) can be older and missing new methods like `getBatchUserProfiles` on the user canister.

- **Runtime:** The web app still works. Leaderboard (and any code using the new batch APIs) calls `(userActor as any).getBatchUserProfiles(...)` so TypeScript does not require the method in the declaration; the deployed canister has it and the call succeeds.
- **To get types and autocomplete:** Regenerate declarations from the same canister code you deployed (e.g. in WSL run `dfx generate` in the repo that has the canisters), then copy the updated `declarations/` (at least `bikera_user`) into your frontend project so the types include `getBatchUserProfiles`. After that you can remove the `(userActor as any)` cast if you want.
