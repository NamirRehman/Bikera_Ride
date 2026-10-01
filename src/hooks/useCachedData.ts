import { useState, useEffect, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { dataCache, type CacheChangeEvent } from '../services/dataCache';
import { requestDeduplicator } from '../services/requestDeduplicator';
import { appStateManager } from '../services/appStateManager';
import { startupGate } from '../services/startupGate';

interface UseCachedDataOptions<T> {
  type: string;
  identifier?: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  skipCache?: boolean;
  customTtl?: number;
  /** Soft refresh when screen is focused again. Default false. */
  refetchOnFocus?: boolean;
  refetchOnForeground?: boolean;
  minRefetchIntervalMs?: number;
  /**
   * bootstrap = may fetch during cold start (Home critical only).
   * normal = cache OK anytime; network only after startup gate + screen focus.
   */
  tier?: 'bootstrap' | 'normal';
  /** Override request-dedup timeout (ms). Default 12s. */
  requestTimeoutMs?: number;
}

interface UseCachedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

type CacheEnvelope<T> = { v: T };

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
  if (event.kind === 'invalidateMany') {
    return event.keys.some((key) => {
      if (key.type !== type) return false;
      if (!key.identifier || !identifier) return true;
      return identifier === key.identifier || identifier.startsWith(`${key.identifier}:`);
    });
  }
  return false;
}

function unwrapCached<T>(raw: unknown): { hit: boolean; value: T | null } {
  if (raw == null) return { hit: false, value: null };
  if (typeof raw === 'object' && raw !== null && 'v' in (raw as object)) {
    return { hit: true, value: (raw as CacheEnvelope<T>).v };
  }
  return { hit: true, value: raw as T };
}

