/**
 * Recognise the QR code on a partner bike. Riders are only ever sent on to a link whose host
 * belongs to a known operator, so a sticker with someone else's link cannot use Bikera as a
 * redirect.
 */
export interface QrOperator {
  id: string;
  name: string;
  website: string;
  systems: Array<{ systemId: string; city: string; countryCode: string }>;
}

/**
 * Hosts an operator's bike stickers are known to use, beyond its website's domain. Best effort:
 * extend this when an operator shares its QR format.
 */
export const QR_HOST_ALIASES: Record<string, string[]> = {
  donkey_republic: ['donkey.bike'],
  dott: ['ridedott.com'],
  lime: ['lime.bike', 'li.me'],
  nextbike: ['nextbike.net', 'nextbike.de'],
};

export type QrMatch =
  | { kind: 'partner'; url: string; operator: QrOperator }
  | { kind: 'unknown-link'; url: string; host: string }
  | { kind: 'not-a-link'; text: string };

const baseDomain = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
};

const hostMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** Every domain that identifies `operator`: its website plus any known sticker hosts. */
export const operatorDomains = (operator: QrOperator): string[] => {
  const own = baseDomain(operator.website);
  return [...(own ? [own] : []), ...(QR_HOST_ALIASES[operator.id] ?? [])];
};

export function matchBikeQr(text: string, operators: QrOperator[]): QrMatch {
  const trimmed = text.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: 'not-a-link', text: trimmed };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { kind: 'not-a-link', text: trimmed };
  const host = url.hostname.toLowerCase();
  const operator = operators.find((op) => operatorDomains(op).some((domain) => hostMatches(host, domain)));
  return operator ? { kind: 'partner', url: url.href, operator } : { kind: 'unknown-link', url: url.href, host };
}
