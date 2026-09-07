import { Principal } from '@dfinity/principal';
import { getBikeraUserActor, getBikeraXpActor } from '../utils/actors';
import { dataCache } from './dataCache';
import { requestDeduplicator, createRequestKey } from './requestDeduplicator';

export interface PublicUserSummary {
  userId: string;
  username: string;
  level: number;
  xp: number;
  distance: number;
  avatar?: string;
  lastActivity?: number;
}

const CACHE_TYPE = 'userPublic';
const SUMMARY_TTL_MS = 15 * 60 * 1000; // 15 minutes

const toPrincipalText = (value: string | Principal): string => {
  if (typeof value === 'string') return value;
  return value.toText();
};

const fallbackSummary = (userIdText: string): PublicUserSummary => ({
  userId: userIdText,
  username: `User${userIdText.slice(0, 8)}`,
  level: 1,
  xp: 0,
  distance: 0,
});

export async function fetchPublicUserSummary(userId: string | Principal): Promise<PublicUserSummary> {
  const userIdText = toPrincipalText(userId);
  const cached = await dataCache.get<PublicUserSummary>(CACHE_TYPE, userIdText);

  if (cached.data) {
    if (cached.isStale) {
      const key = createRequestKey('userPublic', userIdText);
      requestDeduplicator
        .execute(key, () => fetchAndCacheSummary(userIdText), 20000)
        .catch(() => null);
    }
    return cached.data;
  }

  const key = createRequestKey('userPublic', userIdText);
  return requestDeduplicator.execute(key, () => fetchAndCacheSummary(userIdText), 20000);
}

async function fetchAndCacheSummary(userIdText: string): Promise<PublicUserSummary> {
  try {
    const userActor = getBikeraUserActor();
    const xpActor = getBikeraXpActor();
    const principal = Principal.fromText(userIdText);

    const [profileResult, xpProfile] = await Promise.all([
      userActor.getUserProfile(principal).catch(() => []),
      xpActor.getPublicUserXPProfile(principal).catch(() => null),
    ]);

    const profile = Array.isArray(profileResult) && profileResult.length > 0 ? profileResult[0] : null;
    const avatarRaw = profile?.avatar;
    const avatar = Array.isArray(avatarRaw) && avatarRaw.length > 0
      ? String(avatarRaw[0])
      : (typeof avatarRaw === 'string' ? avatarRaw : undefined);

    const username = profile?.username || `User${userIdText.slice(0, 8)}`;
    const xp = xpProfile ? Number(xpProfile.totalXP || 0n) : 0;
    const level = xpProfile ? Number(xpProfile.currentLevel || 1n) : 1;
    const distance = xpProfile ? Number(xpProfile.totalDistance || 0n) / 1000 : 0;
    const lastActivity = profile?.lastActivity ? Number(profile.lastActivity) / 1_000_000 : undefined;

    const summary: PublicUserSummary = {
      userId: userIdText,
      username,
      level,
      xp,
      distance,
      avatar,
      lastActivity,
    };

    await dataCache.set(CACHE_TYPE, summary, userIdText, SUMMARY_TTL_MS);
    return summary;
  } catch (error) {
    const summary = fallbackSummary(userIdText);
    await dataCache.set(CACHE_TYPE, summary, userIdText, SUMMARY_TTL_MS);
    return summary;
  }
}
