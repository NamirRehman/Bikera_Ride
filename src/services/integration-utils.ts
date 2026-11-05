import type { Identity } from '@dfinity/agent';

/** Never silently turn an owner's private query into an anonymous/public query. */
export function requireRiderIdentity(value: unknown, principal?: string): Identity {
  const identity = value as Identity | null;
  if (!identity || typeof identity.getPrincipal !== 'function') throw new Error('Sign in to view your ride data.');
  const caller = identity.getPrincipal();
  if (caller.isAnonymous() || (principal && caller.toText() !== principal)) {
    throw new Error('Your session has changed. Sign in again to view your ride data.');
  }
  return identity;
}

export async function withTimeout<T>(request: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
