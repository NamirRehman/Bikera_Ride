/**
 * Request Deduplicator
 * Prevents duplicate API calls by caching in-flight requests
 * Multiple components requesting the same data will share the same promise
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds max request time
  private readonly CLEANUP_INTERVAL = 60000; // Clean up every minute

  constructor() {
    // Periodic cleanup of stale requests
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Execute a request with deduplication
   * If the same request is already in flight, returns the existing promise
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.REQUEST_TIMEOUT
  ): Promise<T> {
    // Check if request is already in flight
    const existing = this.pendingRequests.get(key);
    if (existing) {
      const age = Date.now() - existing.timestamp;
      if (age < ttl) {
        // Request is still valid, return existing promise
        return existing.promise;
      } else {
        // Request is stale, remove it
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = requestFn()
      .then((result) => {
        // Remove from pending after completion
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Remove from pending on error too
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Check if a request is currently in flight
   */
  isPending(key: string): boolean {
    const existing = this.pendingRequests.get(key);
    if (!existing) return false;

    const age = Date.now() - existing.timestamp;
    return age < this.REQUEST_TIMEOUT;
  }

  /**
   * Cancel a pending request (removes from map, but doesn't cancel the actual request)
   */
  cancel(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Clean up stale requests
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, request] of this.pendingRequests.entries()) {
      const age = now - request.timestamp;
      if (age >= this.REQUEST_TIMEOUT) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.pendingRequests.delete(key));
  }

  /**
   * Get statistics
   */
  getStats(): { pendingCount: number; keys: string[] } {
    return {
      pendingCount: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys()),
    };
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Helper to create a deduplication key from function name and arguments
 */
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
