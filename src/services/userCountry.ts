import AsyncStorage from '@react-native-async-storage/async-storage';
import { Principal } from '@dfinity/principal';
import { getBikeraUserActor } from '../utils/actors';
import { dataCache } from './dataCache';

const STORAGE_COUNTRY = 'bikera_country_v1';
const BIO_TAG_RE = /^\[([A-Z]{2})\]\s*/i;

export const COUNTRY_OPTIONS: { code: string; name: string }[] = [
  { code: 'PK', name: 'Pakistan' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'TR', name: 'Turkey' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'PH', name: 'Philippines' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
];

export function parseCountryFromBio(bio: unknown): string | undefined {
  const text = Array.isArray(bio) && bio.length > 0
    ? String(bio[0])
    : (typeof bio === 'string' ? bio : '');
  const match = text.match(BIO_TAG_RE);
  return match ? match[1].toUpperCase() : undefined;
}

export function stripCountryTag(bio: string): string {
  return bio.replace(BIO_TAG_RE, '').trim();
}

export function applyCountryTag(bio: string, countryCode: string): string {
  const cleaned = stripCountryTag(bio || '');
  const code = countryCode.toUpperCase();
  return cleaned ? `[${code}] ${cleaned}` : `[${code}]`;
}

export async function getStoredCountry(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_COUNTRY);
    return value ? value.toUpperCase() : null;
  } catch {
    return null;
  }
}

export async function setStoredCountry(countryCode: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_COUNTRY, countryCode.toUpperCase());
}

export async function clearStoredCountry(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_COUNTRY);
}

/** Remove country locally and strip the on-chain bio tag. */
export async function clearUserCountry(
  opts: { identity?: any; principalText?: string; currentBio?: string } = {}
): Promise<void> {
  await clearStoredCountry();

  const principalText =
    opts.principalText ||
    (await AsyncStorage.getItem('bikera_principal')) ||
    '';
  if (!principalText) return;

  try {
    const userActor = getBikeraUserActor({}, opts.identity);
    const p = Principal.fromText(principalText);
    let bio = opts.currentBio;
    if (bio == null) {
      const profileResult = await userActor.getUserProfile(p).catch(() => []);
      const profile = Array.isArray(profileResult) && profileResult.length > 0 ? profileResult[0] : null;
      const bioRaw = profile?.bio;
      bio = Array.isArray(bioRaw) && bioRaw.length > 0
        ? String(bioRaw[0])
        : (typeof bioRaw === 'string' ? bioRaw : '');
    }
    const nextBio = stripCountryTag(bio || '');
    await userActor.updateProfile(
      [],
      [],
      [],
      nextBio ? [nextBio] : [],
      [],
      [],
      p
    );
    await dataCache.invalidate('userPublic', principalText);
  } catch (e) {
    if (__DEV__) console.warn('[COUNTRY] Failed to clear country from profile bio:', e);
  }
}

/** Persist country locally and tag the on-chain bio so other clients can filter. */
export async function saveUserCountry(
  countryCode: string,
  opts: { identity?: any; principalText?: string; currentBio?: string } = {}
): Promise<void> {
  const code = countryCode.toUpperCase();
  await setStoredCountry(code);

  const principalText =
    opts.principalText ||
    (await AsyncStorage.getItem('bikera_principal')) ||
    '';
  if (!principalText) return;

  try {
    const userActor = getBikeraUserActor({}, opts.identity);
    const p = Principal.fromText(principalText);
    let bio = opts.currentBio;
    if (bio == null) {
      const profileResult = await userActor.getUserProfile(p).catch(() => []);
      const profile = Array.isArray(profileResult) && profileResult.length > 0 ? profileResult[0] : null;
      const bioRaw = profile?.bio;
      bio = Array.isArray(bioRaw) && bioRaw.length > 0
        ? String(bioRaw[0])
        : (typeof bioRaw === 'string' ? bioRaw : '');
    }
    const nextBio = applyCountryTag(bio || '', code);
    await userActor.updateProfile(
      [], // username
      [], // email
      [], // displayName
      [nextBio], // bio
      [], // avatar
      [], // socialLinks
      p
    );
    await dataCache.invalidate('userPublic', principalText);
  } catch (e) {
    if (__DEV__) console.warn('[COUNTRY] Failed to sync country to profile bio:', e);
  }
}

export function countryName(code: string | undefined | null): string {
  if (!code) return 'Unknown';
  return COUNTRY_OPTIONS.find((c) => c.code === code.toUpperCase())?.name || code.toUpperCase();
}

/** ISO country code → flag emoji (e.g. PK → 🇵🇰) */
export function countryFlag(code: string | undefined | null): string {
  if (!code || code.length !== 2) return '🏳️';
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  return String.fromCodePoint(
    ...[...cc].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0))
  );
}
