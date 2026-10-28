/**
 * Application Configuration
 */

// Shadow Worker URL - Production default
// Using direct string since import.meta.env is not available in React Native context without extra setup
export const SHADOW_WORKER_URL = 'https://bikerashadowworker-production.up.railway.app';

// Primary web experience for account actions that are intentionally out of scope on mobile v1.
// bikera.cloud is the marketing site; the web app itself lives at app.bikera.cloud.
export const WEB_APP_URL = 'https://app.bikera.cloud';
/** Web app page for a route, e.g. webAppPage('ride-partners'). */
export const webAppPage = (path: string) => `${WEB_APP_URL}/${path}`;
// Sent to the II bridge, which always derives principals from the frontend canister origin
// (see ii-bridge.html). Keep it equal to that origin so accounts never change.
export const II_DERIVATION_ORIGIN = 'https://fn3mc-ryaaa-aaaap-an4zq-cai.icp0.io';
