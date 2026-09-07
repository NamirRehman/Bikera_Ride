import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { HttpAgent } from '@dfinity/agent';
import { Ed25519KeyIdentity, Ed25519PublicKey } from '@dfinity/identity';
import { DelegationIdentity, DelegationChain } from '@dfinity/identity';
import { Alert } from 'react-native';
import { II_DERIVATION_ORIGIN } from '../config';

// Internet Identity canister ID - use production ID or fallback
// In React Native, process.env may not be available, so we use a fallback
// Use lazy initialization to avoid crashes at module load time
let internetIdentityCanisterId: string | undefined;
const getInternetIdentityCanisterId = (): string => {
  if (internetIdentityCanisterId !== undefined) return internetIdentityCanisterId;
  try {
    const iiModule = require('../declarations/internet_identity');
    internetIdentityCanisterId = (iiModule.canisterId as string) || 'ajuq4-ruaaa-aaaaa-qaaga-cai';
  } catch (e) {
    // Fallback to production Internet Identity canister ID
    internetIdentityCanisterId = 'ajuq4-ruaaa-aaaaa-qaaga-cai';
  }
  return internetIdentityCanisterId;
};

// Custom storage adapter for AuthClient using AsyncStorage
// AuthClient requires localStorage, but React Native doesn't have it
// AuthClient expects get/set/remove methods (not getItem/setItem/removeItem)
class AsyncStorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'auth_client_') {
    this.prefix = prefix;
  }

  // AuthClient expects get() method
  async get(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(this.prefix + key);
      return value;
    } catch (error) {
      console.warn('[AUTH] AsyncStorage.get error:', error);
      return null;
    }
  }

  // AuthClient expects set() method
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.prefix + key, value);
    } catch (error) {
      console.warn('[AUTH] AsyncStorage.set error:', error);
    }
  }

  // AuthClient expects remove() method
  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('[AUTH] AsyncStorage.remove error:', error);
    }
  }

  // Also support getItem/setItem/removeItem for compatibility
  async getItem(key: string): Promise<string | null> {
    return this.get(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.remove(key);
  }
}

// Conditionally import expo-web-browser only for native platforms
// Use lazy initialization to avoid accessing Platform at module load time
let WebBrowser: any = null;
const getWebBrowser = () => {
  if (WebBrowser !== null) return WebBrowser;
  try {
    // Dynamically import Platform to avoid module load time access
    const { Platform } = require('react-native');
    if (Platform && Platform.OS !== 'web') {
      WebBrowser = require('expo-web-browser');
    }
  } catch (e) {
    console.warn('expo-web-browser not available:', e);
    WebBrowser = false; // Mark as attempted
  }
  return WebBrowser;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  principal: string | null;
  username: string | null;
  isRegistered: boolean | null;
  checkingAuth: boolean;
  checkingProfile: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  setRegistrationStatus: (registered: boolean, username?: string, email?: string) => Promise<void>;
  setCheckingProfile: (checking: boolean) => void;
  getIdentity: () => any | null;
  getDelegatedIdentity: () => DelegationIdentity | null;
  clearAuthData: () => Promise<void>;
};

