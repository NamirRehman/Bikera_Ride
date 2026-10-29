/**
 * Request Deduplicator
 * Prevents duplicate API calls by caching in-flight requests.
 * Always enforces a hard timeout so UI never waits forever.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  ttl: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly REQUEST_TIMEOUT = 12_000;
  private readonly CLEANUP_INTERVAL = 60_000;

  constructor() {
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.REQUEST_TIMEOUT
  ): Promise<T> {
    const existing = this.pendingRequests.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < existing.ttl) {
        return existing.promise;
      }
      this.pendingRequests.delete(key);
    }

    const promise = Promise.race([
      requestFn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`[DEDUP] Request timed out after ${ttl}ms: ${key}`));
        }, ttl);
      }),
    ])
      .then((result) => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      ttl,
    });

    return promise;
  }

  isPending(key: string): boolean {
    const existing = this.pendingRequests.get(key);
    if (!existing) return false;
    return Date.now() - existing.timestamp < existing.ttl;
  }

  cancel(key: string): void {
    this.pendingRequests.delete(key);
  }

  clear(): void {
    this.pendingRequests.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp >= request.ttl) {
        this.pendingRequests.delete(key);
      }
    }
  }

  getStats(): { pendingCount: number; keys: string[] } {
    return {
      pendingCount: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys()),
    };
  }
}

export const requestDeduplicator = new RequestDeduplicator();

export function createRequestKey(prefix: string, ...args: any[]): string {
  const argsStr = args
    .map((arg) => {
      if (arg === null || arg === undefined) return 'null';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join('|');
  return `${prefix}:${argsStr}`;
}
