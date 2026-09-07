// Shadow Worker Client - Phase 2
// Provides easy-to-use interface for snapshot queries with caching
// Adapted for React Native
// Optimized with request deduplication and improved caching

import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { 
  getBikeraUserActor, 
  getBikeraRewardsActor, 
  getBikeraXpActor, 
  getBikeraMainActor,
  canisterIds 
} from "../utils/actors";
import { getCycleTracker, trackCanisterCall } from "../utils/cycleTracker";
import { getCacheMonitor } from "../utils/cacheMonitor";
import { requestDeduplicator, createRequestKey } from "./requestDeduplicator";

/**
 * Shadow Worker Client - Phase 2 Implementation
 * Provides cached access to snapshot queries
 * Adapted for React Native (no service worker, uses in-memory cache only)
 */
export class ShadowWorkerClient {
  private agent: HttpAgent;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  
  // Cache TTLs - Optimized for mobile performance
  private readonly SNAPSHOT_TTL = 2 * 60 * 1000; // 2 minutes (increased from 30s)
  private readonly PROFILE_TTL = 10 * 60 * 1000; // 10 minutes (increased from 5min)
  private readonly STATS_TTL = 3 * 60 * 1000; // 3 minutes (increased from 1min)

  constructor(agent: HttpAgent) {
    this.agent = agent;
  }

