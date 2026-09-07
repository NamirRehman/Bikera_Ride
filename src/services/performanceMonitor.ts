/**
 * Performance Monitor
 * Tracks performance metrics for production monitoring
 * Production-grade observability
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics
  private readonly FLUSH_INTERVAL = 60000; // Flush every minute

  constructor() {
    // Periodic flush (can be sent to analytics service)
    setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Record a performance metric
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Record timing metric
   */
  time(name: string, startTime: number, tags?: Record<string, string>): void {
    const duration = Date.now() - startTime;
    this.record(name, duration, tags);
  }

  /**
   * Get metrics by name
   */
  getMetrics(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name);
  }

  /**
   * Get average value for a metric
   */
  getAverage(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Flush metrics (send to analytics service)
   * Override this method to send to your analytics service
   */
  protected flush(): void {
    // In production, send metrics to analytics service
    // For now, just log summary
    if (this.metrics.length > 0) {
      const summary = this.getSummary();
      console.log('[PerformanceMonitor] Metrics summary:', summary);
      // TODO: Send to analytics service
      // analytics.track('performance_metrics', summary);
    }
  }

  /**
   * Get summary of metrics
   */
  getSummary(): Record<string, { count: number; average: number; min: number; max: number }> {
    const summary: Record<string, { count: number; average: number; min: number; max: number }> = {};

    const grouped = new Map<string, PerformanceMetric[]>();
    for (const metric of this.metrics) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric);
    }

    for (const [name, metrics] of grouped.entries()) {
      const values = metrics.map((m) => m.value);
      summary[name] = {
        count: metrics.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    return summary;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Helper to measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    performanceMonitor.time(name, startTime, { ...tags, status: 'success' });
    return result;
  } catch (error) {
    performanceMonitor.time(name, startTime, { ...tags, status: 'error' });
    throw error;
  }
}

/**
 * Helper to measure sync function execution time
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  tags?: Record<string, string>
): T {
  const startTime = Date.now();
  try {
    const result = fn();
    performanceMonitor.time(name, startTime, { ...tags, status: 'success' });
    return result;
  } catch (error) {
    performanceMonitor.time(name, startTime, { ...tags, status: 'error' });
    throw error;
  }
}
