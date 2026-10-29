import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { canisterIds, getBikeraUserActor, getBikeraXpActor, getHost } from '../utils/actors';
import { dataCache } from './dataCache';
import { requestDeduplicator, createRequestKey } from './requestDeduplicator';
import { parseCountryFromBio } from './userCountry';

export interface PublicUserSummary {
  userId: string;
  username: string;
  level: number;
  xp: number;
  distance: number;
  avatar?: string;
  lastActivity?: number;
  country?: string;
  bio?: string;
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
    const bioRaw = profile?.bio;
    const bio = Array.isArray(bioRaw) && bioRaw.length > 0
      ? String(bioRaw[0])
      : (typeof bioRaw === 'string' ? bioRaw : undefined);
    const country = parseCountryFromBio(bioRaw ?? bio);

    const summary: PublicUserSummary = {
      userId: userIdText,
      username,
      level,
      xp,
      distance,
      avatar,
      lastActivity,
      country,
      bio,
    };

    await dataCache.set(CACHE_TYPE, summary, userIdText, SUMMARY_TTL_MS);
    return summary;
  } catch (error) {
    // Do not poison the cache with long-lived empty fallbacks — Country filter
    // drops profiles without a country and would keep the board empty for 15 min.
    const summary = fallbackSummary(userIdText);
    await dataCache.set(CACHE_TYPE, summary, userIdText, 15_000);
    return summary;
  }
}

const CARD_CHUNK = 80;

const cardsIdl = ({ IDL }: { IDL: any }) => {
  const PublicCard = IDL.Record({
    userId: IDL.Principal,
    username: IDL.Text,
    avatar: IDL.Opt(IDL.Text),
    country: IDL.Opt(IDL.Text),
    totalXP: IDL.Nat,
    totalDistance: IDL.Nat,
  });
  return IDL.Service({
    getPublicCards: IDL.Func([IDL.Vec(IDL.Principal)], [IDL.Vec(PublicCard)], ['query']),
  });
};

const xpCardsIdl = ({ IDL }: { IDL: any }) => {
  const PublicXPCard = IDL.Record({
    userId: IDL.Principal,
    totalXP: IDL.Nat,
    currentLevel: IDL.Nat,
    totalDistance: IDL.Nat,
  });
  return IDL.Service({
    getPublicXPCards: IDL.Func([IDL.Vec(IDL.Principal)], [IDL.Vec(PublicXPCard)], ['query']),
  });
};

function queryActor(idl: (args: { IDL: any }) => unknown, canisterId: string) {
  const agent = new HttpAgent({
    host: getHost(),
    fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init),
  });
  return Actor.createActor(idl as never, { agent, canisterId });
}

function optText(value: unknown): string | undefined {
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

type RawPublicCard = {
  userId: Principal;
  username: string;
  avatar: unknown;
  country: unknown;
  totalXP: bigint;
  totalDistance: bigint;
};

type RawXPCard = {
  userId: Principal;
  totalXP: bigint;
  currentLevel: bigint;
  totalDistance: bigint;
};

async function fetchCardChunk(ids: Principal[]): Promise<PublicUserSummary[]> {
  const userActor = queryActor(cardsIdl, canisterIds.bikera_user) as unknown as {
    getPublicCards: (userIds: Principal[]) => Promise<RawPublicCard[]>;
  };
  const xpActor = queryActor(xpCardsIdl, canisterIds.bikera_xp) as unknown as {
    getPublicXPCards: (userIds: Principal[]) => Promise<RawXPCard[]>;
  };
  const [cards, xpCards] = await Promise.all([
    userActor.getPublicCards(ids),
    xpActor.getPublicXPCards(ids),
  ]);

  const profiles = new Map<string, RawPublicCard>();
  for (const card of cards || []) {
    profiles.set(card.userId.toText(), card);
  }
  const xpById = new Map<string, RawXPCard>();
  for (const card of xpCards || []) {
    xpById.set(card.userId.toText(), card);
  }

  return ids.map((id) => {
    const userIdText = id.toText();
    const profile = profiles.get(userIdText);
    const xp = xpById.get(userIdText);
    const fallback = fallbackSummary(userIdText);
    return {
      userId: userIdText,
      username: profile?.username || fallback.username,
      level: xp ? Number(xp.currentLevel || 1n) : 1,
      xp: xp ? Number(xp.totalXP || 0n) : Number(profile?.totalXP || 0n),
      distance: Number(xp?.totalDistance ?? profile?.totalDistance ?? 0n) / 1000,
      avatar: optText(profile?.avatar),
      country: optText(profile?.country),
    };
  });
}

/** One pair of calls for a whole list. Falls back to per-person profiles until the canisters are upgraded. */
export async function fetchPublicCards(userIds: Array<string | Principal>): Promise<PublicUserSummary[]> {
  const ids = userIds.map((id) => (typeof id === 'string' ? Principal.fromText(id) : id));
  if (ids.length === 0) return [];

  try {
    const summaries: PublicUserSummary[] = [];
    for (let i = 0; i < ids.length; i += CARD_CHUNK) {
      summaries.push(...(await fetchCardChunk(ids.slice(i, i + CARD_CHUNK))));
    }
    return summaries;
  } catch (error) {
    if (__DEV__) console.warn('[CARDS] Public card query unavailable, loading profiles one by one:', error);
    const summaries: PublicUserSummary[] = [];
    for (const id of ids) {
      summaries.push(await fetchPublicUserSummary(id));
    }
    return summaries;
  }
}