export function useCachedData<T>({
  type,
  identifier,
  fetcher,
  enabled = true,
  onSuccess,
  onError,
  skipCache = false,
  customTtl,
  refetchOnFocus = false,
  refetchOnForeground = false,
  minRefetchIntervalMs = 90_000,
  tier = 'normal',
  requestTimeoutMs = 12_000,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const initialCached = !skipCache
    ? dataCache.peekSync<CacheEnvelope<T> | T>(type, identifier)
    : { data: null, isStale: false };
  const initialUnwrapped = unwrapCached<T>(initialCached.data);

  const [data, setData] = useState<T | null>(initialUnwrapped.hit ? initialUnwrapped.value : null);
  const [loading, setLoading] = useState(enabled && !initialUnwrapped.hit);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const dataRef = useRef<T | null>(initialUnwrapped.hit ? initialUnwrapped.value : null);
  const resolvedRef = useRef(initialUnwrapped.hit);
  const lastSuccessAtRef = useRef(initialUnwrapped.hit ? Date.now() : 0);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const fetcherRef = useRef(fetcher);
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  const minIntervalRef = useRef(minRefetchIntervalMs);
  const tierRef = useRef(tier);
  const timeoutRef = useRef(requestTimeoutMs);

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  fetcherRef.current = fetcher;
  isFocusedRef.current = isFocused;
  minIntervalRef.current = minRefetchIntervalMs;
  tierRef.current = tier;
  timeoutRef.current = requestTimeoutMs;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const withinMinInterval = useCallback(() => {
    const min = minIntervalRef.current;
    if (min <= 0 || lastSuccessAtRef.current <= 0) return false;
    return Date.now() - lastSuccessAtRef.current < min;
  }, []);

  const networkAllowed = useCallback(() => {
    if (tierRef.current === 'bootstrap') return true;
    return startupGate.isUnlocked();
  }, []);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      if (mountedRef.current) setLoading(false);
      return;
    }
    const key = cacheKey(type, identifier);

    try {
      if (!forceRefresh && !skipCache) {
        if (withinMinInterval() && resolvedRef.current) {
          if (mountedRef.current) {
            setData(dataRef.current);
            setLoading(false);
            setError(null);
          }
          return;
        }

        const cached = await dataCache.get<CacheEnvelope<T> | T>(type, identifier);
        const unwrapped = unwrapCached<T>(cached.data);
        if (unwrapped.hit) {
          if (mountedRef.current) {
            dataRef.current = unwrapped.value;
            resolvedRef.current = true;
            setData(unwrapped.value);
            setLoading(false);
            setError(null);
          }

          // Fresh enough → stop (no network on cold start for secondary screens)
          if (!cached.isStale || withinMinInterval()) {
            lastSuccessAtRef.current = Date.now();
            return;
          }

          // Stale: only background-refresh if network is allowed
          if (!networkAllowed()) {
            lastSuccessAtRef.current = Date.now();
            return;
          }

          InteractionManager.runAfterInteractions(() => {
            requestDeduplicator
              .execute(key, () => fetcherRef.current(), timeoutRef.current)
              .then((freshData) => {
                if (mountedRef.current) {
                  dataRef.current = freshData;
                  resolvedRef.current = true;
                  lastSuccessAtRef.current = Date.now();
                  setData(freshData);
                  dataCache.set(type, { v: freshData } satisfies CacheEnvelope<T>, identifier, customTtl);
                  onSuccessRef.current?.(freshData);
                }
              })
              .catch((err) => {
                if (__DEV__) console.warn(`[CACHE] Background refresh failed for ${type}:`, err);
              });
          });
          return;
        }
      }

      // No cache — need network. Block non-bootstrap until gate opens.
      if (!forceRefresh && !networkAllowed()) {
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (mountedRef.current && !resolvedRef.current) {
        setLoading(true);
        setError(null);
      }

      const runFetch = async () => {
        const freshData = await requestDeduplicator.execute(key, () => fetcherRef.current(), timeoutRef.current);
        if (mountedRef.current) {
          dataRef.current = freshData;
          resolvedRef.current = true;
          lastSuccessAtRef.current = Date.now();
          setData(freshData);
          setLoading(false);
          setError(null);
          if (!skipCache) {
            await dataCache.set(type, { v: freshData } satisfies CacheEnvelope<T>, identifier, customTtl);
          }
          onSuccessRef.current?.(freshData);
        }
      };

      if (tierRef.current === 'bootstrap') {
        await runFetch();
      } else {
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
        if (!mountedRef.current || !isFocusedRef.current) {
          if (mountedRef.current) setLoading(false);
          return;
        }
        await runFetch();
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        // Keep unresolved so revisiting the screen retries instead of staying empty
        resolvedRef.current = false;
        setError(errorObj);
        setLoading(false);
        onErrorRef.current?.(errorObj);
      }
    }
  }, [type, identifier, enabled, skipCache, customTtl, withinMinInterval, networkAllowed]);

  const refetch = useCallback(async () => {
    lastSuccessAtRef.current = 0;
    resolvedRef.current = false;
    await fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(async () => {
    await dataCache.invalidate(type, identifier);
  }, [type, identifier]);

  // When the cache key changes (e.g. Friends/Country toggles), drop stale data and refetch
  const identityKey = `${type}:${identifier ?? ''}:${enabled ? 1 : 0}`;
  const identityKeyRef = useRef(identityKey);
  useEffect(() => {
    if (identityKeyRef.current === identityKey) return;
    identityKeyRef.current = identityKey;

    const nextCached = !skipCache
      ? dataCache.peekSync<CacheEnvelope<T> | T>(type, identifier)
      : { data: null, isStale: false };
    const nextUnwrapped = unwrapCached<T>(nextCached.data);

    dataRef.current = nextUnwrapped.hit ? nextUnwrapped.value : null;
    resolvedRef.current = nextUnwrapped.hit;
    lastSuccessAtRef.current = 0;

    if (mountedRef.current) {
      setData(nextUnwrapped.hit ? nextUnwrapped.value : null);
      setError(null);
      setLoading(enabled && !nextUnwrapped.hit);
    }

    if (enabled && isFocusedRef.current) {
      void fetchData(false);
    }
  }, [identityKey, type, identifier, enabled, skipCache, fetchData]);

  // Only load while this screen is focused — never on background mount
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setLoading(false);
        return undefined;
      }

      const run = () => {
        if (!resolvedRef.current || refetchOnFocus) {
          void fetchData(false);
        } else {
          setLoading(false);
        }
      };

      if (tier === 'bootstrap' || startupGate.isUnlocked()) {
        run();
        return undefined;
      }

      // Wait for Home cold-start to finish before any other screen networks
      setLoading(false);
      return startupGate.subscribe(() => {
        if (isFocusedRef.current) run();
      });
    }, [enabled, refetchOnFocus, fetchData, tier])
  );

  useEffect(() => {
    if (!enabled || !refetchOnForeground) return undefined;
    const onForeground = () => {
      if (!isFocusedRef.current) return;
      if (tierRef.current !== 'bootstrap' && !startupGate.isUnlocked()) return;
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
      if (tierRef.current !== 'bootstrap' && !startupGate.isUnlocked()) return;
      lastSuccessAtRef.current = 0;
      void fetchData(true);
    });
  }, [enabled, type, identifier, fetchData]);

  return { data, loading, error, refetch, invalidate };
}
