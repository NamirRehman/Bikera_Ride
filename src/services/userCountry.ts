import AsyncStorage from '@react-native-async-storage/async-storage';
import { Principal } from '@dfinity/principal';
import { getBikeraUserActor } from '../utils/actors';
import { dataCache } from './dataCache';

const STORAGE_COUNTRY = 'bikera_country_v1';
const BIO_TAG_RE = /^\[([A-Z]{2})\]\s*/i;

export const COUNTRY_OPTIONS: { code: string; name: string }[] = [
  {
    "code": "AF",
    "name": "Afghanistan"
  },
  {
    "code": "AL",
    "name": "Albania"
  },
  {
    "code": "DZ",
    "name": "Algeria"
  },
  {
    "code": "AD",
    "name": "Andorra"
  },
  {
    "code": "AO",
    "name": "Angola"
  },
  {
    "code": "AG",
    "name": "Antigua and Barbuda"
  },
  {
    "code": "AR",
    "name": "Argentina"
  },
  {
    "code": "AM",
    "name": "Armenia"
  },
  {
    "code": "AU",
    "name": "Australia"
  },
  {
    "code": "AT",
    "name": "Austria"
  },
  {
    "code": "AZ",
    "name": "Azerbaijan"
  },
  {
    "code": "BS",
    "name": "Bahamas"
  },
  {
    "code": "BH",
    "name": "Bahrain"
  },
  {
    "code": "BD",
    "name": "Bangladesh"
  },
  {
    "code": "BB",
    "name": "Barbados"
  },
  {
    "code": "BY",
    "name": "Belarus"
  },
  {
    "code": "BE",
    "name": "Belgium"
  },
  {
    "code": "BZ",
    "name": "Belize"
  },
  {
    "code": "BJ",
    "name": "Benin"
  },
  {
    "code": "BT",
    "name": "Bhutan"
  },
  {
    "code": "BO",
    "name": "Bolivia"
  },
  {
    "code": "BA",
    "name": "Bosnia and Herzegovina"
  },
  {
    "code": "BW",
    "name": "Botswana"
  },
  {
    "code": "BR",
    "name": "Brazil"
  },
  {
    "code": "BN",
    "name": "Brunei"
  },
  {
    "code": "BG",
    "name": "Bulgaria"
  },
  {
    "code": "BF",
    "name": "Burkina Faso"
  },
  {
    "code": "BI",
    "name": "Burundi"
  },
  {
    "code": "CV",
    "name": "Cabo Verde"
  },
  {
    "code": "KH",
    "name": "Cambodia"
  },
  {
    "code": "CM",
    "name": "Cameroon"
  },
  {
    "code": "CA",
    "name": "Canada"
  },
  {
    "code": "CF",
    "name": "Central African Republic"
  },
  {
    "code": "TD",
    "name": "Chad"
  },
  {
    "code": "CL",
    "name": "Chile"
  },
  {
    "code": "CN",
    "name": "China"
  },
  {
    "code": "CO",
    "name": "Colombia"
  },
  {
    "code": "KM",
    "name": "Comoros"
  },
  {
    "code": "CG",
    "name": "Congo"
  },
  {
    "code": "CD",
    "name": "Congo (DRC)"
  },
  {
    "code": "CR",
    "name": "Costa Rica"
  },
  {
    "code": "HR",
    "name": "Croatia"
  },
  {
    "code": "CU",
    "name": "Cuba"
  },
  {
    "code": "CY",
    "name": "Cyprus"
  },
  {
    "code": "CZ",
    "name": "Czech Republic"
  },
  {
    "code": "DK",
    "name": "Denmark"
  },
  {
    "code": "DJ",
    "name": "Djibouti"
  },
  {
    "code": "DM",
    "name": "Dominica"
  },
  {
    "code": "DO",
    "name": "Dominican Republic"
  },
  {
    "code": "EC",
    "name": "Ecuador"
  },
  {
    "code": "EG",
    "name": "Egypt"
  },
  {
    "code": "SV",
    "name": "El Salvador"
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea"
  },
  {
    "code": "ER",
    "name": "Eritrea"
  },
  {
    "code": "EE",
    "name": "Estonia"
  },
  {
    "code": "SZ",
    "name": "Eswatini"
  },
  {
    "code": "ET",
    "name": "Ethiopia"
  },
  {
    "code": "FJ",
    "name": "Fiji"
  },
  {
    "code": "FI",
    "name": "Finland"
  },
  {
    "code": "FR",
    "name": "France"
  },
  {
    "code": "GA",
    "name": "Gabon"
  },
  {
    "code": "GM",
    "name": "Gambia"
  },
  {
    "code": "GE",
    "name": "Georgia"
  },
  {
    "code": "DE",
    "name": "Germany"
  },
  {
    "code": "GH",
    "name": "Ghana"
  },
  {
    "code": "GR",
    "name": "Greece"
  },
  {
    "code": "GD",
    "name": "Grenada"
  },
  {
    "code": "GT",
    "name": "Guatemala"
  },
  {
    "code": "GN",
    "name": "Guinea"
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau"
  },
  {
    "code": "GY",
    "name": "Guyana"
  },
  {
    "code": "HT",
    "name": "Haiti"
  },
  {
    "code": "HN",
    "name": "Honduras"
  },
  {
    "code": "HK",
    "name": "Hong Kong"
  },
  {
    "code": "HU",
    "name": "Hungary"
  },
  {
    "code": "IS",
    "name": "Iceland"
  },
  {
    "code": "IN",
    "name": "India"
  },
  {
    "code": "ID",
    "name": "Indonesia"
  },
  {
    "code": "IR",
    "name": "Iran"
  },
  {
    "code": "IQ",
    "name": "Iraq"
  },
  {
    "code": "IE",
    "name": "Ireland"
  },
  {
    "code": "IL",
    "name": "Israel"
  },
  {
    "code": "IT",
    "name": "Italy"
  },
  {
    "code": "CI",
    "name": "Ivory Coast"
  },
  {
    "code": "JM",
    "name": "Jamaica"
  },
  {
    "code": "JP",
    "name": "Japan"
  },
  {
    "code": "JO",
    "name": "Jordan"
  },
  {
    "code": "KZ",
    "name": "Kazakhstan"
  },
  {
    "code": "KE",
    "name": "Kenya"
  },
  {
    "code": "KW",
    "name": "Kuwait"
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan"
  },
  {
    "code": "LA",
    "name": "Laos"
  },
  {
    "code": "LV",
    "name": "Latvia"
  },
  {
    "code": "LB",
    "name": "Lebanon"
  },
  {
    "code": "LS",
    "name": "Lesotho"
  },
  {
    "code": "LR",
    "name": "Liberia"
  },
  {
    "code": "LY",
    "name": "Libya"
  },
  {
    "code": "LI",
    "name": "Liechtenstein"
  },
  {
    "code": "LT",
    "name": "Lithuania"
  },
  {
    "code": "LU",
    "name": "Luxembourg"
  },
  {
    "code": "MG",
    "name": "Madagascar"
  },
  {
    "code": "MW",
    "name": "Malawi"
  },
  {
    "code": "MY",
    "name": "Malaysia"
  },
  {
    "code": "MV",
    "name": "Maldives"
  },
  {
    "code": "ML",
    "name": "Mali"
  },
  {
    "code": "MT",
    "name": "Malta"
  },
  {
    "code": "MR",
    "name": "Mauritania"
  },
  {
    "code": "MU",
    "name": "Mauritius"
  },
  {
    "code": "MX",
    "name": "Mexico"
  },
  {
    "code": "MD",
    "name": "Moldova"
  },
  {
    "code": "MC",
    "name": "Monaco"
  },
  {
    "code": "MN",
    "name": "Mongolia"
  },
  {
    "code": "ME",
    "name": "Montenegro"
  },
  {
    "code": "MA",
    "name": "Morocco"
  },
  {
    "code": "MZ",
    "name": "Mozambique"
  },
  {
    "code": "MM",
    "name": "Myanmar"
  },
  {
    "code": "NA",
    "name": "Namibia"
  },
  {
    "code": "NP",
    "name": "Nepal"
  },
  {
    "code": "NL",
    "name": "Netherlands"
  },
  {
    "code": "NZ",
    "name": "New Zealand"
  },
  {
    "code": "NI",
    "name": "Nicaragua"
  },
  {
    "code": "NE",
    "name": "Niger"
  },
  {
    "code": "NG",
    "name": "Nigeria"
  },
  {
    "code": "MK",
    "name": "North Macedonia"
  },
  {
    "code": "NO",
    "name": "Norway"
  },
  {
    "code": "OM",
    "name": "Oman"
  },
  {
    "code": "PK",
    "name": "Pakistan"
  },
  {
    "code": "PS",
    "name": "Palestine"
  },
  {
    "code": "PA",
    "name": "Panama"
  },
  {
    "code": "PG",
    "name": "Papua New Guinea"
  },
  {
    "code": "PY",
    "name": "Paraguay"
  },
  {
    "code": "PE",
    "name": "Peru"
  },
  {
    "code": "PH",
    "name": "Philippines"
  },
  {
    "code": "PL",
    "name": "Poland"
  },
  {
    "code": "PT",
    "name": "Portugal"
  },
  {
    "code": "QA",
    "name": "Qatar"
  },
  {
    "code": "RO",
    "name": "Romania"
  },
  {
    "code": "RU",
    "name": "Russia"
  },
  {
    "code": "RW",
    "name": "Rwanda"
  },
  {
    "code": "SA",
    "name": "Saudi Arabia"
  },
  {
    "code": "SN",
    "name": "Senegal"
  },
  {
    "code": "RS",
    "name": "Serbia"
  },
  {
    "code": "SG",
    "name": "Singapore"
  },
  {
    "code": "SK",
    "name": "Slovakia"
  },
  {
    "code": "SI",
    "name": "Slovenia"
  },
  {
    "code": "SO",
    "name": "Somalia"
  },
  {
    "code": "ZA",
    "name": "South Africa"
  },
  {
    "code": "KR",
    "name": "South Korea"
  },
  {
    "code": "ES",
    "name": "Spain"
  },
  {
    "code": "LK",
    "name": "Sri Lanka"
  },
  {
    "code": "SD",
    "name": "Sudan"
  },
  {
    "code": "SE",
    "name": "Sweden"
  },
  {
    "code": "CH",
    "name": "Switzerland"
  },
  {
    "code": "SY",
    "name": "Syria"
  },
  {
    "code": "TW",
    "name": "Taiwan"
  },
  {
    "code": "TJ",
    "name": "Tajikistan"
  },
  {
    "code": "TZ",
    "name": "Tanzania"
  },
  {
    "code": "TH",
    "name": "Thailand"
  },
  {
    "code": "TG",
    "name": "Togo"
  },
  {
    "code": "TN",
    "name": "Tunisia"
  },
  {
    "code": "TR",
    "name": "Turkey"
  },
  {
    "code": "UG",
    "name": "Uganda"
  },
  {
    "code": "UA",
    "name": "Ukraine"
  },
  {
    "code": "AE",
    "name": "United Arab Emirates"
  },
  {
    "code": "GB",
    "name": "United Kingdom"
  },
  {
    "code": "US",
    "name": "United States"
  },
  {
    "code": "UY",
    "name": "Uruguay"
  },
  {
    "code": "UZ",
    "name": "Uzbekistan"
  },
  {
    "code": "VE",
    "name": "Venezuela"
  },
  {
    "code": "VN",
    "name": "Vietnam"
  },
  {
    "code": "YE",
    "name": "Yemen"
  },
  {
    "code": "ZM",
    "name": "Zambia"
  },
  {
    "code": "ZW",
    "name": "Zimbabwe"
  }
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
