// React hook for fetching data with caching
// Implements stale-while-revalidate pattern; deduplicates in-flight requests for same key

import { useState, useEffect, useCallback, useRef } from 'react';
import { dataCache } from '../services/dataCache';
import { requestDeduplicator } from '../services/requestDeduplicator';

interface UseCachedDataOptions<T> {
  type: string;
  identifier?: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  skipCache?: boolean;
  customTtl?: number;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

function cacheKey(type: string, identifier?: string): string {
  return identifier ? `${type}:${identifier}` : type;
}

/**
 * Hook for fetching data with automatic caching
 * Returns cached data immediately if available, then refreshes in background if stale.
 * Deduplicates in-flight requests so multiple components sharing the same key reuse one call.
 */
export function useCachedData<T>({
  type,
  identifier,
  fetcher,
  enabled = true,
  onSuccess,
  onError,
  skipCache = false,
  customTtl,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    const key = cacheKey(type, identifier);

    try {
      // Try to get from cache first (unless forcing refresh or skipping cache)
      if (!forceRefresh && !skipCache) {
        const cached = await dataCache.get<T>(type, identifier);
        if (cached.data !== null) {
          if (mountedRef.current) {
            setData(cached.data);
            setLoading(false);
            setError(null);
          }

          // If stale, refresh in background (deduplicated)
          if (cached.isStale) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log(`[CACHE] Data stale for ${type}, refreshing in background...`);
            }
            requestDeduplicator
              .execute(key, fetcher, 25000)
              .then((freshData) => {
                if (mountedRef.current) {
                  setData(freshData);
                  dataCache.set(type, freshData, identifier, customTtl);
                  onSuccessRef.current?.(freshData);
                }
              })
              .catch((err) => {
                if (__DEV__) {
                  // eslint-disable-next-line no-console
                  console.warn(`[CACHE] Background refresh failed for ${type}:`, err);
                }
              });
          }
          return;
        }
      }

      // Cache miss or force refresh - fetch (deduplicated so multiple mounts share one call)
      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const freshData = await requestDeduplicator.execute(key, fetcher, 25000);

      if (mountedRef.current) {
        setData(freshData);
        setLoading(false);
        setError(null);
        if (!skipCache) {
          await dataCache.set(type, freshData, identifier, customTtl);
        }
        onSuccessRef.current?.(freshData);
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(errorObj);
        setLoading(false);
        onErrorRef.current?.(errorObj);
      }
    }
  }, [type, identifier, fetcher, enabled, skipCache, customTtl]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(async () => {
    await dataCache.invalidate(type, identifier);
    setData(null);
  }, [type, identifier]);

  useEffect(() => {
    if (enabled) {
      fetchData(false);
    } else {
      setLoading(false);
    }
  }, [enabled, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
  };
}

