/**
 * One place for how iMERA and XP counters are written, so balances read the same everywhere:
 * thousands separators on both, two decimals on iMERA, whole numbers for XP.
 */
export const E8S_PER_IMERA = 100_000_000;

const imeraFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const xpFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Whole-token amount, e.g. 1234.5 -> "1,234.50". */
export const formatImera = (tokens: number): string => imeraFormat.format(tokens);

/** Ledger amount in e8s, e.g. 123_450_000_000n -> "1,234.50". */
export const formatImeraE8s = (e8s: bigint | number): string => formatImera(Number(e8s) / E8S_PER_IMERA);

/** XP points, e.g. 12345 -> "12,345". */
export const formatXp = (xp: number | bigint): string => xpFormat.format(Number(xp));
