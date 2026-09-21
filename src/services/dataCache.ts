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
  dashboard: { ttl: 2 * 60 * 1000, staleThreshold: 20 * 1000 },
  profile: { ttl: 10 * 60 * 1000, staleThreshold: 60 * 1000 },
  stats: { ttl: 3 * 60 * 1000, staleThreshold: 30 * 1000 },
  staking: { ttl: 3 * 60 * 1000, staleThreshold: 30 * 1000 },
  groups: { ttl: 5 * 60 * 1000, staleThreshold: 60 * 1000 },
  leaderboard: { ttl: 5 * 60 * 1000, staleThreshold: 60 * 1000 },
  history: { ttl: 10 * 60 * 1000, staleThreshold: 30 * 1000 },
  friends: { ttl: 5 * 60 * 1000, staleThreshold: 30 * 1000 },
  wallet: { ttl: 60 * 1000, staleThreshold: 15 * 1000 },
  userPublic: { ttl: 15 * 60 * 1000, staleThreshold: 5 * 60 * 1000 },
  publicProfile: { ttl: 10 * 60 * 1000, staleThreshold: 2 * 60 * 1000 },
  config: { ttl: 60 * 60 * 1000, staleThreshold: 30 * 60 * 1000 },
  default: { ttl: 2 * 60 * 1000, staleThreshold: 20 * 1000 },
};

function serializeCache(value: unknown): string {
  return JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val));
}

export type CacheChangeEvent =
  | { kind: 'invalidate'; type: string; identifier?: string }
  | { kind: 'invalidateType'; type: string }
  | { kind: 'clear' };

type CacheListener = (event: CacheChangeEvent) => void;

class DataCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private listeners: Set<CacheListener> = new Set();
  private readonly CACHE_PREFIX = 'bikera_cache_';
  private readonly MAX_MEMORY_ENTRIES = 100;

  subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(event: CacheChangeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // Ignore listener errors so one screen cannot break others
      }
    });
  }

  private matchesEntry(key: string, type: string, identifier?: string): boolean {
    if (!identifier) {
      return key === type || key.startsWith(`${type}:`);
    }
    const exact = `${type}:${identifier}`;
    return key === exact || key.startsWith(`${exact}:`);
  }

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
        if (__DEV__) console.warn('[CACHE] Error reading from storage:', error);
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
      await AsyncStorage.setItem(storageKey, serializeCache(entry));
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error writing to storage:', error);
    }
  }

  /**
   * Invalidate cache for a specific type/identifier.
   * Also drops composite keys such as history:principal:20 when identifier is principal.
   */
  async invalidate(type: string, identifier?: string): Promise<void> {
    if (!identifier) {
      await this.invalidateType(type);
      return;
    }

    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (this.matchesEntry(key, type, identifier)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((storageKey) => {
        if (!storageKey.startsWith(this.CACHE_PREFIX)) return false;
        return this.matchesEntry(storageKey.slice(this.CACHE_PREFIX.length), type, identifier);
      });
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error removing from storage:', error);
    }

    this.notify({ kind: 'invalidate', type, identifier });
  }

  /**
   * Invalidate all caches of a specific type
   */
  async invalidateType(type: string): Promise<void> {
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (this.matchesEntry(key, type)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((storageKey) => {
        if (!storageKey.startsWith(this.CACHE_PREFIX)) return false;
        return this.matchesEntry(storageKey.slice(this.CACHE_PREFIX.length), type);
      });
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error removing type from storage:', error);
    }

    this.notify({ kind: 'invalidateType', type });
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
      if (__DEV__) console.warn('[CACHE] Error clearing storage:', error);
    }

    this.notify({ kind: 'clear' });
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
export type { CacheEntry, CacheConfig, CacheListener };
