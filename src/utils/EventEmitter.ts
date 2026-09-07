/**
 * Cross-platform EventEmitter
 * Works on iOS, Android, and Web
 * Simple implementation that doesn't require Node.js 'events' module
 */

type EventCallback = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventCallback[]> = new Map();

  /**
   * Register an event listener
   */
  on(event: string, callback: EventCallback): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
    return this;
  }

  /**
   * Register a one-time event listener
   */
  once(event: string, callback: EventCallback): this {
    const onceCallback = (...args: any[]) => {
      callback(...args);
      this.removeListener(event, onceCallback);
    };
    return this.on(event, onceCallback);
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): boolean {
    const callbacks = this.events.get(event);
    if (!callbacks || callbacks.length === 0) {
      return false;
    }
    callbacks.forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[EventEmitter] Error in listener for event "${event}":`, error);
      }
    });
    return true;
  }

  /**
   * Remove an event listener
   */
  removeListener(event: string, callback: EventCallback): this {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        if (callbacks.length === 0) {
          this.events.delete(event);
        }
      }
    }
    return this;
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * Alias for removeListener
   */
  off(event: string, callback: EventCallback): this {
    return this.removeListener(event, callback);
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }
}
