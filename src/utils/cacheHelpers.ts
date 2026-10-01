import { dataCache, type CacheKeyRef } from '../services/dataCache';

export async function invalidateUserCaches(principal?: string): Promise<void> {
  const cachesToInvalidate = [
    'dashboard',
    'profile',
    'stats',
    'history',
    'wallet',
    'friends',
  ];

  const keys: CacheKeyRef[] = [
    ...cachesToInvalidate.map((type) =>
      principal ? { type, identifier: principal } : { type }
    ),
    { type: 'leaderboard' },
    { type: 'userPublic' },
    { type: 'publicProfile' },
  ];

  await dataCache.invalidateMany(keys);
  if (__DEV__) console.log('[CACHE] Invalidated user caches');
}

/** After ride end: dashboard + history only (not full user purge). */
export async function invalidateAfterRide(principal?: string): Promise<void> {
  const keys: CacheKeyRef[] = principal
    ? [
        { type: 'dashboard', identifier: principal },
        { type: 'history', identifier: principal },
        { type: 'stats', identifier: principal },
        { type: 'leaderboard' },
      ]
    : [
        { type: 'dashboard' },
        { type: 'history' },
        { type: 'stats' },
        { type: 'leaderboard' },
      ];

  await dataCache.invalidateMany(keys);
  if (__DEV__) console.log('[CACHE] Invalidated after ride');
}

export async function invalidateDashboardCache(principal?: string): Promise<void> {
  await dataCache.invalidate('dashboard', principal);
  if (__DEV__) console.log('[CACHE] Invalidated dashboard cache');
}

export async function invalidateProfileCache(principal?: string): Promise<void> {
  const keys: CacheKeyRef[] = principal
    ? [
        { type: 'profile', identifier: principal },
        { type: 'dashboard', identifier: principal },
      ]
    : [{ type: 'profile' }, { type: 'dashboard' }];
  await dataCache.invalidateMany(keys);
  if (__DEV__) console.log('[CACHE] Invalidated profile cache');
}

export async function invalidateFriendsCache(principal?: string): Promise<void> {
  await dataCache.invalidate('friends', principal);
  if (__DEV__) console.log('[CACHE] Invalidated friends cache');
}