  /**
   * Get user dashboard snapshot (optimized single call)
   * Uses in-memory caching and request deduplication
   * Note: This only returns last 5 sessions - use getActivitySessions for all sessions
   */
  async getUserDashboardSnapshot(
    userId: Principal,
    useCache: boolean = true
  ): Promise<any> {
    const method = 'getUserDashboardSnapshot';
    const startTime = Date.now();
    const cacheMonitor = getCacheMonitor();
    const cycleTracker = getCycleTracker();
    const cacheKey = `dashboard:${userId.toText()}`;
    
    // Check in-memory cache first
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log('[Shadow] In-memory cache HIT:', method);
        cacheMonitor.recordHit(method);
        cycleTracker.trackCall(method, 0); // Cache hit = 0 cycles
        return cached.data;
      }
    }

    // Cache miss - use deduplication to prevent duplicate requests
    const requestKey = createRequestKey(method, userId.toText());
    return requestDeduplicator.execute(requestKey, async () => {
      cacheMonitor.recordMiss(method);
      
      // Call canister
      try {
        const actor = getBikeraUserActor({ agent: this.agent });
        const result = await (actor as any).getUserDashboardSnapshot(userId);
        
        // Track cycles (estimate from duration)
        const duration = Date.now() - startTime;
        const estimatedCycles = Math.round(duration * 1_000_000);
        cycleTracker.trackCall(method, estimatedCycles);
        
        // Cache in memory
        if (useCache) {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            ttl: this.SNAPSHOT_TTL
          });
        }
        
        return result;
      } catch (error) {
        cacheMonitor.recordError(method);
        console.error('[Shadow] Error fetching dashboard snapshot:', error);
        throw error;
      }
    });
  }
  
  /**
   * Get all activity sessions (bypasses cache - always fresh)
   * Use this instead of getUserDashboardSnapshot for full session list
   */
  async getActivitySessions(
    userId: Principal,
    limit?: bigint,
    offset?: bigint
  ): Promise<any[]> {
    // Always bypass cache for this method
    const actor = getBikeraUserActor({ agent: this.agent });
    const limitOpt = limit ? [limit] : [];
    const offsetOpt = offset !== undefined ? [offset] : [];
    return await (actor as any).getActivitySessions(userId, limitOpt, offsetOpt);
  }

  /**
   * Get rewards snapshot
   */
  async getRewardsSnapshot(
    userId: Principal,
    useCache: boolean = true
  ): Promise<any> {
    const method = 'getRewardsSnapshot';
    const startTime = Date.now();
    const cacheMonitor = getCacheMonitor();
    const cycleTracker = getCycleTracker();
    const cacheKey = `rewards:${userId.toText()}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log('[Shadow] In-memory cache HIT:', method);
        cacheMonitor.recordHit(method);
        cycleTracker.trackCall(method, 0);
        return cached.data;
      }
    }

    // Use deduplication
    const requestKey = createRequestKey(method, userId.toText());
    return requestDeduplicator.execute(requestKey, async () => {
      cacheMonitor.recordMiss(method);
      
      try {
        const actor = getBikeraRewardsActor({ agent: this.agent });
        const result = await (actor as any).getRewardsSnapshot(userId);
        
        const duration = Date.now() - startTime;
        const estimatedCycles = Math.round(duration * 1_000_000);
        cycleTracker.trackCall(method, estimatedCycles);
        
        if (useCache) {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            ttl: this.SNAPSHOT_TTL
          });
        }
        
        return result;
      } catch (error) {
        cacheMonitor.recordError(method);
        console.error('[Shadow] Error fetching rewards snapshot:', error);
        throw error;
      }
    });
  }

  /**
   * Get XP snapshot
   */
  async getXPSnapshot(
    userId: Principal,
    useCache: boolean = true
  ): Promise<any> {
    const method = 'getXPSnapshot';
    const startTime = Date.now();
    const cacheMonitor = getCacheMonitor();
    const cycleTracker = getCycleTracker();
    const cacheKey = `xp:${userId.toText()}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log('[Shadow] In-memory cache HIT:', method);
        cacheMonitor.recordHit(method);
        cycleTracker.trackCall(method, 0);
        return cached.data;
      }
    }

    // Use deduplication
    const requestKey = createRequestKey(method, userId.toText());
    return requestDeduplicator.execute(requestKey, async () => {
      cacheMonitor.recordMiss(method);
      
      try {
        const actor = getBikeraXpActor({ agent: this.agent });
        const result = await (actor as any).getXPSnapshot(userId);
        
        const duration = Date.now() - startTime;
        const estimatedCycles = Math.round(duration * 1_000_000);
        cycleTracker.trackCall(method, estimatedCycles);
        
        if (useCache) {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            ttl: this.SNAPSHOT_TTL
          });
        }
        
        return result;
      } catch (error) {
        cacheMonitor.recordError(method);
        console.error('[Shadow] Error fetching XP snapshot:', error);
        throw error;
      }
    });
  }

  /**
   * Get mining round snapshot
   */
  async getMiningRoundSnapshot(
    userId: Principal,
    useCache: boolean = true
  ): Promise<any> {
    const method = 'getMiningRoundSnapshot';
    const startTime = Date.now();
    const cacheMonitor = getCacheMonitor();
    const cycleTracker = getCycleTracker();
    const cacheKey = `mining:${userId.toText()}`;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        console.log('[Shadow] In-memory cache HIT:', method);
        cacheMonitor.recordHit(method);
        cycleTracker.trackCall(method, 0);
        return cached.data;
      }
    }

    // Use deduplication
    const requestKey = createRequestKey(method, userId.toText());
    return requestDeduplicator.execute(requestKey, async () => {
      cacheMonitor.recordMiss(method);
      
      try {
        const actor = getBikeraMainActor({ agent: this.agent });
        const result = await (actor as any).getMiningRoundSnapshot(userId);
        
        const duration = Date.now() - startTime;
        const estimatedCycles = Math.round(duration * 1_000_000);
        cycleTracker.trackCall(method, estimatedCycles);
        
        if (useCache) {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
            ttl: this.SNAPSHOT_TTL
          });
        }
        
        return result;
      } catch (error) {
        cacheMonitor.recordError(method);
        console.error('[Shadow] Error fetching mining snapshot:', error);
        throw error;
      }
    });
  }

  /**
   * Batch multiple snapshot queries
   * Executes all in parallel for maximum performance
   */
  async batchSnapshots(userId: Principal): Promise<{
    dashboard: any;
    rewards: any;
    xp: any;
    mining: any;
  }> {
    // Execute all snapshots in parallel
    const [dashboard, rewards, xp, mining] = await Promise.all([
      this.getUserDashboardSnapshot(userId, true),
      this.getRewardsSnapshot(userId, true),
      this.getXPSnapshot(userId, true),
      this.getMiningRoundSnapshot(userId, true)
    ]);

    return { dashboard, rewards, xp, mining };
  }

  /**
   * Clear all caches (in-memory only for React Native)
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    console.log('[Shadow] In-memory cache cleared');
  }

  /**
   * Get cache statistics (in-memory only for React Native)
   */
  async getCacheStats(): Promise<any> {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        ttl: value.ttl
      }))
    };
  }

  /**
   * Get monitoring statistics (cycles + cache)
   */
  getMonitoringStats() {
    return {
      cycles: getCycleTracker().getStats(),
      cache: getCacheMonitor().getStats()
    };
  }

  /**
   * Log monitoring report
   */
  logMonitoringReport() {
    getCycleTracker().logReport();
    getCacheMonitor().logStats();
  }
}

