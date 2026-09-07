/**
 * Cycle Tracker - Tracks cycle consumption per method
 * Fast, lightweight, secure (client-side only)
 * 
 * Purpose: Monitor and optimize cycle usage
 * Overhead: <0.1% (minimal performance impact)
 * Adapted for React Native
 */
export interface MethodStats {
  method: string;
  count: number;
  totalCycles: number;
  averageCycles: number;
  minCycles: number;
  maxCycles: number;
  lastCall: Date;
}

export interface CycleTrackerStats {
  totalCycles: number;
  totalCalls: number;
  averageCyclesPerCall: number;
  byMethod: MethodStats[];
  timestamp: Date;
}

class CycleTracker {
  private calls: Map<string, {
    count: number;
    totalCycles: number;
    minCycles: number;
    maxCycles: number;
    lastCall: number;
  }> = new Map();
  
  private enabled: boolean = true;
  
  /**
   * Track a canister call
   * @param method - Method name (e.g., "getUserDashboardSnapshot")
   * @param cycles - Estimated cycles (from response headers or timing)
   */
  trackCall(method: string, cycles: number = 0) {
    if (!this.enabled) return;
    
    const existing = this.calls.get(method) || {
      count: 0,
      totalCycles: 0,
      minCycles: Infinity,
      maxCycles: 0,
      lastCall: 0
    };
    
    const updated = {
      count: existing.count + 1,
      totalCycles: existing.totalCycles + cycles,
      minCycles: Math.min(existing.minCycles, cycles),
      maxCycles: Math.max(existing.maxCycles, cycles),
      lastCall: Date.now()
    };
    
    this.calls.set(method, updated);
  }
  
  /**
   * Get statistics for a specific method
   */
  getMethodStats(method: string): MethodStats | null {
    const stats = this.calls.get(method);
    if (!stats) return null;
    
    return {
      method,
      count: stats.count,
      totalCycles: stats.totalCycles,
      averageCycles: stats.count > 0 ? Math.round(stats.totalCycles / stats.count) : 0,
      minCycles: stats.minCycles === Infinity ? 0 : stats.minCycles,
      maxCycles: stats.maxCycles,
      lastCall: new Date(stats.lastCall)
    };
  }
  
  /**
   * Get all statistics
   */
  getStats(): CycleTrackerStats {
    const methods = Array.from(this.calls.keys())
      .map(m => this.getMethodStats(m)!)
      .filter(m => m !== null) as MethodStats[];
    
    const total = methods.reduce((sum, m) => sum + m.totalCycles, 0);
    const totalCalls = methods.reduce((sum, m) => sum + m.count, 0);
    
    return {
      totalCycles: total,
      totalCalls,
      averageCyclesPerCall: totalCalls > 0 ? Math.round(total / totalCalls) : 0,
      byMethod: methods.sort((a, b) => b.totalCycles - a.totalCycles),
      timestamp: new Date()
    };
  }
  
  /**
   * Log report to console
   */
  logReport() {
    const stats = this.getStats();
    console.group('[Cycle Tracker] Report');
    console.log(`Total Calls: ${stats.totalCalls}`);
    console.log(`Total Cycles: ${stats.totalCycles.toLocaleString()}`);
    console.log(`Average: ${stats.averageCyclesPerCall.toLocaleString()} cycles/call`);
    console.table(stats.byMethod);
    console.groupEnd();
  }
  
  /**
   * Export data for analysis
   */
  exportData() {
    return {
      stats: this.getStats(),
      raw: Object.fromEntries(this.calls)
    };
  }
  
  /**
   * Clear all tracking data
   */
  clear() {
    this.calls.clear();
  }
  
  /**
   * Enable/disable tracking
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  /**
   * Check if tracking is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
let cycleTracker: CycleTracker | null = null;

/**
 * Get the cycle tracker instance
 */
export const getCycleTracker = (): CycleTracker => {
  if (!cycleTracker) {
    cycleTracker = new CycleTracker();
  }
  return cycleTracker;
};

/**
 * Track a canister call with timing
 * Estimates cycles from duration (rough approximation)
 * Note: React Native doesn't have performance.now(), using Date.now() instead
 */
export const trackCanisterCall = (method: string, startTime: number) => {
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Estimate cycles from duration (rough approximation)
  // 1ms ≈ 1M cycles (very rough estimate, adjust based on actual measurements)
  const estimatedCycles = Math.round(duration * 1_000_000);
  
  getCycleTracker().trackCall(method, estimatedCycles);
};

