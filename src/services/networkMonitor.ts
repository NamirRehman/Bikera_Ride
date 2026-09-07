/**
 * Network Monitor
 * Monitors network state and provides connectivity status
 * Production-grade network awareness
 * Cross-platform: Works on iOS, Android, and Web
 * Uses fetch-based detection if NetInfo is not available
 */

import { EventEmitter } from '../utils/EventEmitter';

// Try to import NetInfo, but make it optional
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  console.warn('[NetworkMonitor] NetInfo not available, using fallback detection');
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: any;
}

class NetworkMonitor extends EventEmitter {
  private currentState: NetworkState | null = null;
  private unsubscribe: (() => void) | null = null;
  private isMonitoring: boolean = false;

  constructor() {
    super();
  }

  /**
   * Start monitoring network state
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    if (NetInfo) {
      // Use NetInfo if available
      NetInfo.fetch().then((state: any) => {
        this.updateState(state);
      });

      // Subscribe to changes
      this.unsubscribe = NetInfo.addEventListener((state: any) => {
        this.updateState(state);
      });
    } else {
      // Fallback: Use periodic fetch checks
      this.checkConnectivity();
      const interval = setInterval(() => {
        this.checkConnectivity();
      }, 5000); // Check every 5 seconds

      this.unsubscribe = () => {
        clearInterval(interval);
      };
    }
  }

  /**
   * Check connectivity using fetch (fallback method)
   * Cross-platform: Works on iOS, Android, and Web
   */
  private async checkConnectivity(): Promise<void> {
    try {
      // Try to fetch a small resource with timeout
      // Use a reliable endpoint that works across platforms
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Use a CDN endpoint that's reliable across all platforms
      const testUrl = 'https://www.google.com/favicon.ico';
      
      await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
        // Add headers for better compatibility
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);
      this.updateState({
        isConnected: true,
        isInternetReachable: true,
        type: 'unknown',
        details: null,
      });
    } catch (error) {
      // Network error - assume offline
      this.updateState({
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
        details: null,
      });
    }
  }

  /**
   * Stop monitoring network state
   */
  stop(): void {
    if (this.unsubscribe) {
      if (typeof this.unsubscribe === 'function') {
        this.unsubscribe();
      }
      this.unsubscribe = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Update network state and emit events
   */
  private updateState(state: any): void {
    const newState: NetworkState = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      type: state.type ?? 'unknown',
      details: state.details ?? null,
    };

    const wasConnected = this.currentState?.isConnected ?? false;
    const isNowConnected = newState.isConnected;

    this.currentState = newState;

    // Emit state change
    this.emit('change', newState);

    // Emit specific events
    if (!wasConnected && isNowConnected) {
      this.emit('online');
    } else if (wasConnected && !isNowConnected) {
      this.emit('offline');
    }
  }

  /**
   * Get current network state
   */
  getState(): NetworkState | null {
    return this.currentState;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.currentState?.isConnected ?? false;
  }

  /**
   * Check if internet is reachable
   */
  isInternetReachable(): boolean {
    if (this.currentState?.isInternetReachable === null) {
      return this.currentState?.isConnected ?? false;
    }
    return this.currentState?.isInternetReachable ?? false;
  }

  /**
   * Wait for network connection
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.removeListener('online', onOnline);
        resolve(false);
      }, timeout);

      const onOnline = () => {
        clearTimeout(timeoutId);
        this.removeListener('online', onOnline);
        resolve(true);
      };

      this.once('online', onOnline);
    });
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor();

// Auto-start monitoring
networkMonitor.start();