const STORAGE_PRINCIPAL = 'bikera_principal_v1';
const STORAGE_USERNAME = 'bikera_username_v1';
const STORAGE_EMAIL = 'bikera_email_v1';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [principal, setPrincipal] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [delegatedIdentity, setDelegatedIdentity] = useState<DelegationIdentity | null>(null);

  // Initialize auth client
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // For React Native, AuthClient needs special configuration
        // Use idleOptions to disable idle timeout for mobile
        // Wrap in try-catch to handle any initialization errors gracefully
        let client: AuthClient;
        try {
          // Create custom storage adapter for React Native
          const storage = new AsyncStorageAdapter();
          // Use Ed25519 key type - doesn't require crypto.subtle (works without WebCrypto)
          client = await AuthClient.create({
            idleOptions: {
              disableIdle: true,
            },
            storage: storage as any, // AuthClient expects Storage interface
            keyType: 'Ed25519', // Use Ed25519 instead of WebCrypto keys (no crypto.subtle needed)
          });
        } catch (createError) {
          console.error('[AUTH] Failed to create AuthClient:', createError);
          // In production builds, AuthClient might fail if localStorage is not available
          // We'll continue without it and rely on DelegationIdentity from storage
          if (mounted) {
            setCheckingAuth(false);
          }
          return;
        }
        
        if (!mounted) return;
        setAuthClient(client);
        await checkAuthStatus(client);
      } catch (error) {
        console.error('[AUTH] Error initializing auth client:', error);
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuthStatus = useCallback(async (client?: AuthClient) => {
    const auth = client || authClient;
    
    try {
      setCheckingAuth(true);
      
      // First, try to restore DelegationIdentity from storage (React Native bridge approach)
      try {
        const [storedPrincipal, storedDelegation, storedSessionKey] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PRINCIPAL),
          AsyncStorage.getItem('bikera_delegation'),
          AsyncStorage.getItem('bikera_session_key'),
        ]);
        
        if (storedPrincipal && storedDelegation && storedSessionKey) {
          try {
            const sessionKeyRaw = JSON.parse(storedSessionKey);
            const sessionKey = Ed25519KeyIdentity.fromSecretKey(new Uint8Array(sessionKeyRaw));
            const delegationChain = DelegationChain.fromJSON(storedDelegation);
            const identity = DelegationIdentity.fromDelegation(sessionKey, delegationChain);
            
            // Verify delegation is still valid (not expired)
            // For a two-level chain (II → intermediate → mobile), check the LAST delegation
            // which is the one that actually expires for the mobile app
            // Expiration is in nanoseconds (BigInt or hex string)
            const delegations = delegationChain.delegations || [];
            const lastDelegation = delegations.length > 0 ? delegations[delegations.length - 1] : null;
            const expiration = lastDelegation?.delegation?.expiration;
            let isValid = true;
            if (expiration) {
              try {
                // Handle both BigInt and hex string formats
                // ICP stores expiration as nanoseconds since epoch
                const expirationNs = typeof expiration === 'string' 
                  ? BigInt('0x' + expiration) 
                  : BigInt(expiration);
                // Convert milliseconds to nanoseconds: 
                // 1 second = 1,000,000,000 nanoseconds
                // 1 millisecond = 1,000,000 nanoseconds
                // Date.now() returns milliseconds since epoch
                const nowNs = BigInt(Date.now()) * BigInt(1_000_000);
                isValid = expirationNs > nowNs;
                if (!isValid) {
                  console.log('[AUTH] Delegation expired:', {
                    expiration: expirationNs.toString(),
                    now: nowNs.toString(),
                    delegationsCount: delegations.length
                  });
                } else {
                  console.log('[AUTH] Delegation still valid, expires in:', {
                    expiration: expirationNs.toString(),
                    now: nowNs.toString(),
                    remainingNs: (expirationNs - nowNs).toString()
                  });
                }
              } catch (expErr) {
                console.warn('[AUTH] Error checking expiration:', expErr);
                // If we can't parse expiration, assume it's valid (better to try than fail)
                isValid = true;
              }
            }
            
            if (isValid) {
              setDelegatedIdentity(identity);
              setPrincipal(storedPrincipal);
              console.log('[AUTH] Restored DelegationIdentity from storage');
              
              // Load cached data
              try {
                const [cachedUsername, cachedEmail] = await Promise.all([
                  AsyncStorage.getItem(STORAGE_USERNAME),
                  AsyncStorage.getItem(STORAGE_EMAIL),
                ]);
                if (cachedUsername) setUsername(cachedUsername);
              } catch {}
              
              setCheckingAuth(false);
              return;
            } else {
              console.log('[AUTH] Delegation expired, clearing storage');
              await AsyncStorage.multiRemove(['bikera_delegation', 'bikera_session_key']);
            }
          } catch (restoreErr) {
            console.warn('[AUTH] Failed to restore DelegationIdentity:', restoreErr);
          }
        }
      } catch (storageErr) {
        console.warn('[AUTH] Failed to check storage for delegation:', storageErr);
      }
      
      // Fallback: Check AuthClient (for web or if delegation not available)
      if (auth) {
        const authenticated = await auth.isAuthenticated();
        
        if (authenticated) {
          const identity = auth.getIdentity();
          const p = identity.getPrincipal().toText();
          setPrincipal(p);
          
          // Load cached data
          try {
            const [cachedUsername, cachedEmail] = await Promise.all([
              AsyncStorage.getItem(STORAGE_USERNAME),
              AsyncStorage.getItem(STORAGE_EMAIL),
            ]);
            if (cachedUsername) setUsername(cachedUsername);
          } catch {}
        } else {
          setPrincipal(null);
          setUsername(null);
          setIsRegistered(null);
          setDelegatedIdentity(null);
        }
      } else {
        setPrincipal(null);
        setUsername(null);
        setIsRegistered(null);
        setDelegatedIdentity(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setPrincipal(null);
      setUsername(null);
      setIsRegistered(null);
      setDelegatedIdentity(null);
    } finally {
      setCheckingAuth(false);
    }
  }, [authClient]);

  // Poll for auth status changes (only when authenticated)
  useEffect(() => {
    if (!authClient) return;
    
    // Only poll if we think we're authenticated, otherwise check once
    const checkOnce = async () => {
      await checkAuthStatus();
    };
    
    checkOnce();
    
    // Only set up polling if authenticated
    if (principal) {
      const interval = setInterval(() => {
        checkAuthStatus();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [authClient, checkAuthStatus, principal]);

  const login = async () => {
    // Set loading state immediately
    setCheckingAuth(true);
    console.log('[AUTH] Login started');
    
    // Get or create authClient
    let clientToUse = authClient;
    if (!clientToUse) {
      console.warn('[AUTH] AuthClient not initialized, attempting to initialize...');
      try {
        // Create custom storage adapter for React Native
        const storage = new AsyncStorageAdapter();
        // Use Ed25519 key type - doesn't require crypto.subtle (works without WebCrypto)
        clientToUse = await AuthClient.create({
          idleOptions: {
            disableIdle: true,
          },
          storage: storage as any, // AuthClient expects Storage interface
          keyType: 'Ed25519', // Use Ed25519 instead of WebCrypto keys (no crypto.subtle needed)
        });
        setAuthClient(clientToUse);
        console.log('[AUTH] AuthClient created successfully');
      } catch (createError) {
        console.error('[AUTH] Failed to create AuthClient:', createError);
        setCheckingAuth(false);
        Alert.alert(
          'Authentication Error',
          'Failed to initialize authentication. Please try again or restart the app.',
        );
        return;
      }
    }

    try {
      const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
      
      // Always use production Internet Identity for mobile bridge flows
      // (local II can cause mixed-network issues with production canisters)
      const identityProvider = 'https://identity.ic0.app';
      console.log(`[AUTH] Using Internet Identity: ${identityProvider} (isDevelopment=${isDevelopment})`);
      
      // For web, use AuthClient with custom popup window size (small modal)
      // Dynamically get Platform to avoid module load time access
      const { Platform: PlatformCheck } = require('react-native');
      if (PlatformCheck && PlatformCheck.OS === 'web') {
        await clientToUse.login({
          identityProvider,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
          windowOpenerFeatures: 'left=100,top=100,width=720,height=800,toolbar=0,menubar=0,location=0',
          onSuccess: async () => {
            await checkAuthStatus();
          },
          onError: (error?: string) => {
            console.error('Login error:', error);
          },
        });
      } else {
        // React Native: Use official Internet Computer delegation approach
        // Step 1: Generate session key pair locally
        const sessionKey = Ed25519KeyIdentity.generate();
        const sessionPublicKey = sessionKey.getPublicKey();
        
        // Get WebBrowser (must call getWebBrowser() to initialize it)
        const webBrowser = getWebBrowser();
        if (!webBrowser) {
          Alert.alert('Error', 'expo-web-browser is not available. Please install it.');
          return;
        }
        
        // Always use production bridge URL for delegation (even in dev builds)
        const bridgeUrl = 'https://fn3mc-ryaaa-aaaap-an4zq-cai.icp0.io/ii-bridge.html';
        
        const redirectUri = 'bikeraride://auth/callback';
        const androidPackage = 'com.bikera.app';
        
        // Build bridge URL with query parameters
        // Pass session public key to bridge so it can create delegation
        const sessionPublicKeyRaw = Array.from(sessionPublicKey.toRaw());
        const bridgeUrlWithParams = `${bridgeUrl}?` +
          `redirect_uri=${encodeURIComponent(redirectUri)}` +
          `&identity_provider=${encodeURIComponent(identityProvider)}` +
          `&derivation_origin=${encodeURIComponent(II_DERIVATION_ORIGIN)}` +
          `&android_package=${encodeURIComponent(androidPackage)}` +
          `&session_key=${encodeURIComponent(JSON.stringify(sessionPublicKeyRaw))}`;
        
        console.log('[AUTH] Generated session key, opening bridge...');
        console.log('[AUTH] Bridge URL:', bridgeUrlWithParams.substring(0, 100) + '...');
        console.log('[AUTH] Redirect URI:', redirectUri);
        
        // Open bridge in WebBrowser modal (webBrowser already checked above)
        console.log('[AUTH] Opening WebBrowser session...');
        const result = await webBrowser.openAuthSessionAsync(bridgeUrlWithParams, redirectUri, {
          showInRecents: true,
          preferEphemeralSession: true,
        });
        
        console.log('[AUTH] WebBrowser session result:', result.type);
        
        if (result.type === 'success' && result.url) {
          console.log('[AUTH] Callback received, parsing URL...');
          console.log('[AUTH] Callback URL:', result.url.substring(0, 150) + '...');
          try {
            const callbackUrl = result.url;
            
            // Safe URL parsing (avoiding Hermes URL implementation issues)
            // fragment = everything after '#'
            const hashIndex = callbackUrl.indexOf('#');
            const fragment = hashIndex >= 0 ? callbackUrl.slice(hashIndex + 1) : '';
            
            // query = everything after '?' but before '#'
            const queryIndex = callbackUrl.indexOf('?');
            const queryString = queryIndex >= 0
              ? callbackUrl.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
              : '';
            
            // Parse query parameters manually
            const params = new Map<string, string>();
            for (const part of queryString.split('&')) {
              if (!part) continue;
              const [k, v] = part.split('=');
              if (k) {
                params.set(decodeURIComponent(k), decodeURIComponent(v || ''));
              }
            }
            
            const principalFromBridge = params.get('principal') || params.get('principalId') || null;
            
            if (fragment) {
              try {
                console.log('[AUTH] Fragment found, length:', fragment.length);
                console.log('[AUTH] Fragment (first 200 chars):', fragment.substring(0, 200));
                
                // Parse delegation data from fragment
                let delegationData: any;
                try {
                  const decodedFragment = decodeURIComponent(fragment);
                  console.log('[AUTH] Decoded fragment (first 200 chars):', decodedFragment.substring(0, 200));
                  delegationData = JSON.parse(decodedFragment);
                } catch (parseErr) {
                  // Try parsing without decodeURIComponent in case it's already decoded
                  try {
                    console.log('[AUTH] First parse failed, trying without decodeURIComponent...');
                    delegationData = JSON.parse(fragment);
                  } catch (parseErr2) {
                    console.error('[AUTH] Both parse attempts failed:', {
                      withDecode: parseErr,
                      withoutDecode: parseErr2,
                      fragmentLength: fragment.length,
                      fragmentPreview: fragment.substring(0, 100)
                    });
                    throw new Error(`Failed to parse fragment JSON: ${parseErr}. Also tried without decodeURIComponent: ${parseErr2}`);
                  }
                }
                
                console.log('[AUTH] Received delegation from bridge');
                console.log('[AUTH] Delegation data keys:', Object.keys(delegationData));
                console.log('[AUTH] Delegation data type:', typeof delegationData);
                
                // Reconstruct DelegationChain and DelegationIdentity
                console.log('[AUTH] Reconstructing DelegationChain...');
                // delegationData.delegationChain is already a parsed object, but fromJSON expects a JSON string
                // So we need to stringify it again
                const delegationChainData = delegationData.delegationChain || delegationData;
                if (!delegationChainData) {
                  throw new Error('No delegation chain found in callback data');
                }
                
                // Validate delegation chain structure
                if (!delegationChainData.delegations || !Array.isArray(delegationChainData.delegations)) {
                  throw new Error('Invalid delegation chain structure: missing delegations array');
                }
                
                if (delegationChainData.delegations.length === 0) {
                  throw new Error('Delegation chain has no delegations');
                }
                
                const delegationChain = DelegationChain.fromJSON(JSON.stringify(delegationChainData));
                
                // SECURITY: Verify that the delegation chain matches the session key
                // This prevents using a mismatched delegation chain that would be rejected by IC
                // but would have already leaked to boundary/replica nodes
                console.log('[AUTH] Verifying delegation chain matches session key...');
                const sessionPublicKey = sessionKey.getPublicKey();
                const sessionKeyRaw = new Uint8Array(sessionPublicKey.toRaw());
                console.log('[AUTH] Session key raw length:', sessionKeyRaw.length, 'bytes');
                
                // Check that the last delegation in the chain targets our session key
                if (delegationChain.delegations && delegationChain.delegations.length > 0) {
                  const lastDelegation = delegationChain.delegations[delegationChain.delegations.length - 1];
                  const delegatedPublicKey = lastDelegation.delegation.pubkey;
                  
                  console.log('[AUTH] Delegated public key type:', typeof delegatedPublicKey);
                  console.log('[AUTH] Delegated public key is Uint8Array:', delegatedPublicKey instanceof Uint8Array);
                  
                  // Extract raw bytes from delegatedPublicKey
                  // The pubkey in delegation chain can be in different formats:
                  // 1. DER-encoded bytes (longer, starts with 0x30...)
                  // 2. Raw Ed25519 bytes (32 bytes)
                  // 3. Ed25519PublicKey object
                  let delegatedKeyRaw: Uint8Array;
                  
                  try {
                    // Type guard: Check if it's a Uint8Array
                    if (delegatedPublicKey instanceof Uint8Array) {
                      // If it's already a Uint8Array, check the format
                      if (delegatedPublicKey.length === 32) {
                        // Raw Ed25519 format (32 bytes)
                        delegatedKeyRaw = delegatedPublicKey;
                        console.log('[AUTH] Using delegated key as raw Ed25519 (32 bytes)');
                      } else if (delegatedPublicKey.length > 32) {
                        // Likely DER-encoded format
                        // DER-encoded Ed25519 public key structure:
                        // 0x30 [length] 0x30 0x05 0x06 0x03 0x2b 0x65 0x70 0x03 0x21 0x00 [32 bytes of key]
                        // The last 32 bytes are the raw public key
                        delegatedKeyRaw = delegatedPublicKey.slice(-32);
                        console.log('[AUTH] Extracted raw key from DER format (last 32 bytes), DER length:', delegatedPublicKey.length, 'raw length:', delegatedKeyRaw.length);
                      } else {
                        throw new Error(`Invalid public key length: expected 32 bytes or DER-encoded (>=32 bytes), got ${delegatedPublicKey.length} bytes`);
                      }
                    } 
                    // Type guard: Check if it has toRaw method (Ed25519PublicKey object)
                    else if (delegatedPublicKey && typeof (delegatedPublicKey as any).toRaw === 'function') {
                      // Already an Ed25519PublicKey object
                      delegatedKeyRaw = new Uint8Array((delegatedPublicKey as any).toRaw());
                      console.log('[AUTH] Delegated key is already Ed25519PublicKey, raw length:', delegatedKeyRaw.length);
                    } 
                    // Type guard: Check if it's a string
                    else {
                      const pubKeyType = typeof delegatedPublicKey;
                      if (pubKeyType === 'string') {
                        // Might be hex-encoded
                        const hexStr = delegatedPublicKey as string;
                        try {
                          const hexMatches = hexStr.match(/.{1,2}/g);
                          const hexBytes = new Uint8Array(
                            hexMatches ? hexMatches.map((byte: string) => parseInt(byte, 16)) : []
                          );
                          if (hexBytes.length === 32) {
                            delegatedKeyRaw = hexBytes;
                            console.log('[AUTH] Parsed delegated key from hex string, length:', delegatedKeyRaw.length);
                          } else {
                            throw new Error(`Invalid hex string length: expected 64 hex chars (32 bytes), got ${hexStr.length} chars`);
                          }
                        } catch (hexErr: any) {
                          throw new Error(`Failed to parse delegated key as hex string: ${hexErr?.message || String(hexErr)}`);
                        }
                      } else {
                        throw new Error(`Invalid delegated public key type: ${pubKeyType}, value: ${JSON.stringify(delegatedPublicKey)}`);
                      }
                    }
                  } catch (keyErr: any) {
                    console.error('[AUTH] Error parsing delegated public key:', keyErr);
                    console.error('[AUTH] Delegated public key details:', {
                      type: typeof delegatedPublicKey,
                      isUint8Array: delegatedPublicKey instanceof Uint8Array,
                      length: delegatedPublicKey instanceof Uint8Array ? delegatedPublicKey.length : 'N/A',
                      preview: delegatedPublicKey instanceof Uint8Array 
                        ? Array.from(delegatedPublicKey.slice(0, 10)).join(',') + '...'
                        : String(delegatedPublicKey).substring(0, 50)
                    });
                    throw new Error(`Failed to parse delegated public key: ${keyErr?.message || String(keyErr)}`);
                  }
                  
                  // Compare raw bytes (both should be 32 bytes for Ed25519)
                  if (sessionKeyRaw.length !== 32) {
                    throw new Error(`Invalid session key length: expected 32 bytes, got ${sessionKeyRaw.length}`);
                  }
                  
                  if (delegatedKeyRaw.length !== 32) {
                    throw new Error(`Invalid delegated key length: expected 32 bytes, got ${delegatedKeyRaw.length}`);
                  }
                  
                  let keysMatch = true;
                  for (let i = 0; i < 32; i++) {
                    if (sessionKeyRaw[i] !== delegatedKeyRaw[i]) {
                      keysMatch = false;
                      break;
                    }
                  }
                  
                  if (!keysMatch) {
                    console.error('[AUTH] Key mismatch details:', {
                      sessionKey: Array.from(sessionKeyRaw).map(b => b.toString(16).padStart(2, '0')).join(''),
                      delegatedKey: Array.from(delegatedKeyRaw).map(b => b.toString(16).padStart(2, '0')).join('')
                    });
                    throw new Error('Delegation chain does not match session key - potential security issue');
                  }
                  
                  console.log('[AUTH] ✅ Delegation chain verified - matches session key');
                } else {
                  console.warn('[AUTH] ⚠️ Delegation chain has no delegations');
                }
                
                console.log('[AUTH] Creating DelegationIdentity...');
                const identity = DelegationIdentity.fromDelegation(sessionKey, delegationChain);
                
                const principal = identity.getPrincipal().toText();
                console.log('[AUTH] Successfully created DelegationIdentity, principal:', principal);
                
                // Store the delegated identity
                console.log('[AUTH] Storing identity and principal...');
                setDelegatedIdentity(identity);
                setPrincipal(principal);
                
                // Store principal and delegation data for persistence
                try {
                  await AsyncStorage.setItem(STORAGE_PRINCIPAL, principal);
                  // Store the delegation chain data (use delegationChainData which we already extracted)
                  const delegationChainToStore = delegationData.delegationChain || delegationData;
                  await AsyncStorage.setItem('bikera_delegation', JSON.stringify(delegationChainToStore));
                  await AsyncStorage.setItem('bikera_session_key', JSON.stringify(Array.from(sessionKey.getKeyPair().secretKey)));
                  console.log('[AUTH] Stored delegation data to AsyncStorage');
                } catch (storageErr) {
                  console.warn('[AUTH] Failed to store delegation:', storageErr);
                }
                
                console.log('[AUTH] Checking auth status...');
                await checkAuthStatus();
                console.log('[AUTH] Login completed successfully');
              } catch (parseErr: any) {
                console.error('[AUTH] Failed to parse delegation from fragment:', parseErr);
                console.error('[AUTH] Parse error details:', parseErr?.message || String(parseErr), parseErr?.stack);
                // Fallback: Check if principal is in query params (legacy support)
                if (principalFromBridge) {
                  console.warn('[AUTH] Using fallback principal (no delegation available)');
                  setPrincipal(principalFromBridge);
                  try {
                    await AsyncStorage.setItem(STORAGE_PRINCIPAL, principalFromBridge);
                  } catch {}
                  await checkAuthStatus();
                } else {
                  setCheckingAuth(false);
                }
              }
            } else {
              console.warn('[AUTH] No fragment in callback URL');
              // Fallback: Check query params for principal (legacy support)
              if (principalFromBridge) {
                console.warn('[AUTH] No delegation in fragment, using principal only (update calls will fail)');
                setPrincipal(principalFromBridge);
                try {
                  await AsyncStorage.setItem(STORAGE_PRINCIPAL, principalFromBridge);
                } catch {}
                await checkAuthStatus();
              } else {
                console.error('[AUTH] No delegation or principal in callback URL');
                setCheckingAuth(false);
              }
            }
          } catch (error) {
            console.error('[AUTH] Error parsing callback URL:', error);
            setCheckingAuth(false);
          }
        } else if (result.type === 'cancel') {
          console.log('[AUTH] User cancelled authentication');
          setCheckingAuth(false);
        } else {
          console.error('[AUTH] Authentication failed:', result);
          setCheckingAuth(false);
        }
      }
    } catch (error) {
      console.error('[AUTH] Error during login:', error);
      setCheckingAuth(false);
    }
  };

  const logout = async () => {
    if (!authClient) return;

    try {
      // Stop checking profile immediately
      setCheckingProfile(false);
      
      await authClient.logout();
      
      // Clear all state
      setPrincipal(null);
      setUsername(null);
      setIsRegistered(null);
      setDelegatedIdentity(null);
      
      // Clear storage (including delegation data)
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_PRINCIPAL),
        AsyncStorage.removeItem(STORAGE_USERNAME),
        AsyncStorage.removeItem(STORAGE_EMAIL),
        AsyncStorage.removeItem('bikera_delegation'),
        AsyncStorage.removeItem('bikera_session_key'),
      ]);
      
      // Re-check auth status to ensure everything is cleared
      await checkAuthStatus();
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear state even if logout fails
      setPrincipal(null);
      setUsername(null);
      setIsRegistered(null);
      setCheckingProfile(false);
    }
  };

  // Helper function to clear all auth data (useful when switching between local/production II)
  const clearAuthData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_PRINCIPAL);
      await AsyncStorage.removeItem(STORAGE_USERNAME);
      await AsyncStorage.removeItem(STORAGE_EMAIL);
      setPrincipal(null);
      setUsername(null);
      setIsRegistered(null);
      setCheckingProfile(false);
      if (authClient) {
        await authClient.logout();
      }
      console.log('✅ Auth data cleared. Please log in again with local Internet Identity.');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }, [authClient]);

  const setRegistrationStatus = useCallback(async (registered: boolean, usernameValue?: string, emailValue?: string) => {
    setIsRegistered(registered);
    if (usernameValue) {
      setUsername(usernameValue);
      try {
        await AsyncStorage.setItem(STORAGE_USERNAME, usernameValue);
      } catch {}
    }
    if (emailValue) {
      try {
        await AsyncStorage.setItem(STORAGE_EMAIL, emailValue);
      } catch {}
    }
  }, []);

  // Get identity for use in agentOptions (following DesertID_Frontend pattern)
  // Priority: DelegationIdentity (from bridge) > AuthClient identity (web only)
  const getIdentity = useCallback(() => {
    // First, try to return DelegationIdentity (from bridge delegation)
    if (delegatedIdentity) {
      return delegatedIdentity;
    }
    
    // Fallback: Try AuthClient identity (works on web, not on native with bridge)
    if (authClient) {
      try {
        return authClient.getIdentity();
      } catch (error) {
        console.error('Error getting identity from AuthClient:', error);
      }
    }
    
    return null;
  }, [authClient, delegatedIdentity]);

  // Get DelegationIdentity specifically (for React Native bridge authentication)
  const getDelegatedIdentity = useCallback(() => {
    return delegatedIdentity;
  }, [delegatedIdentity]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: !!principal,
      principal,
      username,
      isRegistered,
      checkingAuth,
      checkingProfile,
      login,
      logout,
      checkAuthStatus: () => checkAuthStatus(),
      setRegistrationStatus,
      setCheckingProfile,
      getIdentity,
      getDelegatedIdentity,
      clearAuthData,
    }),
    [principal, username, isRegistered, checkingAuth, checkingProfile, checkAuthStatus, getIdentity, getDelegatedIdentity, clearAuthData, setRegistrationStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

