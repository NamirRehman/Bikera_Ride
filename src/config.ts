/**
 * Application Configuration
 */

// Shadow Worker URL - Production default
// Using direct string since import.meta.env is not available in React Native context without extra setup
export const SHADOW_WORKER_URL = 'https://bikerashadowworker-production.up.railway.app';

// Primary web experience for account actions that are intentionally out of scope on mobile v1
export const WEB_APP_URL = 'https://bikera.app';
export const II_DERIVATION_ORIGIN = WEB_APP_URL;
