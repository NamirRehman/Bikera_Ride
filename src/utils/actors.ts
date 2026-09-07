// Utilities to create typed actors for all backend canisters
// For React Native mobile app

// Core canisters
import { createActor as createBikeraMainActor } from "../declarations/bikera_main";
import { createActor as createBikeraUserActor } from "../declarations/bikera_user";
import { createActor as createBikeraValidatorActor } from "../declarations/bikera_validator";
import { createActor as createBikeraXpActor } from "../declarations/bikera_xp";
import { createActor as createBikeraRewardsActor } from "../declarations/bikera_rewards";
import { createActor as createBikeraImeraActor } from "../declarations/bikera_imera";
import { createActor as createBikeraPoolsActor } from "../declarations/bikera_pools";

// Import CreateActorOptions type for proper typing
import type { CreateActorOptions } from "../declarations/bikera_main";

// Detect if we're in development mode
// In React Native, __DEV__ is true in development builds
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// Helper for reading Expo-style env vars (EXPO_PUBLIC_*)
const getEnv = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Use production canisters + ic0.app host in all environments by default.
// If you ever need to force local canisters again, you can reintroduce a flag here.
const useProductionCanisters = true;

// Set DFX_NETWORK environment variable for React Native
// - 'local' for local replica
// - 'ic' for production canisters
try {
  if (typeof process !== 'undefined' && process.env) {
    process.env.DFX_NETWORK = useProductionCanisters ? 'ic' : 'local';
  }
} catch (e) {
  // Ignore if process.env is not available
}

// Production canister IDs
const PRODUCTION_CANISTER_IDS = {
  bikera_main: "fy45p-qqaaa-aaaap-an42a-cai",
  bikera_user: "fr7wt-gyaaa-aaaap-an43q-cai",
  bikera_validator: "e4rs5-jqaaa-aaaap-an44a-cai",
  bikera_xp: "pfggx-7aaaa-aaaap-an5da-cai",
  bikera_rewards: "fw6qh-laaaa-aaaap-an43a-cai",
  bikera_imera: "pmfnl-jiaaa-aaaap-an5cq-cai",
  bikera_bridge: "plel7-eqaaa-aaaap-an5ca-cai",
  bikera_consensus: "f7533-5iaaa-aaaap-an42q-cai",
  bikera_pools: "irhdx-giaaa-aaaap-an5qq-cai",
} as const;

// Always use production canister IDs
const CANISTER_IDS = PRODUCTION_CANISTER_IDS;

// Get the host URL based on environment (matching DesertID_Verifier_App pattern)
export const getHost = (): string => {
  // Use production host when flag is enabled or in release builds
  if (useProductionCanisters) {
    return 'https://ic0.app';
  }

  // Development mode with local replica
  // Use port 4943 (matching DesertID_Verifier_App) or 8000 (default dfx port)
  try {
    // Check if we're on Android (React Native)
    // Use dynamic require to avoid issues at module load time
    const ReactNative = require('react-native');
    if (ReactNative.Platform && ReactNative.Platform.OS === 'android') {
      return 'http://10.0.2.2:8000'; // Android emulator loopback (use 8000 as per user's dfx setup)
    }
  } catch (e) {
    // If Platform is not available, assume iOS/web
    // Silently fail - this is expected in some environments
  }
  return 'http://127.0.0.1:8000'; // iOS simulator & web (use 8000 as per user's dfx setup)
};

// Re-export canister IDs for convenience
export const canisterIds = { ...CANISTER_IDS };

// Helper to merge agent options with host configuration
// Following DesertID_Frontend pattern: pass identity in agentOptions, not pre-created agent
const getActorOptions = (options: CreateActorOptions = {}, identity?: any): CreateActorOptions => {
  const host = getHost();
  
  // If agent is explicitly provided, use it (for backward compatibility)
  if (options.agent) {
    return options;
  }
  
  // Otherwise, configure agentOptions with the correct host and identity
  // This allows declaration files to create the agent and fetch root key
  // Match DesertID_Frontend pattern exactly - include fetch override
  const baseAgentOptions: any = {
    host,
    identity,
    fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init),
  };
  
  // For local development with production II, we need to disable signature verification
  // This is required because production II delegations can't be verified against local replica root key
  if (isDevelopment) {
    baseAgentOptions.verifyQuerySignatures = false;
    baseAgentOptions.verifyUpdateSignatures = false;
  }
  
  // Merge with any existing agentOptions
  const agentOptions: any = options.agentOptions 
    ? Object.assign({}, baseAgentOptions, options.agentOptions)
    : baseAgentOptions;
  
  return {
    ...options,
    agentOptions,
  };
};

