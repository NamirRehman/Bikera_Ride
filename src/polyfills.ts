// React Native / Hermes polyfills required for @dfinity libraries.
// MUST be imported before any @dfinity imports.
// Do not require expo-standard-web-crypto or webcrypto-expo here:
// Metro resolves those statically and they pull missing native modules.

try {
  require('react-native-get-random-values');
} catch {}

try {
  require('react-native-url-polyfill/auto');
} catch {}

try {
  const { Buffer } = require('buffer');
  if (!(global as any).Buffer && Buffer) {
    (global as any).Buffer = Buffer;
  }
} catch {}

if (!(global as any).process) {
  (global as any).process = { env: {} } as any;
}

try {
  const g = globalThis as any;
  if (!g.localStorage) {
    const memory = new Map<string, string>();
    g.localStorage = {
      getItem: (key: string) => (memory.has(key) ? memory.get(key)! : null),
      setItem: (key: string, value: string) => {
        memory.set(key, String(value));
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: (index: number) => Array.from(memory.keys())[index] ?? null,
      get length() {
        return memory.size;
      },
    };
  }
  if (typeof g.window === 'undefined') {
    g.window = g;
  }
  if (!g.window.localStorage) {
    g.window.localStorage = g.localStorage;
  }
  if (!g.crypto) {
    g.crypto = {};
  }
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = (arr: any) => {
      for (let i = 0; i < arr.length; i += 1) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    };
  }
} catch {}
