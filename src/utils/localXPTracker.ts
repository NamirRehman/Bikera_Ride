/**
 * Local XP Tracker - Aggregates XP locally for instant UI feedback
 * Reduces canister writes by 10-50X
 * 
 * Security: Only for UI, final validation on canister
 * Performance: Batches updates every 2 minutes instead of per-event
 * Adapted for React Native
 */

export class LocalXPTracker {
  private currentXP: number = 0;
  private pendingXP: number = 0;
  private pendingDistance: number = 0; // meters
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Configuration
  private readonly SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
  private readonly XP_PER_KM = 1; // 1 XP per kilometer
  
  // Callbacks
  private onXPUpdate?: (totalXP: number, pendingXP: number) => void;
  private onSync?: (distance: number) => Promise<void>;
  
  constructor(
    initialXP: number = 0,
    onXPUpdate?: (totalXP: number, pendingXP: number) => void,
    onSync?: (distance: number) => Promise<void>
  ) {
    this.currentXP = initialXP;
    this.onXPUpdate = onXPUpdate;
    this.onSync = onSync;
  }
  
  /**
   * Add distance XP (for UI feedback)
   */
  addDistance(distance: number) {
    const xpGained = Math.floor((distance / 1000) * this.XP_PER_KM);
    this.pendingXP += xpGained;
    this.pendingDistance += distance;
    this.currentXP += xpGained; // Optimistic update for UI
    
    // Update UI immediately
    if (this.onXPUpdate) {
      this.onXPUpdate(this.currentXP, this.pendingXP);
    }
    
    // Schedule sync
    this.scheduleSync();
  }
  
  /**
   * Schedule sync to canister
   */
  private scheduleSync() {
    if (this.syncTimer) {
      return; // Already scheduled
    }
    
    this.syncTimer = setTimeout(async () => {
      await this.syncToCanister();
      this.syncTimer = null;
    }, this.SYNC_INTERVAL_MS);
  }
  
  /**
   * Sync pending XP to canister
   */
  async syncToCanister(): Promise<void> {
    if (this.pendingDistance === 0) {
      return; // Nothing to sync
    }
    
    const distanceToSync = this.pendingDistance;
    
    if (this.onSync) {
      try {
        await this.onSync(distanceToSync);
        
        // Reset pending after successful sync
        this.pendingXP = 0;
        this.pendingDistance = 0;
        
        console.log('[LocalXPTracker] Synced', distanceToSync, 'meters');
      } catch (error) {
        console.error('[LocalXPTracker] Sync failed:', error);
        // Don't reset pending - will retry on next sync
        throw error;
      }
    }
  }
  
  /**
   * Force immediate sync
   */
  async forceSync(): Promise<void> {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    await this.syncToCanister();
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      currentXP: this.currentXP,
      pendingXP: this.pendingXP,
      pendingDistance: this.pendingDistance
    };
  }
  
  /**
   * Update base XP (from canister)
   */
  updateBaseXP(baseXP: number) {
    // Adjust current XP to match canister
    const adjustment = baseXP - (this.currentXP - this.pendingXP);
    this.currentXP = baseXP + this.pendingXP;
    
    if (this.onXPUpdate) {
      this.onXPUpdate(this.currentXP, this.pendingXP);
    }
  }
  
  /**
   * Reset (for new session)
   */
  reset(baseXP: number = 0) {
    this.currentXP = baseXP;
    this.pendingXP = 0;
    this.pendingDistance = 0;
    
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.onXPUpdate) {
      this.onXPUpdate(this.currentXP, this.pendingXP);
    }
  }
}