// Helper to ensure root key is fetched for local development
// This is called by the generated createActor functions
export const ensureRootKeyFetched = async (agent: any): Promise<void> => {
  if (!agent) return;
  
  const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  if (isDevelopment) {
    try {
      // Check if root key is already fetched by checking if the agent has it
      // If not, fetch it
      if (!agent.rootKey) {
        await agent.fetchRootKey();
        console.log('Root key fetched for local development');
      }
    } catch (error) {
      console.warn('Failed to fetch root key:', error);
      throw error;
    }
  }
};

// Factory helpers (options mirror generated createActor options)
// These automatically use the correct canister IDs and host based on environment
export const getBikeraMainActor = (options: CreateActorOptions = {}) => 
  createBikeraMainActor(CANISTER_IDS.bikera_main, getActorOptions(options));

export const getBikeraUserActor = (options: CreateActorOptions = {}, identity?: any) => {
  // Match DesertID_Verifier_App pattern: pass identity in agentOptions
  // Let the declaration file create the agent and fetch root key
  const actorOptions = getActorOptions(options, identity);
  return createBikeraUserActor(CANISTER_IDS.bikera_user, actorOptions);
};

export const getBikeraValidatorActor = (options: CreateActorOptions = {}) => 
  createBikeraValidatorActor(CANISTER_IDS.bikera_validator, getActorOptions(options));

export const getBikeraXpActor = (options: CreateActorOptions = {}, identity?: any) => {
  const actorOptions = getActorOptions(options, identity);
  return createBikeraXpActor(CANISTER_IDS.bikera_xp, actorOptions);
};

export const getBikeraRewardsActor = (options: CreateActorOptions = {}, identity?: any) => {
  const actorOptions = getActorOptions(options, identity);
  return createBikeraRewardsActor(CANISTER_IDS.bikera_rewards, actorOptions);
};

export const getBikeraImeraActor = (options: CreateActorOptions = {}, identity?: any) => {
  const actorOptions = getActorOptions(options, identity);
  return createBikeraImeraActor(CANISTER_IDS.bikera_imera, actorOptions);
};

export const getBikeraBridgeActor = (options: CreateActorOptions = {}, identity?: any) => {
  const actorOptions = getActorOptions(options, identity);
  return createBikeraBridgeActor(CANISTER_IDS.bikera_bridge, actorOptions);
};

export const getBikeraConsensusActor = (options: CreateActorOptions = {}) => 
  createBikeraConsensusActor(CANISTER_IDS.bikera_consensus, getActorOptions(options));

export const getBikeraPoolsActor = (options: CreateActorOptions = {}) => 
  createBikeraPoolsActor(CANISTER_IDS.bikera_pools, getActorOptions(options));

// Generic accessor if you have the canister name dynamically
export type CanisterName = keyof typeof canisterIds;

export function getActor(canisterName: CanisterName, options: CreateActorOptions = {}) {
  switch (canisterName) {
    case "bikera_main":
      return getBikeraMainActor(options);
    case "bikera_user":
      return getBikeraUserActor(options);
    case "bikera_validator":
      return getBikeraValidatorActor(options);
    case "bikera_xp":
      return getBikeraXpActor(options);
    case "bikera_rewards":
      return getBikeraRewardsActor(options);
    case "bikera_imera":
      return getBikeraImeraActor(options);
    case "bikera_bridge":
      return getBikeraBridgeActor(options);
    case "bikera_consensus":
      return getBikeraConsensusActor(options);
    case "bikera_pools":
      return getBikeraPoolsActor(options);
    default:
      throw new Error(`Unknown canister name: ${canisterName}`);
  }
}

// Export environment info for debugging
export const isLocalDevelopment = false;
export const currentHost = getHost();

// ===== SHADOW WORKER INTEGRATION (Phase 2) =====
import { ShadowWorkerClient } from '../services/shadowWorkerClient';
import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Singleton shadow client
let shadowClient: ShadowWorkerClient | null = null;

/**
 * Get shadow worker client instance
 */
export const getShadowClient = (agent: HttpAgent): ShadowWorkerClient => {
  if (!shadowClient) {
    shadowClient = new ShadowWorkerClient(agent);
  }
  return shadowClient;
};

/**
 * Get user dashboard data (optimized)
 * Uses snapshot queries + shadow worker caching
 * Replaces multiple separate calls with single batch call
 */
export const getUserDashboardData = async (
  userId: Principal,
  agent: HttpAgent
): Promise<{
  dashboard: any;
  rewards: any;
  xp: any;
  mining: any;
}> => {
  const shadow = getShadowClient(agent);
  return shadow.batchSnapshots(userId);
};
