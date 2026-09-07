// Data Cache Service for Mobile App
// Provides persistent caching using AsyncStorage and in-memory cache
// Implements stale-while-revalidate pattern for better UX

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  ttl: number; // Default TTL in milliseconds
  staleThreshold?: number; // Time before data is considered stale (for background refresh)
}

// Cache configuration for different data types
// Optimized for mobile: longer TTLs to reduce backend load
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Dashboard data - longer TTL for better performance
  dashboard: { ttl: 2 * 60 * 1000, staleThreshold: 60 * 1000 }, // 2min TTL, stale after 1min
  profile: { ttl: 10 * 60 * 1000, staleThreshold: 5 * 60 * 1000 }, // 10min TTL, stale after 5min
  stats: { ttl: 3 * 60 * 1000, staleThreshold: 90 * 1000 }, // 3min TTL, stale after 90s
  staking: { ttl: 3 * 60 * 1000, staleThreshold: 90 * 1000 }, // 3min TTL
  groups: { ttl: 5 * 60 * 1000, staleThreshold: 2 * 60 * 1000 }, // 5min TTL
  leaderboard: { ttl: 5 * 60 * 1000, staleThreshold: 2 * 60 * 1000 }, // 5min TTL
  history: { ttl: 10 * 60 * 1000, staleThreshold: 5 * 60 * 1000 }, // 10min TTL
  friends: { ttl: 5 * 60 * 1000, staleThreshold: 2 * 60 * 1000 }, // 5min TTL
  wallet: { ttl: 30 * 1000, staleThreshold: 15 * 1000 }, // 30s TTL, stale after 15s
  userPublic: { ttl: 15 * 60 * 1000, staleThreshold: 5 * 60 * 1000 }, // 15min TTL for public user summaries
  config: { ttl: 60 * 60 * 1000, staleThreshold: 30 * 60 * 1000 }, // 1hr TTL
  default: { ttl: 2 * 60 * 1000, staleThreshold: 60 * 1000 }, // 2min default
};

class DataCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_PREFIX = 'bikera_cache_';
  private readonly MAX_MEMORY_ENTRIES = 100;

  /**
   * Get cache key for a specific data type and identifier
   */
  private getCacheKey(type: string, identifier?: string): string {
    return identifier ? `${type}:${identifier}` : type;
  }

  /**
   * Get cache config for a data type
   */
  private getCacheConfig(type: string): CacheConfig {
    return CACHE_CONFIGS[type] || CACHE_CONFIGS.default;
  }

  /**
   * Check if cache entry is valid (not expired)
   */
  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Check if cache entry is stale (should refresh in background)
   */
  private isStale(entry: CacheEntry<any>, staleThreshold: number): boolean {
    return Date.now() - entry.timestamp >= staleThreshold;
  }

  /**
   * Clean up memory cache if it gets too large
   */
  private cleanupMemoryCache(): void {
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_MEMORY_ENTRIES);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  /**
   * Get cached data (checks memory first, then AsyncStorage)
   */
  async get<T>(
    type: string,
    identifier?: string,
    options?: { skipMemory?: boolean; skipStorage?: boolean }
  ): Promise<{ data: T | null; isStale: boolean }> {
    const cacheKey = this.getCacheKey(type, identifier);
    const config = this.getCacheConfig(type);

    // Check memory cache first
    if (!options?.skipMemory) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && this.isValid(memoryEntry)) {
        const stale = this.isStale(memoryEntry, config.staleThreshold || config.ttl);
        return { data: memoryEntry.data, isStale: stale };
      }
    }

    // Check AsyncStorage
    if (!options?.skipStorage) {
      try {
        const storageKey = this.CACHE_PREFIX + cacheKey;
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            // Restore to memory cache
            this.memoryCache.set(cacheKey, entry);
            const stale = this.isStale(entry, config.staleThreshold || config.ttl);
            return { data: entry.data, isStale: stale };
          } else {
            // Remove expired entry
            await AsyncStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.warn('[CACHE] Error reading from storage:', error);
      }
    }

    return { data: null, isStale: false };
  }

  /**
   * Set cached data (stores in both memory and AsyncStorage)
   */
  async set<T>(
    type: string,
    data: T,
    identifier?: string,
    customTtl?: number
  ): Promise<void> {
    const cacheKey = this.getCacheKey(type, identifier);
    const config = this.getCacheConfig(type);
    const ttl = customTtl || config.ttl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory
    this.memoryCache.set(cacheKey, entry);
    this.cleanupMemoryCache();

    // Store in AsyncStorage (async, don't await)
    try {
      const storageKey = this.CACHE_PREFIX + cacheKey;
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('[CACHE] Error writing to storage:', error);
    }
  }

  /**
   * Invalidate cache for a specific type/identifier
   */
  async invalidate(type: string, identifier?: string): Promise<void> {
    const cacheKey = this.getCacheKey(type, identifier);
    
    // Remove from memory
    this.memoryCache.delete(cacheKey);

    // Remove from storage
    try {
      const storageKey = this.CACHE_PREFIX + cacheKey;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('[CACHE] Error removing from storage:', error);
    }
  }

  /**
   * Invalidate all caches of a specific type
   */
  async invalidateType(type: string): Promise<void> {
    const prefix = this.CACHE_PREFIX + type + ':';
    
    // Remove from memory
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (key.startsWith(type + ':')) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Remove from storage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(key => key.startsWith(prefix));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.warn('[CACHE] Error removing type from storage:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn('[CACHE] Error clearing storage:', error);
    }
  }

  /**
   * Get cache stats (for debugging)
   */
  getStats(): { memorySize: number; memoryKeys: string[] } {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
    };
  }
}

// Singleton instance
export const dataCache = new DataCacheService();

// Export types
export type { CacheEntry, CacheConfig };
