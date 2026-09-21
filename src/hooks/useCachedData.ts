// React hook for fetching data with caching
// Stale-while-revalidate for instant paint, then live refresh on mutation / focus / foreground

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { dataCache, type CacheChangeEvent } from '../services/dataCache';
import { requestDeduplicator } from '../services/requestDeduplicator';
import { appStateManager } from '../services/appStateManager';

interface UseCachedDataOptions<T> {
  type: string;
  identifier?: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  skipCache?: boolean;
  customTtl?: number;
  refetchOnFocus?: boolean;
  refetchOnForeground?: boolean;
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

function eventMatchesHook(event: CacheChangeEvent, type: string, identifier?: string): boolean {
  if (event.kind === 'clear') return true;
  if (event.kind === 'invalidateType') return event.type === type;
  if (event.kind === 'invalidate') {
    if (event.type !== type) return false;
    if (!event.identifier || !identifier) return true;
    return identifier === event.identifier || identifier.startsWith(`${event.identifier}:`);
  }
  return false;
}

/**
 * Hook for fetching data with automatic caching.
 * Shows cached data immediately, then refreshes when:
 * - cached data is stale
 * - this cache entry is invalidated after a mutation
 * - the screen is focused again
 * - the app returns to the foreground while this screen is visible
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
  refetchOnFocus = true,
  refetchOnForeground = true,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const dataRef = useRef<T | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  isFocusedRef.current = isFocused;

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
      if (!forceRefresh && !skipCache) {
        const cached = await dataCache.get<T>(type, identifier);
        if (cached.data !== null) {
          if (mountedRef.current) {
            dataRef.current = cached.data;
            setData(cached.data);
            setLoading(false);
            setError(null);
          }

          if (cached.isStale) {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log(`[CACHE] Data stale for ${type}, refreshing in background...`);
            }
            requestDeduplicator
              .execute(key, fetcher, 25000)
              .then((freshData) => {
                if (mountedRef.current) {
                  dataRef.current = freshData;
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

      if (mountedRef.current && dataRef.current == null) {
        setLoading(true);
        setError(null);
      }

      const freshData = await requestDeduplicator.execute(key, fetcher, 25000);

      if (mountedRef.current) {
        dataRef.current = freshData;
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
  }, [type, identifier]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !refetchOnFocus) return;
      void fetchData(false);
    }, [enabled, refetchOnFocus, fetchData])
  );

  useEffect(() => {
    if (!enabled || !refetchOnForeground) return undefined;
    const onForeground = () => {
      if (!isFocusedRef.current) return;
      void fetchData(false);
    };
    appStateManager.on('foreground', onForeground);
    return () => {
      appStateManager.off('foreground', onForeground);
    };
  }, [enabled, refetchOnForeground, fetchData]);

  useEffect(() => {
    if (!enabled) return undefined;
    return dataCache.subscribe((event) => {
      if (!eventMatchesHook(event, type, identifier)) return;
      if (!isFocusedRef.current) return;
      void fetchData(true);
    });
  }, [enabled, type, identifier, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
  };
}
