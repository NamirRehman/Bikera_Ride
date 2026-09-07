/**
 * App State Manager
 * Handles app lifecycle events (foreground/background)
 * Production-grade app state awareness
 * Cross-platform: Works on iOS, Android, and Web
 */

import { Platform } from 'react-native';
import { EventEmitter } from '../utils/EventEmitter';

// Platform-specific AppState
let AppState: any = null;

if (Platform.OS !== 'web') {
  // React Native (iOS/Android)
  try {
    const RN = require('react-native');
    AppState = RN.AppState;
  } catch (e) {
    console.warn('[AppStateManager] Failed to load AppState:', e);
  }
}

class AppStateManager extends EventEmitter {
  private currentState: string = 'active';
  private subscription: any = null;
  private visibilityListener: (() => void) | null = null;

  constructor() {
    super();
    this.start();
  }

  /**
   * Start monitoring app state
   */
  start(): void {
    if (this.subscription || this.visibilityListener) {
      return;
    }

    if (Platform.OS === 'web') {
      // Web: Use document visibility API (with safety check)
      if (typeof document !== 'undefined') {
        this.currentState = document.hidden ? 'background' : 'active';
        
        const handleVisibilityChange = () => {
          const previousState = this.currentState;
          const isHidden = document.hidden;
          this.currentState = isHidden ? 'background' : 'active';

          this.emit('change', {
            previousState,
            currentState: this.currentState,
          });

          if (previousState === 'background' && this.currentState === 'active') {
            this.emit('foreground');
          } else if (previousState === 'active' && this.currentState === 'background') {
            this.emit('background');
          }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        this.visibilityListener = () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      } else {
        // SSR or no document - assume active
        this.currentState = 'active';
      }
    } else if (AppState) {
      // React Native (iOS/Android)
      this.currentState = AppState.currentState;

      // Subscribe to changes
      this.subscription = AppState.addEventListener('change', (nextAppState: string) => {
        const previousState = this.currentState;
        this.currentState = nextAppState;

        // Emit state change
        this.emit('change', {
          previousState,
          currentState: nextAppState,
        });

        // Emit specific events
        if (previousState === 'background' && nextAppState === 'active') {
          this.emit('foreground');
        } else if (previousState === 'active' && nextAppState === 'background') {
          this.emit('background');
        }
      });
    } else {
      // Fallback: Assume active if we can't detect
      this.currentState = 'active';
    }
  }

  /**
   * Stop monitoring app state
   */
  stop(): void {
    if (this.subscription) {
      if (typeof this.subscription.remove === 'function') {
        this.subscription.remove();
      }
      this.subscription = null;
    }
    if (this.visibilityListener) {
      this.visibilityListener();
      this.visibilityListener = null;
    }
  }

  /**
   * Get current app state
   */
  getState(): string {
    return this.currentState;
  }

  /**
   * Check if app is in foreground
   */
  isActive(): boolean {
    return this.currentState === 'active';
  }

  /**
   * Check if app is in background
   */
  isBackground(): boolean {
    return this.currentState === 'background';
  }
}

// Singleton instance
export const appStateManager = new AppStateManager();
