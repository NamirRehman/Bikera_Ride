/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to failing services
 * Production-grade resilience pattern
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time before attempting half-open (ms)
  successThreshold: number; // Successes needed in half-open to close
  monitoringWindow: number; // Time window for failure tracking (ms)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  resetTimeout: 30000, // Wait 30s before half-open
  successThreshold: 2, // Need 2 successes to close
  monitoringWindow: 60000, // Track failures in 60s window
};

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = []; // Timestamps of failures
  private successes: number = 0; // Successes in half-open state
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.config.resetTimeout) {
        // Transition to half-open
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
      } else {
        // Still open, reject immediately
        throw new Error(
          `Circuit breaker is OPEN. Retry after ${Math.ceil((this.config.resetTimeout - timeSinceFailure) / 1000)}s`
        );
      }
    }

    try {
      // Execute the function
      const result = await fn();

      // Success - update state
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - update state
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    // Remove old failures outside monitoring window
    const now = Date.now();
    this.failures = this.failures.filter(
      (timestamp) => now - timestamp < this.config.monitoringWindow
    );

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        // Enough successes, close the circuit
        this.state = CircuitState.CLOSED;
        this.successes = 0;
        this.failures = [];
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      if (this.failures.length > 0) {
        this.failures = [];
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failures.push(now);

    // Remove old failures outside monitoring window
    this.failures = this.failures.filter(
      (timestamp) => now - timestamp < this.config.monitoringWindow
    );

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed in half-open, immediately open
      this.state = CircuitState.OPEN;
      this.successes = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we've exceeded failure threshold
      if (this.failures.length >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime || null,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = [];
    this.successes = 0;
    this.lastFailureTime = 0;
  }

  /**
   * Force open circuit (for testing or manual control)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = Date.now();
  }
}

// Circuit breakers for different services
export const shadowWorkerCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000, // 30s
  successThreshold: 2,
});

export const canisterCircuitBreaker = new CircuitBreaker({
  failureThreshold: 10, // More tolerant for canisters
  resetTimeout: 60000, // 60s
  successThreshold: 3,
});
