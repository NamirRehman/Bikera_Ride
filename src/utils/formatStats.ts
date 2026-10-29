/** Shared display formatting for distance, XP, and iMERA (always en-US). */

export const STATS_LOCALE = 'en-US';
export const E8S_PER_TOKEN = 100_000_000;

export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'bigint') {
    const asNum = Number(value);
    return Number.isFinite(asNum) ? asNum : fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Convert ledger e8s → whole tokens without locale surprises. */
export function fromE8s(e8s: bigint | number | string | null | undefined): number {
  if (e8s === null || e8s === undefined) return 0;
  try {
    const raw = typeof e8s === 'bigint' ? e8s : BigInt(typeof e8s === 'number' ? Math.trunc(e8s) : String(e8s).split('.')[0] || '0');
    const neg = raw < 0n;
    const abs = neg ? -raw : raw;
    const digits = abs.toString().padStart(9, '0');
    const whole = digits.slice(0, -8) || '0';
    const frac = digits.slice(-8);
    const n = Number(`${whole}.${frac}`);
    return neg ? -n : n;
  } catch {
    return toFiniteNumber(e8s) / E8S_PER_TOKEN;
  }
}

/**
 * Normalizes any iMERA amount into whole tokens.
 * Handles:
 * - bigint (always ledger e8s, 10^8 = 1 token)
 * - number/string >= 10,000,000 (detected as e8s representation)
 * - number/string < 10,000,000 (already in whole tokens)
 */
export function normalizeImera(amount: bigint | number | string | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  if (typeof amount === 'bigint') {
    return fromE8s(amount);
  }
  const n = toFiniteNumber(amount);
  if (Math.abs(n) >= 10_000_000) {
    return fromE8s(n);
  }
  return n;
}

/** Lifetime XP — integer with thousands separators (never looks fractional). */
export function formatXP(xp: number | bigint | null | undefined): string {
  const n = Math.trunc(toFiniteNumber(xp));
  return n.toLocaleString(STATS_LOCALE);
}

/**
 * iMERA amount formatted cleanly with standard decimals.
 * Automatically handles both whole token amounts and raw e8s representations.
 * Hero / cards: 2 decimals. Wallet detail may pass maxFractionDigits: 4.
 */
export function formatImera(
  amount: bigint | number | string | null | undefined,
  opts?: { maxFractionDigits?: number; minFractionDigits?: number }
): string {
  const n = normalizeImera(amount);
  const maxFractionDigits = opts?.maxFractionDigits ?? 2;
  const minFractionDigits = opts?.minFractionDigits ?? Math.min(2, maxFractionDigits);
  return n.toLocaleString(STATS_LOCALE, {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  });
}

export function formatImeraFromE8s(
  e8s: bigint | number | string | null | undefined,
  opts?: { maxFractionDigits?: number; minFractionDigits?: number }
): string {
  return formatImera(fromE8s(e8s), opts);
}

/** Distance in km — fixed decimals, no thousands locale tricks. */
export function formatDistanceKm(km: number | null | undefined, digits = 1): string {
  const n = toFiniteNumber(km);
  return n.toFixed(digits);
}

export function formatDistanceKmLabel(km: number | null | undefined, digits = 1): string {
  return `${formatDistanceKm(km, digits)} km`;
}
