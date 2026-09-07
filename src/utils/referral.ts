import AsyncStorage from '@react-native-async-storage/async-storage';

export const REFERRAL_STORAGE_KEY = 'bikera_referral';

export const normalizeReferralCode = (code: string): string => {
  return code.trim();
};

export const parseReferralCodeFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const ref = parsed.searchParams.get('ref') || parsed.searchParams.get('referral');
    const normalized = ref ? normalizeReferralCode(ref) : '';
    return normalized.length > 0 ? normalized : null;
  } catch {
    // Fallback to manual parse if URL parsing fails
    try {
      const queryStart = url.indexOf('?');
      if (queryStart === -1) return null;
      const query = url.slice(queryStart + 1);
      const pairs = query.split('&');
      for (const pair of pairs) {
        const [rawKey, rawValue] = pair.split('=');
        if (!rawKey) continue;
        const key = decodeURIComponent(rawKey);
        if (key !== 'ref' && key !== 'referral') continue;
        const value = rawValue ? decodeURIComponent(rawValue) : '';
        const normalized = normalizeReferralCode(value);
        return normalized.length > 0 ? normalized : null;
      }
    } catch {
      return null;
    }
  }
  return null;
};

export const getStoredReferralCode = async (): Promise<string | null> => {
  try {
    const value = await AsyncStorage.getItem(REFERRAL_STORAGE_KEY);
    const normalized = value ? normalizeReferralCode(value) : '';
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
};

export const storeReferralCode = async (code: string): Promise<void> => {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, normalized);
};

export const clearStoredReferralCode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const buildReferralLink = (referralCode: string): string => {
  const normalized = normalizeReferralCode(referralCode);
  if (!normalized) return '';
  return `bikera://?ref=${encodeURIComponent(normalized)}`;
};
