/**
 * Production-safe logging. Debug/info stay in __DEV__ only; errors always emit.
 */
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

type LogArgs = [message?: unknown, ...optionalParams: unknown[]];

export const logger = {
  log: (...args: LogArgs) => {
    if (isDev) console.log(...args);
  },
  info: (...args: LogArgs) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: LogArgs) => {
    if (isDev) console.debug(...args);
  },
  warn: (...args: LogArgs) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: LogArgs) => {
    console.error(...args);
  },
};
