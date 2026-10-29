/**
 * Cold-start gate: only Home critical data may hit the network until unlock.
 * Other screens can paint from cache, but must not fetch until Home is ready
 * AND the user opens that screen.
 */

type Listener = () => void;

class StartupGateService {
  private unlocked = false;
  private started = false;
  private listeners = new Set<Listener>();
  private failSafeTimer: ReturnType<typeof setTimeout> | null = null;

  isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Call once when authenticated session is restored / app enters main UI. */
  start(failSafeMs = 3500): void {
    if (this.started) return;
    this.started = true;
    this.failSafeTimer = setTimeout(() => this.unlock('failsafe'), failSafeMs);
  }

  unlock(_reason: string = 'home'): void {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.failSafeTimer) {
      clearTimeout(this.failSafeTimer);
      this.failSafeTimer = null;
    }
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[STARTUP] Gate unlocked (${_reason})`);
    }
    // Next turn: let the screen that unlocked the gate paint before other
    // screens start their own network work on the same JS thread.
    setTimeout(() => {
      this.listeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // ignore
        }
      });
    }, 0);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.unlocked) {
      try {
        listener();
      } catch {
        // ignore
      }
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Test / logout reset */
  reset(): void {
    this.unlocked = false;
    this.started = false;
    if (this.failSafeTimer) {
      clearTimeout(this.failSafeTimer);
      this.failSafeTimer = null;
    }
  }
}

export const startupGate = new StartupGateService();
