/**
 * Backend Shadow Worker Service
 * Client for communicating with the backend shadow worker (GPS validation service)
 * 
 * This service sends GPS points to the backend worker for:
 * - Anti-spoofing validation
 * - Batch aggregation
 * - Cryptographic proof generation
 * 
 * Ported from BikApp for React Native environment
 */

import { SHADOW_WORKER_URL } from '../config';
import { shadowWorkerCircuitBreaker } from './circuitBreaker';
import { networkMonitor } from './networkMonitor';

// Production-optimized batch configuration
export const BATCH_CONFIG = {
    OPTIMAL_WINDOW_MS: 120000, // 2 minutes (120 seconds) - optimized for production
    MIN_WINDOW_MS: 90000,      // 90 seconds minimum
    MAX_WINDOW_MS: 150000,     // 150 seconds maximum
    MIN_POINTS: 3,             // Minimum points for valid batch
    MAX_POINTS: 100,           // Maximum points per batch (prevents spam)
    RETRY_ATTEMPTS: 3,         // Retry failed submissions
    RETRY_DELAY_MS: 1000,      // 1 second between retries
};

export interface GPSPoint {
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
}

export interface GPSPointResponse {
    success: boolean;
    batchReady?: boolean;
    processingTime?: string;
    error?: string;
}

export interface FlushBatchResponse {
    success: boolean;
    submitted: boolean;
    reason?: string;
}

export interface HealthResponse {
    status: string;
    workerId: string;
    timestamp: number;
    uptime: number;
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
    };
}

export class ShadowWorkerService {
    private static url = SHADOW_WORKER_URL;

    /**
     * Set worker URL (for testing or custom deployment)
     */
    static setUrl(url: string): void {
        this.url = url;
    }

    /**
     * Get current worker URL
     */
    static getUrl(): string {
        return this.url;
    }

    /**
     * Send batch of GPS points to backend worker (optimized)
     * Sends multiple points in a single request to reduce network overhead
     */
    static async sendGPSPointsBatch(
        userId: string,
        points: GPSPoint[]
    ): Promise<GPSPointResponse[]> {
        if (points.length === 0) {
            return [];
        }

        // Send all points in parallel (but limit concurrency to avoid overwhelming)
        const BATCH_SIZE = 10; // Send 10 points at a time
        const results: GPSPointResponse[] = [];

        for (let i = 0; i < points.length; i += BATCH_SIZE) {
            const batch = points.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(point => 
                this.sendGPSPoint(userId, point).catch(error => {
                    console.error(`[ShadowWorkerService] Failed to send point in batch:`, error);
                    return { success: false, error: String(error) } as GPSPointResponse;
                })
            );
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' } as GPSPointResponse));
        }

        return results;
    }

    /**
     * Send GPS point to backend worker with production optimizations
     * Worker will validate, batch, and submit to canister when ready
     * Includes automatic retry logic, circuit breaker, and network awareness
     */
    static async sendGPSPoint(
        userId: string,
        point: GPSPoint
    ): Promise<GPSPointResponse> {
        // Check network connectivity
        if (!networkMonitor.isConnected()) {
            throw new Error('Network not available');
        }

        // Use circuit breaker for resilience
        return shadowWorkerCircuitBreaker.execute(async () => {
            let attempts = 0;
            const maxAttempts = BATCH_CONFIG.RETRY_ATTEMPTS;

            while (attempts < maxAttempts) {
                try {
                    // Add timeout to prevent hanging
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                    try {
                        const response = await fetch(`${this.url}/gps-point`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Batch-Config': JSON.stringify({
                                    windowMs: BATCH_CONFIG.OPTIMAL_WINDOW_MS,
                                    minPoints: BATCH_CONFIG.MIN_POINTS,
                                }),
                            },
                            body: JSON.stringify({ userId, point }),
                            signal: controller.signal,
                        });

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Worker error (${response.status}): ${errorText}`);
                        }

                        const result = await response.json();
                        return result;
                    } catch (fetchError: any) {
                        clearTimeout(timeoutId);
                        if (fetchError.name === 'AbortError') {
                            throw new Error('Request timeout');
                        }
                        throw fetchError;
                    }
                } catch (error) {
                    attempts++;
                    console.error(`[ShadowWorkerService] GPS point attempt ${attempts}/${maxAttempts} failed:`, error);

                    if (attempts >= maxAttempts) {
                        throw new Error(`Failed to send GPS point after ${maxAttempts} attempts: ${error}`);
                    }

                    // Wait before retry (exponential backoff)
                    await new Promise(resolve =>
                        setTimeout(resolve, BATCH_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempts - 1))
                    );
                }
            }

            throw new Error('Unexpected error in sendGPSPoint');
        });
    }

    /**
     * Flush batch immediately with production optimizations
     * Forces immediate processing and submission to canister
     * Includes comprehensive error handling and retry logic
     */
    static async flushBatch(userId: string): Promise<FlushBatchResponse> {
        let attempts = 0;
        const maxAttempts = BATCH_CONFIG.RETRY_ATTEMPTS;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`${this.url}/flush-batch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Force-Flush': 'true', // Force immediate processing
                    },
                    body: JSON.stringify({
                        userId,
                        config: {
                            maxWaitMs: 5000, // Maximum wait for batch processing
                            validateBeforeSubmit: true, // Ensure validation before submission
                        }
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Worker error (${response.status}): ${errorText}`);
                }

                return await response.json();
            } catch (error) {
                attempts++;
                console.error(`[ShadowWorkerService] Flush attempt ${attempts}/${maxAttempts} failed:`, error);

                if (attempts >= maxAttempts) {
                    throw new Error(`Failed to flush batch after ${maxAttempts} attempts: ${error}`);
                }

                // Wait before retry
                await new Promise(resolve =>
                    setTimeout(resolve, BATCH_CONFIG.RETRY_DELAY_MS * attempts)
                );
            }
        }

        throw new Error('Unexpected error in flushBatch');
    }

    /**
     * Health check - verify worker is running (with timeout)
     */
    static async healthCheck(): Promise<HealthResponse> {
        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

            try {
                const response = await fetch(`${this.url}/health`, {
                    method: 'GET',
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`Health check failed: ${response.statusText}`);
                }

                return await response.json();
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Health check timeout');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('[ShadowWorkerService] Health check failed', error);
            throw error;
        }
    }

    /**
     * Get monitoring statistics from backend
     */
    static async getBatchStatus(userId: string): Promise<{
        batchId: string;
        pointCount: number;
        windowProgress: number; // 0-100% of batch window used
        status: 'collecting' | 'ready' | 'processing' | 'submitted';
        riskScore: number; // 0-100 fraud risk score
        recommendations: string[];
    }> {
        try {
            const response = await fetch(`${this.url}/batch-status/${userId}`, {
                method: 'GET',
                headers: {
                    'X-Production-Monitoring': 'true',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get batch status: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[ShadowWorkerService] Failed to get batch status', error);
            throw error;
        }
    }

    /**
     * Check if worker is available (with timeout to prevent hanging)
     */
    static async isAvailable(): Promise<boolean> {
        try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 3000); // 3 second timeout
            });

            await Promise.race([
                this.healthCheck(),
                timeoutPromise
            ]);
            return true;
        } catch {
            return false;
        }
    }
}
