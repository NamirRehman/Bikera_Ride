// Data Cache Service for Mobile App
// Persistent + in-memory stale-while-revalidate cache

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  ttl: number;
  staleThreshold?: number;
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  dashboard: { ttl: 5 * 60 * 1000, staleThreshold: 90 * 1000 },
  profile: { ttl: 10 * 60 * 1000, staleThreshold: 60 * 1000 },
  stats: { ttl: 5 * 60 * 1000, staleThreshold: 90 * 1000 },
  history: { ttl: 10 * 60 * 1000, staleThreshold: 90 * 1000 },
  friends: { ttl: 5 * 60 * 1000, staleThreshold: 120 * 1000 },
  wallet: { ttl: 3 * 60 * 1000, staleThreshold: 60 * 1000 },
  leaderboard: { ttl: 5 * 60 * 1000, staleThreshold: 90 * 1000 },
  userPublic: { ttl: 15 * 60 * 1000, staleThreshold: 5 * 60 * 1000 },
  publicProfile: { ttl: 10 * 60 * 1000, staleThreshold: 2 * 60 * 1000 },
  config: { ttl: 60 * 60 * 1000, staleThreshold: 30 * 60 * 1000 },
  default: { ttl: 5 * 60 * 1000, staleThreshold: 90 * 1000 },
};

function serializeCache(value: unknown): string {
  return JSON.stringify(value, (_key, val) => (typeof val === 'bigint' ? val.toString() : val));
}

export type CacheKeyRef = { type: string; identifier?: string };

export type CacheChangeEvent =
  | { kind: 'invalidate'; type: string; identifier?: string }
  | { kind: 'invalidateType'; type: string }
  | { kind: 'invalidateMany'; keys: CacheKeyRef[] }
  | { kind: 'clear' };

type CacheListener = (event: CacheChangeEvent) => void;

class DataCacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private listeners: Set<CacheListener> = new Set();
  private readonly CACHE_PREFIX = 'bikera_ride_cache_';
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
        // ignore
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

  private getCacheKey(type: string, identifier?: string): string {
    return identifier ? `${type}:${identifier}` : type;
  }

  private getCacheConfig(type: string): CacheConfig {
    return CACHE_CONFIGS[type] || CACHE_CONFIGS.default;
  }

  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private isStale(entry: CacheEntry<any>, staleThreshold: number): boolean {
    return Date.now() - entry.timestamp >= staleThreshold;
  }

  private cleanupMemoryCache(): void {
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - this.MAX_MEMORY_ENTRIES);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  peekSync<T>(
    type: string,
    identifier?: string
  ): { data: T | null; isStale: boolean } {
    const cacheKey = this.getCacheKey(type, identifier);
    const config = this.getCacheConfig(type);
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return {
        data: memoryEntry.data,
        isStale: this.isStale(memoryEntry, config.staleThreshold || config.ttl),
      };
    }
    return { data: null, isStale: false };
  }

  /** Prefetch disk entries into memory so first screen paint can be sync. */
  async warm(keys: Array<{ type: string; identifier?: string }>): Promise<void> {
    await Promise.all(keys.map((k) => this.get(k.type, k.identifier)));
  }

  async get<T>(
    type: string,
    identifier?: string,
    options?: { skipMemory?: boolean; skipStorage?: boolean }
  ): Promise<{ data: T | null; isStale: boolean }> {
    const cacheKey = this.getCacheKey(type, identifier);
    const config = this.getCacheConfig(type);

    if (!options?.skipMemory) {
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && this.isValid(memoryEntry)) {
        const stale = this.isStale(memoryEntry, config.staleThreshold || config.ttl);
        return { data: memoryEntry.data, isStale: stale };
      }
    }

    if (!options?.skipStorage) {
      try {
        const storageKey = this.CACHE_PREFIX + cacheKey;
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            this.memoryCache.set(cacheKey, entry);
            const stale = this.isStale(entry, config.staleThreshold || config.ttl);
            return { data: entry.data, isStale: stale };
          }
          await AsyncStorage.removeItem(storageKey);
        }
      } catch (error) {
        if (__DEV__) console.warn('[CACHE] Error reading from storage:', error);
      }
    }

    return { data: null, isStale: false };
  }

  async set<T>(
    type: string,
    data: T,
    identifier?: string,
    customTtl?: number
  ): Promise<void> {
    const cacheKey = this.getCacheKey(type, identifier);
    const config = this.getCacheConfig(type);
    const ttl = customTtl || config.ttl;
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    this.memoryCache.set(cacheKey, entry);
    this.cleanupMemoryCache();
    try {
      await AsyncStorage.setItem(this.CACHE_PREFIX + cacheKey, serializeCache(entry));
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error writing to storage:', error);
    }
  }

  async invalidate(type: string, identifier?: string): Promise<void> {
    if (!identifier) {
      await this.invalidateType(type);
      return;
    }

    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (this.matchesEntry(key, type, identifier)) keysToDelete.push(key);
    });
    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((storageKey) => {
        if (!storageKey.startsWith(this.CACHE_PREFIX)) return false;
        return this.matchesEntry(storageKey.slice(this.CACHE_PREFIX.length), type, identifier);
      });
      if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error removing from storage:', error);
    }

    this.notify({ kind: 'invalidate', type, identifier });
  }

  async invalidateType(type: string): Promise<void> {
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((_, key) => {
      if (this.matchesEntry(key, type)) keysToDelete.push(key);
    });
    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    try {
      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter((storageKey) => {
        if (!storageKey.startsWith(this.CACHE_PREFIX)) return false;
        return this.matchesEntry(storageKey.slice(this.CACHE_PREFIX.length), type);
      });
      if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error removing type from storage:', error);
    }

    this.notify({ kind: 'invalidateType', type });
  }

  /** Delete many cache keys and notify subscribers once. */
  async invalidateMany(keys: CacheKeyRef[]): Promise<void> {
    if (keys.length === 0) return;

    const memoryKeysToDelete: string[] = [];
    keys.forEach(({ type, identifier }) => {
      this.memoryCache.forEach((_, key) => {
        if (this.matchesEntry(key, type, identifier)) memoryKeysToDelete.push(key);
      });
    });
    memoryKeysToDelete.forEach((key) => this.memoryCache.delete(key));

    try {
      const storageKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = storageKeys.filter((storageKey) => {
        if (!storageKey.startsWith(this.CACHE_PREFIX)) return false;
        const cacheKey = storageKey.slice(this.CACHE_PREFIX.length);
        return keys.some(({ type, identifier }) => this.matchesEntry(cacheKey, type, identifier));
      });
      if (keysToRemove.length > 0) await AsyncStorage.multiRemove(keysToRemove);
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error removing many from storage:', error);
    }

    this.notify({ kind: 'invalidateMany', keys });
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));
      if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      if (__DEV__) console.warn('[CACHE] Error clearing storage:', error);
    }
    this.notify({ kind: 'clear' });
  }

  getStats(): { memorySize: number; memoryKeys: string[] } {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
    };
  }
}

export const dataCache = new DataCacheService();
export type { CacheEntry, CacheConfig, CacheListener };
