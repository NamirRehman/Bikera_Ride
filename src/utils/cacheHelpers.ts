// Cache helper utilities for invalidating related caches
// Use these after mutations to keep UI in sync

import { dataCache } from '../services/dataCache';

/**
 * Invalidate all caches related to user data
 * Call this after profile updates, ride completion, etc.
 */
export async function invalidateUserCaches(principal?: string): Promise<void> {
  const cachesToInvalidate = [
    'dashboard',
    'profile',
    'stats',
    'history',
    'staking',
  ];

  await Promise.all(
    cachesToInvalidate.map(type => 
      principal 
        ? dataCache.invalidate(type, principal)
        : dataCache.invalidateType(type)
    )
  );

  console.log('[CACHE] Invalidated user caches');
}

/**
 * Invalidate dashboard cache specifically
 * Call after completing a ride or earning rewards
 */
export async function invalidateDashboardCache(principal?: string): Promise<void> {
  await dataCache.invalidate('dashboard', principal);
  console.log('[CACHE] Invalidated dashboard cache');
}

/**
 * Invalidate profile cache
 * Call after updating profile information
 */
export async function invalidateProfileCache(principal?: string): Promise<void> {
  await dataCache.invalidate('profile', principal);
  await dataCache.invalidate('dashboard', principal); // Dashboard also shows profile data
  console.log('[CACHE] Invalidated profile cache');
}

/**
 * Invalidate staking cache
 * Call after staking/unstaking actions
 */
export async function invalidateStakingCache(principal?: string): Promise<void> {
  await dataCache.invalidate('staking', principal);
  await dataCache.invalidate('dashboard', principal); // Dashboard shows balance
  console.log('[CACHE] Invalidated staking cache');
}

/**
 * Invalidate groups/pools cache
 * Call after joining/leaving groups
 */
export async function invalidateGroupsCache(): Promise<void> {
  await dataCache.invalidateType('groups');
  console.log('[CACHE] Invalidated groups cache');
}

/**
 * Invalidate friends cache
 * Call after friend requests, accepts, rejects, or removals
 */
export async function invalidateFriendsCache(principal?: string): Promise<void> {
  await dataCache.invalidate('friends', principal);
  console.log('[CACHE] Invalidated friends cache');
}

