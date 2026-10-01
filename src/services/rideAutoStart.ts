/**
 * Production auto-start coordinator for ride tracking.
 *
 * Rules:
 * - Preference lives on Track screen (AsyncStorage). Default OFF.
 * - Auto-start runs at most once per app session (AppTabs mount).
 * - A one-shot launch token is claimed by Track before start — prevents
 *   double-start from Strict Mode, remounts, or focus storms.
 * - Returning from background does NOT arm a new start.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bikera_ride_auto_start_on_launch_v1';

class RideAutoStartService {
  private preference: boolean | null = null;
  private hydratePromise: Promise<boolean> | null = null;

  /** Monotonic id for the current AppTabs session launch, if armed. */
  private launchId: number | null = null;
  private claimedLaunchId: number | null = null;
  /** True after claim until start begins or claim is released. */
  private claimPendingExecution = false;
  private sessionArmed = false;
  private startInFlight = false;
  private nextLaunchSeq = 1;

  async hydrate(): Promise<boolean> {
    if (this.preference !== null) return this.preference;
    if (this.hydratePromise) return this.hydratePromise;

    this.hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        this.preference = raw === '1';
      } catch {
        this.preference = false;
      }
      return this.preference;
    })();

    try {
      return await this.hydratePromise;
    } finally {
      this.hydratePromise = null;
    }
  }

  /** Sync read after hydrate (false until hydrated). */
  isEnabledSync(): boolean {
    return this.preference === true;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.preference = enabled;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Preference still held in memory for this session
    }
  }

  /**
   * Call once when main tabs mount. If preference is on, arms a one-shot
   * launch and returns true so navigation can open Track.
   */
  async armSessionLaunch(): Promise<boolean> {
    if (this.sessionArmed) {
      return this.launchId !== null && this.claimedLaunchId !== this.launchId;
    }
    this.sessionArmed = true;

    const enabled = await this.hydrate();
    if (!enabled) {
      this.launchId = null;
      return false;
    }

    this.launchId = this.nextLaunchSeq++;
    this.claimedLaunchId = null;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[AUTO_START] Armed launch', this.launchId);
    }
    return true;
  }

  /** Whether Track should open as the initial tab this session. */
  shouldOpenTrackOnLaunch(): boolean {
    return this.launchId !== null && this.claimedLaunchId !== this.launchId;
  }

  /**
   * Track screen claims the armed launch exactly once.
   * Returns true only for the first successful claim.
   */
  claimPendingStart(): boolean {
    if (this.launchId == null) return false;
    if (this.claimedLaunchId === this.launchId) return false;
    if (this.startInFlight) return false;

    this.claimedLaunchId = this.launchId;
    this.claimPendingExecution = true;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[AUTO_START] Claimed launch', this.launchId);
    }
    return true;
  }

  /**
   * If Track blurs before start runs, release so a later focus this session
   * can still auto-start once (avoids burning the token on a cancelled timer).
   */
  releaseUnstartedClaim(): void {
    if (!this.claimPendingExecution) return;
    if (this.startInFlight) return;
    this.claimPendingExecution = false;
    this.claimedLaunchId = null;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[AUTO_START] Released unstarted claim', this.launchId);
    }
  }

  /** Global start mutex shared with manual Start button. */
  tryBeginStart(): boolean {
    if (this.startInFlight) return false;
    this.startInFlight = true;
    this.claimPendingExecution = false;
    return true;
  }

  endStart(): void {
    this.startInFlight = false;
  }

  isStartInFlight(): boolean {
    return this.startInFlight;
  }

  /** Call on logout so the next login can arm a fresh session. */
  resetSession(): void {
    this.sessionArmed = false;
    this.launchId = null;
    this.claimedLaunchId = null;
    this.claimPendingExecution = false;
    this.startInFlight = false;
  }
}

export const rideAutoStart = new RideAutoStartService();
