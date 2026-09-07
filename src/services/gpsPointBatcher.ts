/**
 * GPS Point Batcher - Frontend batching for GPS points
 * Collects GPS points locally and sends them in batches to shadow worker
 * Reduces network overhead and backend load significantly
 * Production-grade with persistence, offline support, and error recovery
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShadowWorkerService, GPSPoint } from './ShadowWorkerService';
import { shadowWorkerCircuitBreaker } from './circuitBreaker';
import { networkMonitor } from './networkMonitor';
import { appStateManager } from './appStateManager';

interface BatchedGPSPoint extends GPSPoint {
  userId: string;
}

interface BatchConfig {
  maxBatchSize: number; // Maximum points per batch
  maxWaitTime: number; // Maximum time to wait before sending batch (ms)
  minBatchSize: number; // Minimum points before sending (unless timeout)
}

const DEFAULT_CONFIG: BatchConfig = {
  maxBatchSize: 20, // Send up to 20 points per batch
  maxWaitTime: 5000, // Wait max 5 seconds before sending
  minBatchSize: 5, // Send when we have 5 points (unless timeout)
};

export class GPSPointBatcher {
  private queue: BatchedGPSPoint[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isFlushing: boolean = false;
  private config: BatchConfig;
  private pendingFlush: Promise<void> | null = null;
  private readonly STORAGE_KEY = 'bikera_gps_queue';
  private readonly MAX_QUEUE_SIZE = 1000; // Prevent memory issues
  private readonly MAX_RETRIES = 3;
  private retryCount: number = 0;
  private networkListener: (() => void) | null = null;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize batcher - load persisted queue and setup network listener
   * Cross-platform: Works on iOS, Android, and Web
   */
  private async initialize(): Promise<void> {
    // Load persisted queue from storage
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.queue = parsed;
          console.log(`[GPSPointBatcher] Loaded ${parsed.length} points from storage`);
          // Try to flush on startup if we have points and network is available
          // Use setTimeout to avoid blocking initialization
          setTimeout(() => {
            if (networkMonitor.isConnected()) {
              this.flush().catch((error) => {
                console.error('[GPSPointBatcher] Failed to flush on startup:', error);
              });
            }
          }, 1000);
        }
      }
    } catch (error) {
      // AsyncStorage might fail on some platforms - log but don't crash
      console.warn('[GPSPointBatcher] Failed to load persisted queue (non-critical):', error);
    }

    // Listen for network changes (with error handling)
    try {
      this.networkListener = () => {
        if (networkMonitor.isConnected() && this.queue.length > 0 && appStateManager.isActive()) {
          // Network came back and app is active, try to flush
          this.flush().catch((error) => {
            console.error('[GPSPointBatcher] Failed to flush on network reconnect:', error);
          });
        }
      };
      networkMonitor.on('online', this.networkListener);

      // Listen for app state changes - flush when app comes to foreground
      appStateManager.on('foreground', () => {
        if (networkMonitor.isConnected() && this.queue.length > 0) {
          this.flush().catch((error) => {
            console.error('[GPSPointBatcher] Failed to flush on foreground:', error);
          });
        }
      });
    } catch (error) {
      // Event listeners might fail during initialization - log but don't crash
      console.warn('[GPSPointBatcher] Failed to setup event listeners (non-critical):', error);
    }
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue(): Promise<void> {
    try {
      // Only persist if queue is not too large
      if (this.queue.length > 0 && this.queue.length <= this.MAX_QUEUE_SIZE) {
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
      } else if (this.queue.length === 0) {
        // Clear storage if queue is empty
        await AsyncStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('[GPSPointBatcher] Failed to persist queue:', error);
    }
  }

  /**
   * Add a GPS point to the batch queue
   * Automatically sends when batch is full or timeout is reached
   * Production-grade: handles queue limits, persistence, and offline mode
   */
  async addPoint(userId: string, point: GPSPoint): Promise<void> {
    // Prevent queue from growing too large
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      console.warn(`[GPSPointBatcher] Queue full (${this.MAX_QUEUE_SIZE}), dropping oldest point`);
      this.queue.shift(); // Remove oldest
    }

    this.queue.push({ ...point, userId });

    // Persist queue (async, don't await)
    this.persistQueue().catch((error) => {
      console.error('[GPSPointBatcher] Failed to persist queue:', error);
    });

    // If batch is full, flush immediately (if online)
    if (this.queue.length >= this.config.maxBatchSize) {
      if (networkMonitor.isConnected()) {
        await this.flush();
      }
      return;
    }

    // If we have minimum points and no timer, start one (only if online)
    if (
      this.queue.length >= this.config.minBatchSize &&
      !this.flushTimer &&
      networkMonitor.isConnected()
    ) {
      this.scheduleFlush();
    }
  }

  /**
   * Schedule a flush after maxWaitTime
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch((error) => {
        console.error('[GPSPointBatcher] Scheduled flush failed:', error);
      });
    }, this.config.maxWaitTime);
  }

  /**
   * Flush all queued points to shadow worker
   * Sends points in batches to avoid overwhelming the backend
   * Production-grade: handles offline mode, circuit breaker, retries
   */
  async flush(): Promise<void> {
    // If already flushing, wait for current flush to complete
    if (this.isFlushing && this.pendingFlush) {
      return this.pendingFlush;
    }

    // Check network connectivity
    if (!networkMonitor.isConnected()) {
      console.log('[GPSPointBatcher] Offline, queueing points for later');
      await this.persistQueue();
      return;
    }

    // Check circuit breaker
    if (shadowWorkerCircuitBreaker.getState() === 'OPEN') {
      console.warn('[GPSPointBatcher] Circuit breaker is OPEN, queueing points');
      await this.persistQueue();
      return;
    }

    // Clear timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // If queue is empty, nothing to do
    if (this.queue.length === 0) {
      await this.persistQueue(); // Clear storage
      return;
    }

    // Mark as flushing
    this.isFlushing = true;
    const pointsToSend = [...this.queue];
    this.queue = []; // Clear queue immediately
    await this.persistQueue(); // Update storage

    // Create flush promise with retry logic
    this.pendingFlush = this.sendBatchWithRetry(pointsToSend)
      .then(() => {
        // Success - reset retry count
        this.retryCount = 0;
        // Clear storage on success
        this.persistQueue();
      })
      .catch(async (error) => {
        // Failure - put points back in queue for retry
        console.error('[GPSPointBatcher] Flush failed, re-queueing points:', error);
        this.queue = [...pointsToSend, ...this.queue];
        // Limit queue size
        if (this.queue.length > this.MAX_QUEUE_SIZE) {
          this.queue = this.queue.slice(-this.MAX_QUEUE_SIZE);
        }
        await this.persistQueue();
        throw error;
      })
      .finally(() => {
        this.isFlushing = false;
        this.pendingFlush = null;
      });

    return this.pendingFlush;
  }

  /**
   * Send batch with retry logic
   */
  private async sendBatchWithRetry(points: BatchedGPSPoint[]): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Use circuit breaker
        await shadowWorkerCircuitBreaker.execute(async () => {
          await this.sendBatch(points);
        });
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[GPSPointBatcher] Attempt ${attempt + 1}/${this.MAX_RETRIES} failed:`, error);

        // Wait before retry (exponential backoff)
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Failed to send batch after retries');
  }

  /**
   * Send a batch of points to shadow worker
   * Groups by userId and sends in parallel batches
   */
  private async sendBatch(points: BatchedGPSPoint[]): Promise<void> {
    if (points.length === 0) return;

    // Group points by userId
    const pointsByUser = new Map<string, GPSPoint[]>();
    for (const point of points) {
      if (!pointsByUser.has(point.userId)) {
        pointsByUser.set(point.userId, []);
      }
      const { userId, ...gpsPoint } = point;
      pointsByUser.get(point.userId)!.push(gpsPoint);
    }

    // Send batches for each user in parallel
    const sendPromises: Promise<void>[] = [];

    for (const [userId, userPoints] of pointsByUser.entries()) {
      // Split into chunks of maxBatchSize
      for (let i = 0; i < userPoints.length; i += this.config.maxBatchSize) {
        const chunk = userPoints.slice(i, i + this.config.maxBatchSize);
        
        // Send chunk (fire and forget for performance)
        const sendPromise = this.sendChunk(userId, chunk).catch((error) => {
          console.error(`[GPSPointBatcher] Failed to send batch for user ${userId}:`, error);
          // Don't throw - allow other batches to continue
        });

        sendPromises.push(sendPromise);
      }
    }

    // Wait for all batches to be sent (but don't fail if some fail)
    await Promise.allSettled(sendPromises);
  }

  /**
   * Send a chunk of points for a single user
   * Uses shadow worker's batch method for better performance
   */
  private async sendChunk(userId: string, points: GPSPoint[]): Promise<void> {
    try {
      // Use batch method for better performance
      await ShadowWorkerService.sendGPSPointsBatch(userId, points);
    } catch (error) {
      // If batch fails, fallback to individual sends
      console.warn(`[GPSPointBatcher] Batch send failed, falling back to individual sends:`, error);
      const sendPromises = points.map((point) =>
        ShadowWorkerService.sendGPSPoint(userId, point).catch((error) => {
          // Log but don't throw - individual point failures shouldn't block others
          console.warn(`[GPSPointBatcher] Failed to send point:`, error);
          return null;
        })
      );
      await Promise.allSettled(sendPromises);
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if currently flushing
   */
  isCurrentlyFlushing(): boolean {
    return this.isFlushing;
  }

  /**
   * Force immediate flush and wait for completion
   */
  async forceFlush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Clear all queued points (use with caution)
   */
  async clear(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.queue = [];
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('[GPSPointBatcher] Failed to clear storage:', error);
    }
  }

  /**
   * Cleanup - remove listeners
   */
  cleanup(): void {
    if (this.networkListener) {
      networkMonitor.off('online', this.networkListener);
      this.networkListener = null;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// Singleton instance for app-wide use
let globalBatcher: GPSPointBatcher | null = null;

/**
 * Get the global GPS point batcher instance
 */
export function getGPSPointBatcher(): GPSPointBatcher {
  if (!globalBatcher) {
    globalBatcher = new GPSPointBatcher();
  }
  return globalBatcher;
}

/**
 * Reset the global batcher (useful for testing or cleanup)
 */
export async function resetGPSPointBatcher(): Promise<void> {
  if (globalBatcher) {
    globalBatcher.cleanup();
    await globalBatcher.clear();
    globalBatcher = null;
  }
}
