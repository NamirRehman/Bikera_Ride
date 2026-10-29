import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform, Modal, Pressable, Animated, Switch, AppState, type AppStateStatus } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Principal } from '@dfinity/principal';
import { useFocusEffect } from '@react-navigation/native';

import { Screen } from '../components/Screen';
import { colors, radii, shadows } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import {
  getBikeraUserActor,
  getBikeraConsensusActor,
  getBikeraXpActor,
} from '../utils/actors';
import { invalidateAfterRide } from '../utils/cacheHelpers';
import { ShadowWorkerService } from '../services/ShadowWorkerService';
import { getGPSPointBatcher } from '../services/gpsPointBatcher';
import { submitSessionToJoinedPools } from '../services/poolRideSubmit';
import { useToastHelpers } from '../contexts/ToastContext';
import { rideAutoStart } from '../services/rideAutoStart';
import { rideFromPoints, saveLocalRide, type RidePoint } from '../services/rideFiles';

const { width } = Dimensions.get('window');

const STATS_GRADIENT = ['rgba(6, 7, 23, 0.9)', 'rgba(6, 7, 23, 0.98)'] as const;
const CTA_GRADIENT = [colors.brandBlue100, colors.brandPurple] as const;
const SUCCESS_CTA_GRADIENT = [colors.success, colors.brandBlue100] as const;

interface SessionData {
  distance: number; // in km
  duration: number; // in seconds
  avgSpeed: number; // in km/h
  maxSpeed: number; // in km/h
  calories: number;
}

// Mock Map Component (can be replaced with react-native-maps later)
const MapPlaceholder = React.memo(function MapPlaceholder() {
  return (
    <View style={styles.mapContainer}>
      {/* Simulating dark mode map with grid lines */}
      <View style={styles.mapGridHorizontal} />
      <View style={[styles.mapGridHorizontal, { top: '30%' }]} />
      <View style={[styles.mapGridHorizontal, { top: '60%' }]} />

      <View style={styles.mapGridVertical} />
      <View style={[styles.mapGridVertical, { left: '30%' }]} />
      <View style={[styles.mapGridVertical, { left: '60%' }]} />

      {/* Mock Route Path */}
      <View style={styles.routePath} />

      {/* Current Location Marker */}
      <View style={styles.currentLocation}>
        <View style={styles.locationPulse} />
        <Ionicons name="navigate" size={24} color={colors.brandBlue100} />
      </View>
    </View>
  );
});

export function TrackScreen() {
  const { principal, isGuest, getIdentity } = useAuth();
  const { success, error, info, warning } = useToastHelpers();
  const canTrack = !!principal && !isGuest;
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<SessionData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  /** Boolean only — full LocationObject in ref to avoid re-render every GPS tick */
  const [hasGpsFix, setHasGpsFix] = useState(false);
  const [autoStartOnLaunch, setAutoStartOnLaunch] = useState(false);
  const [autoStartHydrated, setAutoStartHydrated] = useState(false);
  const [session, setSession] = useState<SessionData>({
    distance: 0,
    duration: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    calories: 0,
  });
  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastPointRef = useRef<{ lat: number; lon: number; ts: number } | null>(null);
  const routePointsRef = useRef<Array<{ latitude: number; longitude: number; timestamp: number; accuracy?: number }>>([]);
  // The whole route of this ride, kept on the device so it can be exported as GPX from Ride Files.
  const fullRouteRef = useRef<RidePoint[]>([]);
  const sessionRef = useRef<SessionData>(session);
  const startTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  // Use refs for tracking state so callbacks can access current values immediately
  const isTrackingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const handleStartRef = useRef<() => Promise<void>>(async () => {});
  const flushRideDataRef = useRef<(isEndFlush?: boolean) => Promise<void>>(async () => {});
  const endSessionRef = useRef<() => Promise<void>>(async () => {});

  // Caching mechanism (matching web app pattern)
  const cachedRideDataRef = useRef<{
    distance: number; // in meters
    maxSpeed: number; // in km/h
    avgSpeed: number; // in km/h
    totalDataPoints: number;
    routePoints: Array<{ latitude: number; longitude: number; timestamp: number; accuracy?: number }>;
    firstCacheTime: number;
    lastUpdateTime: number;
    firstFlushSent: boolean;
    endFlushSent: boolean;
  }>({
    distance: 0,
    maxSpeed: 0,
    avgSpeed: 0,
    totalDataPoints: 0,
    routePoints: [],
    firstCacheTime: 0,
    lastUpdateTime: 0,
    firstFlushSent: false,
    endFlushSent: false,
  });

  const firstFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendInFlightRef = useRef<boolean>(false);
  const lastActivityPingRef = useRef<number>(0);
  const hasGpsFixRef = useRef(false);
  const currentPosRef = useRef<Location.LocationObject | null>(null);

  const FIRST_FLUSH_DELAY_MS = 150000; // 2.5 minutes (150 seconds) - same as web
  const CACHE_MAX_POINTS = 800; // Same as web
  const GPS_ACCURACY = Location.Accuracy.High;

  const addLog = useCallback((level: 'info' | 'debug' | 'warn' | 'error', message: string, data?: any) => {
    if (!__DEV__) return;
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.log;
    if (data) {
      consoleMethod(`[${level.toUpperCase()}] ${message}`, data);
    } else {
      consoleMethod(`[${level.toUpperCase()}] ${message}`);
    }
  }, []);

  // Haversine formula to calculate distance between two points
  const haversine = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
  }, []);

  // Check location permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionStatus(status);
      } catch (error) {
        addLog('error', 'Error checking permissions', error);
      }
    };
    checkPermissions();
  }, []);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (watchSubscriptionRef.current) {
        try {
          if (watchSubscriptionRef.current && typeof watchSubscriptionRef.current.remove === 'function') {
            watchSubscriptionRef.current.remove();
          }
        } catch (error) {
          addLog('warn', 'GPS Error removing subscription on unmount', error);
        } finally {
          watchSubscriptionRef.current = null;
        }
      }

      // Clear first flush timer on unmount
      if (firstFlushTimerRef.current) {
        clearTimeout(firstFlushTimerRef.current);
        firstFlushTimerRef.current = null;
      }

      // Flush GPS batcher on unmount if tracking was active
      if (isTrackingRef.current) {
        const batcher = getGPSPointBatcher();
        if (batcher.getQueueSize() > 0) {
          batcher.forceFlush().catch((error) => {
            console.error('[TrackScreen] Failed to flush GPS batcher on unmount:', error);
          });
        }
      }
    };
  }, []);

  // Update session ref when session changes
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Single UI tick (~1Hz): pulls live metrics from sessionRef so GPS handler avoids setState
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTracking && !isPaused && startTimeRef.current !== null) {
      interval = setInterval(() => {
        const now = Date.now();
        const totalPaused = pausedDurationRef.current + (pauseStartTimeRef.current ? now - pauseStartTimeRef.current : 0);
        const elapsed = Math.max(0, Math.floor((now - startTimeRef.current! - totalPaused) / 1000));
        const live = sessionRef.current;
        const avgSpeed =
          live.distance > 0 && elapsed > 0
            ? live.distance / (elapsed / 3600)
            : live.avgSpeed;

        const next: SessionData = {
          distance: live.distance,
          duration: elapsed,
          maxSpeed: live.maxSpeed,
          avgSpeed,
          calories: Math.floor(live.distance * 50),
        };
        sessionRef.current = next;
        setSession(next);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [isTracking, isPaused]);

  // Start activity session on canister
  const startSessionOnCanister = useCallback(async (): Promise<void> => {
    try {
      if (!principal) {
        throw new Error('No principal available');
      }

      const identity = getIdentity();
      if (!identity) {
        throw new Error('No identity available');
      }

      const actor = getBikeraUserActor({}, identity);
      const p = Principal.fromText(principal);

      addLog('info', 'Starting activity session', { principal });

      const sessionPromise = (actor as any).startActivitySession(p);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session start timeout')), 10000)
      );

      const res = await Promise.race([sessionPromise, timeoutPromise]) as any;

      if (res && 'ok' in res) {
        sessionIdRef.current = res.ok as string;
        addLog('info', 'Session started', { sessionId: sessionIdRef.current });
        success('Tracking started', 'Your ride is now being recorded.');

        // Record initial activity in consensus (fire and forget) - matches web app
        // Allow 0 distance - active tracking = eligible for mining
        try {
          const consensusActor = getBikeraConsensusActor();
          Promise.race([
            (consensusActor as any).recordActivity(
              p,
              BigInt(0), // Initial distance 0 - allowed for active tracking eligibility
              BigInt(0)  // Initial speed 0 - allowed
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]).then(() => {
            addLog('info', 'Consensus: Initial activity recorded (distance: 0m - active tracking eligible)');
          }).catch((e) => {
            addLog('warn', 'Consensus: Initial activity recording failed', e);
          });

          // Also ping user activity status (fire and forget) - matches web app
          void (actor as any).recordUserActivity(p);
        } catch (e) {
          addLog('warn', 'Consensus: Initial activity recording failed', e);
        }
      } else {
        addLog('error', 'startActivitySession error', res);
        throw new Error(String((res as any)?.err || 'startActivitySession failed'));
      }
    } catch (e: any) {
      addLog('error', 'Failed to start session', e);
      error('Could not start session', String(e?.message || e));
      throw e;
    }
  }, [principal, getIdentity]);

  // Send GPS point to shadow worker using batcher (optimized for performance)
  const sendGPSPointToShadowWorker = useCallback(async (
    latitude: number,
    longitude: number,
    timestamp: number,
    accuracy?: number,
    speed?: number,
    heading?: number
  ) => {
    try {
      const pText = principal;
      if (!pText) {
        addLog('warn', '[SHADOW WORKER] Skipping: missing principal');
        return;
      }

      // Use GPS point batcher for efficient batching
      // Points are collected and sent in batches automatically
      const batcher = getGPSPointBatcher();
      await batcher.addPoint(pText, {
        latitude,
        longitude,
        timestamp,
        accuracy,
        speed: speed ? speed * 3.6 : undefined, // Convert m/s to km/h if provided
        heading,
      });

      // Log periodically (not every point to avoid spam)
      if (Math.random() < 0.1) { // Log ~10% of points
        addLog('debug', '[SHADOW WORKER] GPS point queued', {
          queueSize: batcher.getQueueSize(),
        });
      }
    } catch (e) {
      addLog('warn', '[SHADOW WORKER] Error queuing GPS point', e);
      // Don't throw - allow tracking to continue even if batcher fails
    }
  }, [principal]);

  // Update session on canister (matches web app pattern)
  const updateSessionOnCanister = useCallback(async (
    totalDistanceMeters: number,
    maxSpeedKmh: number,
    avgSpeedKmh: number,
    routePoints: Array<{ latitude: number; longitude: number; timestamp: number; accuracy?: number }>
  ): Promise<boolean> => {
    try {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return false;
      if (!principal) return false;

      const identity = getIdentity();
      if (!identity) return false;

      const actor = getBikeraUserActor({}, identity);
      const p = Principal.fromText(principal);

      // Convert route points to backend format
      const backendRoutePoints = routePoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: BigInt(point.timestamp * 1_000_000), // ms -> ns
        accuracy: point.accuracy ? [point.accuracy] : [],
        altitude: [],
        heading: [],
      }));

      // Try batch update first; fallback sends ALL points (matches BikApp Track.tsx)
      try {
        if ((actor as any).updateActivitySessionWithPoints) {
          await (actor as any).updateActivitySessionWithPoints(
            sessionId,
            Math.round(totalDistanceMeters),
            Math.round(maxSpeedKmh),
            Math.round(avgSpeedKmh),
            backendRoutePoints,
            p
          );
          addLog('info', `✅ Session updated with ${routePoints.length} route points`);
        } else {
          addLog('warn', 'updateActivitySessionWithPoints unavailable — fallback per-point');
          for (const point of backendRoutePoints) {
            await (actor as any).updateActivitySession(
              sessionId,
              Math.round(totalDistanceMeters),
              Math.round(maxSpeedKmh),
              Math.round(avgSpeedKmh),
              [point],
              p
            );
          }
          addLog('info', `Session updated with ${routePoints.length} points (fallback)`);
        }
      } catch (batchErr) {
        addLog('warn', 'Batch update failed, trying per-point fallback', batchErr);
        try {
          for (const point of backendRoutePoints) {
            await (actor as any).updateActivitySession(
              sessionId,
              Math.round(totalDistanceMeters),
              Math.round(maxSpeedKmh),
              Math.round(avgSpeedKmh),
              [point],
              p
            );
          }
          addLog('info', `Session updated with ${routePoints.length} points (fallback after error)`);
        } catch (fallbackErr) {
          addLog('warn', 'Session update failed', fallbackErr);
          return false;
        }
      }

      return true;
    } catch (error) {
      addLog('warn', 'updateSessionOnCanister failed', error);
      return false;
    }
  }, [principal, getIdentity]);

  // Flush cached ride data to backend (first flush after 2.5 min, or end flush on stop)
  // Defined here so it can be used in handleLocationUpdate
  const flushRideDataToBackend = useCallback(async (isEndFlush: boolean = false) => {
    // End flush must wait for an in-flight first flush; soft flushes can skip
    if (sendInFlightRef.current) {
      if (!isEndFlush) {
        addLog('debug', 'Flush already in flight, skipping');
        return;
      }
      addLog('info', 'Waiting for in-flight flush before END flush…');
      const waitStart = Date.now();
      while (sendInFlightRef.current && Date.now() - waitStart < 15000) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (sendInFlightRef.current) {
        addLog('warn', 'In-flight flush still busy — forcing END flush anyway');
        sendInFlightRef.current = false;
      }
    }

    const cached = cachedRideDataRef.current;

    // Check if we've already sent both flushes
    if (cached.firstFlushSent && cached.endFlushSent) {
      addLog('debug', 'Both flushes already sent, skipping');
      return;
    }

    // Check if this is first flush and it's already been sent
    if (!isEndFlush && cached.firstFlushSent) {
      addLog('debug', 'First flush already sent, skipping');
      return;
    }

    // Check if this is end flush and it's already been sent
    if (isEndFlush && cached.endFlushSent) {
      addLog('debug', 'End flush already sent, skipping');
      return;
    }

    // Don't send if no data cached
    if (cached.totalDataPoints === 0 || cached.routePoints.length === 0) {
      addLog('debug', 'No data to flush');
      return;
    }

    sendInFlightRef.current = true;
    addLog('info', `⚡ Flushing ${isEndFlush ? 'END' : 'FIRST'} batch`, {
      distance: `${(cached.distance / 1000).toFixed(3)} km`,
      maxSpeed: `${cached.maxSpeed.toFixed(1)} km/h`,
      avgSpeed: `${cached.avgSpeed.toFixed(1)} km/h`,
      points: cached.routePoints.length,
    });

    try {
      const totals = sessionRef.current;
      const totalDistanceMeters = Math.max(0, Math.round(totals.distance * 1000));

      const updateSuccess = await updateSessionOnCanister(
        totalDistanceMeters,
        totals.maxSpeed,
        totals.avgSpeed,
        cached.routePoints
      );

      if (updateSuccess) {
        // Record activity in consensus when flushing (allows 0 distance - active tracking = eligible)
        try {
          if (principal) {
            const identity = getIdentity();
            if (identity) {
              const p = Principal.fromText(principal);
              const consensusActor = getBikeraConsensusActor();
              void (consensusActor as any).recordActivity(
                p,
                BigInt(totalDistanceMeters),
                BigInt(Math.max(0, Math.round(totals.avgSpeed)))
              );
              addLog('debug', `Consensus: Activity recorded on flush (distance: ${totalDistanceMeters}m, speed: ${totals.avgSpeed}km/h)`);
            }
          }
        } catch (e) {
          addLog('warn', 'Consensus: Activity recording on flush failed', e);
        }

        if (isEndFlush) {
          cachedRideDataRef.current.endFlushSent = true;
          addLog('info', 'End flush sent successfully');
        } else {
          // After first flush succeeds, reset cache to start accumulating new data for end flush (matches web)
          cachedRideDataRef.current.firstFlushSent = true;
          addLog('info', 'First flush sent successfully, resetting cache for new data accumulation');

          // Reset cache counters - firstCacheTime will be set to next GPS timestamp when it arrives
          cachedRideDataRef.current.firstCacheTime = 0; // Will be re-initialized on next GPS update
          cachedRideDataRef.current.distance = 0;
          cachedRideDataRef.current.maxSpeed = 0;
          cachedRideDataRef.current.avgSpeed = 0;
          cachedRideDataRef.current.totalDataPoints = 0;
          cachedRideDataRef.current.routePoints = [];
        }
      } else {
        addLog('warn', 'Flush failed, will retry on next attempt');
      }
    } catch (error) {
      addLog('error', 'Flush error', error);
    } finally {
      sendInFlightRef.current = false;
    }
  }, [updateSessionOnCanister, principal, getIdentity]);

  flushRideDataRef.current = flushRideDataToBackend;

  // End activity session on canister
  const endSessionOnCanister = useCallback(async (): Promise<void> => {
    const sessionId = sessionIdRef.current;
    try {
      if (!sessionId) return;
      if (!principal) return;

      const identity = getIdentity();
      if (!identity) return;

      const actor = getBikeraUserActor({}, identity);
      const p = Principal.fromText(principal);

      addLog('info', 'Ending activity session', { sessionId });

      const res = await (actor as any).endActivitySession(sessionId, p);

      if (res && 'ok' in res) {
        addLog('info', 'Session ended successfully');
        success('Tracking saved', 'Your ride has been successfully recorded.');

        // Award distance XP at session end using batch method (matches web app pattern)
        try {
          const xpActor = getBikeraXpActor({}, identity);
          const totals = sessionRef.current;
          const meters = Math.max(0, Math.round(totals.distance * 1000));

          if (meters > 0) {
            // Try batch method first (more efficient), fallback to regular method
            if ((xpActor as any).addDistanceXPBatch) {
              await (xpActor as any).addDistanceXPBatch(p, BigInt(meters));
              addLog('info', `XP awarded: ${meters}m (batch method)`);
            } else if ((xpActor as any).addDistanceXP) {
              await (xpActor as any).addDistanceXP(p, BigInt(meters));
              addLog('info', `XP awarded: ${meters}m (regular method)`);
            } else {
              addLog('warn', 'XP actor methods not available');
            }
          } else {
            addLog('debug', 'No distance to award XP for');
          }
        } catch (e: any) {
          addLog('warn', 'addDistanceXP failed', e);
          // Don't throw - session ended successfully, XP failure is non-critical
        }

        // Credit any Active race pools the rider has joined (staking Groups)
        try {
          const poolResult = await submitSessionToJoinedPools(sessionId, principal, identity);
          if (poolResult.submitted > 0) {
            addLog('info', `Submitted ride to ${poolResult.submitted} pool(s)`);
          }
        } catch (e: any) {
          addLog('warn', 'Pool ride submit failed (non-critical)', e);
        }
      } else {
        addLog('error', 'endActivitySession error', res);
      }
    } catch (e) {
      addLog('error', 'Failed to end session', e);
      error('Could not end session', 'An unexpected error occurred while saving your ride.');
    } finally {
      sessionIdRef.current = null;
    }
  }, [principal, getIdentity, success, error]);

  endSessionRef.current = endSessionOnCanister;

  // Mirror BikApp visibility flush: soft-flush ride cache when app backgrounds
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'background' && next !== 'inactive') return;
      if (!isTrackingRef.current || isPausedRef.current) return;
      if (!principal) return;
      void flushRideDataRef.current(false);
      try {
        const batcher = getGPSPointBatcher();
        if (batcher.getQueueSize() > 0) {
          void batcher.forceFlush();
        }
      } catch {
        // non-blocking
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [principal]);

  // Handle GPS position updates
  const handleLocationUpdate = useCallback((location: Location.LocationObject) => {
    currentPosRef.current = location;
    if (!hasGpsFixRef.current) {
      hasGpsFixRef.current = true;
      setHasGpsFix(true);
    }
    setGpsError((prev) => (prev ? null : prev));

    const { latitude, longitude, accuracy, speed } = location.coords;
    // expo-location timestamp is in milliseconds, same as Date.now()
    const ts = location.timestamp || Date.now();

    // Use refs to get current tracking state (state updates are async, refs are immediate)
    const currentlyTracking = isTrackingRef.current;
    const currentlyPaused = isPausedRef.current;

    // Always update last point reference (even if not tracking yet) - critical for initial position
    // This ensures we have a reference point when tracking starts
    const last = lastPointRef.current;

    // If not tracking or paused, just update the reference point and return
    if (!currentlyTracking || currentlyPaused) {
      lastPointRef.current = { lat: latitude, lon: longitude, ts };
      return;
    }

    let deltaMeters = 0;
    let deltaSeconds = 0;

    if (last) {
      deltaMeters = haversine(last.lat, last.lon, latitude, longitude);
      deltaSeconds = Math.max(0, (ts - last.ts) / 1000);

      // Match web app: enforce ~1s update rate for processing
      if (deltaSeconds < 1) {
        // Still seed first route point so short/stationary stops aren't empty flushes
        if (cachedRideDataRef.current.routePoints.length === 0) {
          const seedPoint = {
            latitude,
            longitude,
            timestamp: ts,
            accuracy: accuracy ?? undefined,
          };
          cachedRideDataRef.current.routePoints.push(seedPoint);
          cachedRideDataRef.current.totalDataPoints = 1;
          cachedRideDataRef.current.firstCacheTime = ts;
          cachedRideDataRef.current.lastUpdateTime = ts;
          routePointsRef.current.push(seedPoint);
        }
        return;
      }
    }

    // Update last point reference AFTER processing (matches web app pattern)
    lastPointRef.current = { lat: latitude, lon: longitude, ts };

    // Calculate instantaneous speed (m/s to km/h) - matches web app pattern
    // Prefer speed from location.coords if available, otherwise calculate from movement
    let instSpeedKmh = 0;
    if (typeof speed === 'number' && speed !== null && isFinite(speed) && speed >= 0) {
      // Use speed from GPS (m/s to km/h) - this is most accurate
      instSpeedKmh = speed * 3.6;
    } else if (deltaSeconds > 0) {
      // Calculate from movement (m/s to km/h) - fallback when GPS speed not available
      instSpeedKmh = (deltaMeters / deltaSeconds) * 3.6;
    }

    if (!isFinite(instSpeedKmh) || instSpeedKmh < 0) {
      instSpeedKmh = 0;
    }

    // Send GPS point to shadow worker (replaces direct validator calls)
    // Shadow worker will validate, batch, and submit to canister
    // We intentionally don't await this to avoid blocking the UI thread
    void sendGPSPointToShadowWorker(
      latitude,
      longitude,
      ts,
      accuracy ?? undefined,
      speed ?? undefined,
      location.coords.heading ?? undefined
    );


    // Update cached ride data (matches web app pattern)
    const cached = cachedRideDataRef.current;

    // Initialize cache on first GPS update (or re-initialize after first flush reset)
    if (cached.firstCacheTime === 0) {
      cached.firstCacheTime = ts;
      cached.lastUpdateTime = ts;
      if (cached.firstFlushSent) {
        addLog('debug', 'Re-initialized cache after first flush, accumulating data for end flush');
      } else {
        addLog('info', 'Initialized cache, will send first flush in 2.5 minutes');

        // Set timer for first flush after 2.5 minutes (only on initial setup) - matches web
        if (firstFlushTimerRef.current) {
          clearTimeout(firstFlushTimerRef.current);
        }
        firstFlushTimerRef.current = setTimeout(() => {
          const cachedData = cachedRideDataRef.current;
          addLog('info', `⏰ Timer fired after 150 seconds! Sending FIRST flush with ${cachedData.routePoints.length} points`);
          void flushRideDataToBackend(false);
          firstFlushTimerRef.current = null;
        }, FIRST_FLUSH_DELAY_MS);
      }
    }

    // Add point to cache
    const point = { latitude, longitude, timestamp: ts, accuracy: accuracy ?? undefined };
    cached.routePoints.push(point);
    cached.lastUpdateTime = ts;

    // Limit cache size (matches web app)
    if (cached.routePoints.length > CACHE_MAX_POINTS) {
      const overflow = cached.routePoints.length - CACHE_MAX_POINTS;
      cached.routePoints.splice(0, overflow);
    }

    // Update cached totals (accumulate distance, track max speed, calculate avg) - matches web
    cached.distance += deltaMeters;
    cached.totalDataPoints += 1;
    cached.maxSpeed = Math.max(cached.maxSpeed, instSpeedKmh);

    // Calculate average speed (total distance / total time since cache start)
    // firstCacheTime is reset after first flush, so this calculates correctly for both periods
    const totalTimeSeconds = cached.firstCacheTime > 0 ? (ts - cached.firstCacheTime) / 1000 : 0;
    cached.avgSpeed = totalTimeSeconds > 0 ? (cached.distance / 1000) / (totalTimeSeconds / 3600) : 0;

    // Update live metrics on ref only — UI tick (1Hz) publishes to React state
    const prev = sessionRef.current;
    const newDistanceKm = prev.distance + deltaMeters / 1000;
    const totalSeconds = prev.duration + deltaSeconds;
    const newAvgSpeedKmh =
      totalSeconds > 0 ? newDistanceKm / (totalSeconds / 3600) : prev.avgSpeed;
    sessionRef.current = {
      ...prev,
      distance: newDistanceKm,
      maxSpeed: Math.max(prev.maxSpeed, instSpeedKmh),
      avgSpeed: newAvgSpeedKmh,
      calories: Math.floor(newDistanceKm * 50),
    };

    if (fullRouteRef.current.length < 100_000) {
      fullRouteRef.current.push({ latitude, longitude, timestampMs: ts });
    }

    // Also add to routePointsRef for backward compatibility (keep for display/logging)
    routePointsRef.current.push({
      latitude,
      longitude,
      timestamp: ts,
      accuracy: accuracy ?? undefined,
    });

    // Limit route points in memory (keep last 500)
    if (routePointsRef.current.length > 500) {
      routePointsRef.current = routePointsRef.current.slice(-500);
    }
  }, [flushRideDataToBackend, sendGPSPointToShadowWorker, haversine]); // Removed isTracking/isPaused from deps - using refs instead

  // Record consensus activity every 60 seconds (matches web app pattern)
  // This is CRITICAL for mining participation - allows 0 distance (active tracking = eligible)
  useEffect(() => {
    // Check both state and refs - refs for immediate callback access, state for effect dependency
    if (isTracking && !isPaused && principal) {
      const activityInterval = setInterval(async () => {
        // Double-check with refs inside interval (state might be stale in closure)
        if (!isTrackingRef.current || isPausedRef.current) {
          return;
        }

        try {
          const identity = getIdentity();
          if (!identity) return;

          const p = Principal.fromText(principal);
          const cached = cachedRideDataRef.current;

          // Update user activity status (every 60 seconds)
          try {
            const userActor = getBikeraUserActor({}, identity);
            void (userActor as any).recordUserActivity(p);
          } catch (e) {
            addLog('warn', 'User activity recording failed', e);
          }

          // CRITICAL: Record activity in consensus (every 60 seconds)
          // Allow 0 distance - active tracking makes user eligible for mining
          try {
            const consensusActor = getBikeraConsensusActor();
            void (consensusActor as any).recordActivity(
              p,
              BigInt(Math.max(0, Math.round(cached.distance))), // Allow 0 distance
              BigInt(Math.max(0, Math.round(cached.avgSpeed))) // Allow 0 speed
            );
            addLog('debug', `Consensus: Activity recorded (distance: ${cached.distance}m, speed: ${cached.avgSpeed}km/h)`);
          } catch (e) {
            addLog('warn', 'Consensus: Activity recording failed', e);
          }

          lastActivityPingRef.current = Date.now();
        } catch (e) {
          addLog('warn', 'Activity ping failed', e);
        }
      }, 60000); // Every 60 seconds (matches web app)

      return () => clearInterval(activityInterval);
    }
  }, [isTracking, isPaused, principal, getIdentity]);

  // Start tracking (manual or one-shot auto-start). Hard mutex against double-start.
  const handleStart = useCallback(async () => {
    if (!canTrack) {
      warning('Sign in required', 'Sign in to start tracking rides.');
      return;
    }
    if (isTrackingRef.current || isStoppingRef.current) {
      addLog('warn', 'Start ignored — already tracking or stopping');
      return;
    }
    if (!rideAutoStart.tryBeginStart()) {
      addLog('warn', 'Start ignored — start already in flight');
      return;
    }

    setGpsError(null);
    setIsStarting(true);

    try {
      // Request permissions if needed
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
      }

      // Re-check after async permission UI (user may have navigated away / pressed stop)
      if (isTrackingRef.current || isStoppingRef.current) {
        return;
      }

      if (status !== 'granted') {
        setGpsError('Location permission denied');
        error('Permission Required', 'Location permission is required to track your ride.');
        return;
      }

      setPermissionStatus(status);

      // Best-effort background permission for pocket rides (matches app.json capabilities)
      try {
        const bg = await Location.getBackgroundPermissionsAsync();
        if (bg.status !== 'granted') {
          await Location.requestBackgroundPermissionsAsync();
        }
      } catch (bgErr) {
        addLog('warn', 'Background location permission not granted (foreground tracking continues)', bgErr);
      }

      let sessionStarted = false;
      if (principal) {
        try {
          await startSessionOnCanister();
          sessionStarted = !!sessionIdRef.current;
        } catch (e) {
          addLog('warn', 'Session start failed, continuing anyway', e);
        }
      } else {
        addLog('info', 'Guest mode: tracking locally without saving to an account');
      }

      if (isStoppingRef.current) {
        return;
      }

      // Reset state
      const cleared: SessionData = {
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        calories: 0,
      };
      sessionRef.current = cleared;
      setSession(cleared);
      routePointsRef.current = [];
      fullRouteRef.current = [];
      lastPointRef.current = null;
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      pauseStartTimeRef.current = null;

      // Initialize cache for new ride (matches web app pattern)
      cachedRideDataRef.current = {
        distance: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        totalDataPoints: 0,
        routePoints: [],
        firstCacheTime: 0,
        lastUpdateTime: 0,
        firstFlushSent: false,
        endFlushSent: false,
      };

      // Clear first flush timer if exists
      if (firstFlushTimerRef.current) {
        clearTimeout(firstFlushTimerRef.current);
        firstFlushTimerRef.current = null;
      }

      lastActivityPingRef.current = 0;

      // Get initial position to establish starting point
      // IMPORTANT: Set lastPointRef BEFORE starting tracking so handleLocationUpdate has a reference
      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: GPS_ACCURACY,
        });
        addLog('info', 'Got initial position', initialLocation.coords);
        const ts = initialLocation.timestamp || Date.now();
        lastPointRef.current = {
          lat: initialLocation.coords.latitude,
          lon: initialLocation.coords.longitude,
          ts: ts,
        };
        currentPosRef.current = initialLocation;
        if (!hasGpsFixRef.current) {
          hasGpsFixRef.current = true;
          setHasGpsFix(true);
        }
        addLog('info', 'Initial reference point set', lastPointRef.current);
      } catch (initialError) {
        addLog('warn', 'Could not get initial position, will use first watch update', initialError);
      }

      if (isStoppingRef.current) {
        return;
      }

      // Tear down any stale watch before creating a new one
      if (watchSubscriptionRef.current) {
        try {
          watchSubscriptionRef.current.remove?.();
        } catch {
          // ignore
        }
        watchSubscriptionRef.current = null;
      }

      try {
        const watchOptions: Location.LocationOptions = {
          // High (not BestForNavigation) — far less CPU/battery with comparable bike accuracy
          accuracy: GPS_ACCURACY,
          // ~1Hz; 3m filter cuts stationary GPS jitter without under-sampling rides
          timeInterval: 1000,
          distanceInterval: 3,
        };
        if (Platform.OS === 'android') {
          (watchOptions as any).mayShowUserSettingsDialog = true;
        }

        watchSubscriptionRef.current = await Location.watchPositionAsync(
          watchOptions,
          (location) => {
            try {
              handleLocationUpdate(location);
            } catch (err) {
              addLog('error', 'Error in location update handler', err);
            }
          }
        );

        addLog('info', 'Location watch started successfully');
      } catch (watchError: any) {
        addLog('error', 'Failed to start location watch', watchError);
        setGpsError(watchError?.message || 'Failed to start GPS tracking');
        // Don't leave an orphan canister session if GPS watch never started
        if (sessionStarted && sessionIdRef.current) {
          try {
            await endSessionRef.current();
          } catch {
            // ignore
          }
        }
        throw watchError;
      }

      isTrackingRef.current = true;
      isPausedRef.current = false;
      setIsTracking(true);
      setIsPaused(false);
    } catch (err: any) {
      addLog('error', 'Start error', err);
      setGpsError(err.message || 'Failed to start tracking');
      Alert.alert('Error', err.message || 'Failed to start tracking');
      isTrackingRef.current = false;
      setIsTracking(false);
    } finally {
      setIsStarting(false);
      rideAutoStart.endStart();
    }
  }, [addLog, canTrack, error, warning, principal, startSessionOnCanister, handleLocationUpdate]);

  handleStartRef.current = handleStart;

  // Load auto-start preference for Track-screen toggle
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const enabled = await rideAutoStart.hydrate();
      if (!cancelled) {
        setAutoStartOnLaunch(enabled);
        setAutoStartHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // One-shot auto-start when this screen is focused after an armed app launch
  useFocusEffect(
    useCallback(() => {
      if (!canTrack) {
        return undefined;
      }
      if (!rideAutoStart.claimPendingStart()) {
        return undefined;
      }
      let started = false;
      const t = setTimeout(() => {
        started = true;
        void handleStartRef.current();
      }, 150);
      return () => {
        clearTimeout(t);
        if (!started) {
          rideAutoStart.releaseUnstartedClaim();
        }
      };
    }, [canTrack])
  );

  const onToggleAutoStart = useCallback(async (value: boolean) => {
    setAutoStartOnLaunch(value);
    await rideAutoStart.setEnabled(value);
    if (value) {
      info('Auto-start on', 'Tracking starts the next time you open the app.');
    }
  }, [info]);

  // Pause/resume tracking
  const handlePause = () => {
    // Use ref to get current state (more reliable than state in callback)
    const currentlyPaused = isPausedRef.current;

    if (currentlyPaused) {
      // Resume
      addLog('info', 'Resuming tracking');
      if (pauseStartTimeRef.current) {
        pausedDurationRef.current += Date.now() - pauseStartTimeRef.current;
        pauseStartTimeRef.current = null;
      }
      // Update ref first (immediate), then state (for UI)
      isPausedRef.current = false;
      setIsPaused(false);
    } else {
      // Pause
      addLog('info', 'Pausing tracking');
      pauseStartTimeRef.current = Date.now();
      // Update ref first (immediate), then state (for UI)
      isPausedRef.current = true;
      setIsPaused(true);
    }
  };

  // Stop tracking
  const handleStop = async () => {
    // Show confirmation alert first
    Alert.alert(
      'Stop Tracking?',
      principal
        ? `Stop this ride and save:\n• ${session.distance.toFixed(2)} km\n• ${formatTime(session.duration)}\n• ${session.maxSpeed.toFixed(1)} km/h max speed`
        : `Stop this guest ride?\n• ${session.distance.toFixed(2)} km\n• ${formatTime(session.duration)}\nGuest rides are not saved to your account.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: principal ? 'Stop & Save' : 'Stop ride',
          style: 'destructive',
          onPress: async () => {
            await performStop();
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Perform the actual stop operation
  const performStop = async () => {
    isStoppingRef.current = true;
    setIsStopping(true);
    if (principal) {
      info('Saving your ride...', 'Please wait while we save your ride data.');
    } else {
      info('Ride finished', 'Guest rides are local for this session only — sign in to save rides.');
    }
    
    // Store session data for success modal (ref is fresher than React state between 1Hz ticks)
    const finalSessionData = { ...sessionRef.current };
    setSavedSessionData(finalSessionData);
    
    // Update refs immediately so callbacks stop processing
    isTrackingRef.current = false;
    isPausedRef.current = false;
    setIsTracking(false);
    setIsPaused(false);

    // Flush GPS point batcher + shadow worker final batch (matches BikApp Track.tsx)
    try {
      const batcher = getGPSPointBatcher();
      if (batcher.getQueueSize() > 0) {
        addLog('info', `Flushing ${batcher.getQueueSize()} queued GPS points...`);
        await batcher.forceFlush();
        addLog('info', 'GPS points flushed successfully');
      }
    } catch (error) {
      addLog('warn', 'Error flushing GPS points', error);
    }

    if (principal) {
      try {
        const flushResult = await ShadowWorkerService.flushBatch(principal);
        if (flushResult.success && flushResult.submitted) {
          addLog('info', '[SHADOW WORKER] Final batch flushed successfully');
        } else {
          addLog('debug', '[SHADOW WORKER] No batch to flush or flush skipped', flushResult.reason);
        }
      } catch (flushError) {
        addLog('warn', '[SHADOW WORKER] Final flush failed (non-blocking)', flushError);
      }
    }

    // Stop location tracking
    if (watchSubscriptionRef.current) {
      try {
        // Check if remove method exists before calling (web compatibility)
        if (watchSubscriptionRef.current && typeof watchSubscriptionRef.current.remove === 'function') {
          watchSubscriptionRef.current.remove();
        }
      } catch (error) {
        addLog('warn', 'Error removing subscription', error);
        // Continue even if removal fails
      } finally {
        watchSubscriptionRef.current = null;
      }
    }

    // Clear first flush timer if still pending
    if (firstFlushTimerRef.current) {
      clearTimeout(firstFlushTimerRef.current);
      firstFlushTimerRef.current = null;
    }

    // Flush cached data to backend (end flush - second call) - matches web app pattern
    if (principal) {
      const cached = cachedRideDataRef.current;
      addLog('info', `🛑 Stopping ride, sending END flush with ${cached.routePoints.length} points`);
      await flushRideDataToBackend(true);
      addLog('info', 'Ending session on canister');
      await endSessionOnCanister();
    } else {
      addLog('info', 'Guest mode: skipped account save');
    }

    // Keep the full route on this device so it can be exported as GPX (Ride Files).
    const route = fullRouteRef.current;
    fullRouteRef.current = [];
    if (route.length >= 2) {
      try {
        await saveLocalRide(
          rideFromPoints(`Bikera ride ${new Date(route[0].timestampMs).toLocaleString()}`, route),
          principal || ''
        );
        addLog('info', `Saved ${route.length} route points to Ride Files`);
      } catch (saveError) {
        addLog('warn', `Could not save route to Ride Files: ${String(saveError)}`);
      }
    }

    // Clear cache after sending (matches web app)
    cachedRideDataRef.current = {
      distance: 0,
      maxSpeed: 0,
      avgSpeed: 0,
      totalDataPoints: 0,
      routePoints: [],
      firstCacheTime: 0,
      lastUpdateTime: 0,
      firstFlushSent: false,
      endFlushSent: false,
    };

    // Narrow invalidation after ride — Home + history, not every screen
    if (principal) {
      await invalidateAfterRide(principal);
      addLog('info', 'Invalidated caches after ride completion');
    }

    setIsStopping(false);
    isStoppingRef.current = false;
    
    // Show success modal with ride summary
    setShowSuccessModal(true);
    
    // Reset session data after showing success modal
    setTimeout(() => {
      const cleared: SessionData = {
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        calories: 0,
      };
      sessionRef.current = cleared;
      setSession(cleared);
      routePointsRef.current = [];
      lastPointRef.current = null;
      startTimeRef.current = null;
      pausedDurationRef.current = 0;
      pauseStartTimeRef.current = null;
    }, 100);
  };

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get GPS status text
  const getGpsStatus = () => {
    if (gpsError) return 'GPS ERROR';
    if (!permissionStatus || permissionStatus === 'denied') return 'GPS DENIED';
    if (isTracking) {
      if (hasGpsFix) return 'GPS ACTIVE';
      return 'GPS SEARCHING';
    }
    return 'GPS READY';
  };

  const getGpsStatusColor = () => {
    if (gpsError) return colors.error;
    if (!permissionStatus || permissionStatus === 'denied') return colors.warning;
    if (isTracking && hasGpsFix) return colors.success;
    return colors.textSecondary;
  };

  return (
    <Screen scroll={false} animate={false} contentStyle={{ paddingHorizontal: 0, paddingTop: 0, flex: 1 }}>
      <View style={styles.container}>
        {/* Header Overlay */}
        <View style={styles.headerOverlay}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>Ride</Text>
              {!principal || isGuest ? (
                <Text style={styles.guestHint}>Guest — sign in to track rides</Text>
              ) : null}
            </View>
            <View style={styles.gpsIndicator}>
              <Ionicons name="cellular" size={14} color={getGpsStatusColor()} />
              <Text style={[styles.gpsText, { color: getGpsStatusColor() }]}>{getGpsStatus()}</Text>
            </View>
          </View>

          {!isTracking && autoStartHydrated && canTrack ? (
            <View style={styles.autoStartRow}>
              <Text style={styles.autoStartTitle}>Auto start on app open</Text>
              <Switch
                value={autoStartOnLaunch}
                onValueChange={onToggleAutoStart}
                disabled={isStarting || isStopping}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.brandBlue100 }}
                thumbColor="#fff"
                accessibilityLabel="Auto start on app open"
              />
            </View>
          ) : null}
        </View>

        {/* Map Layer */}
        <MapPlaceholder />

        {/* Live Stats Overlay */}
        <LinearGradient
          colors={STATS_GRADIENT}
          style={[
            styles.statsOverlay,
            !isTracking && autoStartHydrated && canTrack ? styles.statsOverlayWithAutoStart : null,
          ]}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>SPEED</Text>
              <Text style={styles.statValue}>
                {session.avgSpeed.toFixed(1)} <Text style={styles.statUnit}>km/h</Text>
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DISTANCE</Text>
              <Text style={styles.statValue}>
                {session.distance.toFixed(2)} <Text style={styles.statUnit}>km</Text>
              </Text>
            </View>
          </View>

          <View style={styles.statsHorizontalDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.statValue}>{formatTime(session.duration)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>KCAL</Text>
              <Text style={styles.statValue}>{Math.floor(session.calories)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>MAX</Text>
              <Text style={styles.statValue}>
                {session.maxSpeed.toFixed(1)}<Text style={styles.statUnit}>km/h</Text>
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {!isTracking ? (
            <TouchableOpacity
              style={[
                styles.mainButton,
                { backgroundColor: canTrack ? colors.brandBlue100 : 'rgba(255,255,255,0.18)' },
                !canTrack && styles.mainButtonDisabled,
              ]}
              onPress={handleStart}
              disabled={!canTrack || isStarting}
              accessibilityLabel={canTrack ? 'Start ride' : 'Sign in to start tracking'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canTrack }}
            >
              {isStarting ? (
                <ThreeDotLoader color="#fff" size="small" />
              ) : (
                <Ionicons
                  name="play"
                  size={32}
                  color={canTrack ? '#fff' : 'rgba(255,255,255,0.35)'}
                  style={{ marginLeft: 4 }}
                />
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceCard }]}
                onPress={handleStop}
                disabled={isStopping}
                accessibilityLabel="Stop ride"
                accessibilityRole="button"
              >
                {isStopping ? (
                  <ThreeDotLoader color={colors.error} size="small" />
                ) : (
                  <Ionicons name="stop" size={24} color={colors.error} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: isPaused ? colors.success : colors.warning }]}
                onPress={handlePause}
                disabled={isStopping}
                activeOpacity={0.7}
                accessibilityLabel={isPaused ? 'Resume ride' : 'Pause ride'}
                accessibilityRole="button"
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={32} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tips / Status Text */}
        {!isTracking && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsText}>
              {gpsError
                ? `Error: ${gpsError}`
                : !canTrack
                  ? 'Sign in to start tracking rides.'
                  : isStarting
                    ? 'Starting tracking…'
                    : 'Ready to ride? Tap play to start tracking.'}
            </Text>
          </View>
        )}

        {isPaused && (
          <View style={styles.pausedOverlay}>
            <Text style={styles.pausedText}>PAUSED</Text>
            <TouchableOpacity
              style={styles.centerPlayButton}
              onPress={handlePause}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={CTA_GRADIENT}
                style={styles.centerPlayButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="play" size={64} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.resumeHint}>Tap to resume</Text>
          </View>
        )}

        {/* Loading Overlay during stop */}
        {isStopping && (
          <Modal
            visible={isStopping}
            transparent
            animationType="fade"
            statusBarTranslucent
          >
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContent}>
                <ThreeDotLoader color={colors.brandBlue100} size="large" />
                <Text style={styles.loadingText}>{principal ? 'Saving your ride...' : 'Finishing ride...'}</Text>
                <Text style={styles.loadingSubtext}>Please wait</Text>
              </View>
            </View>
          </Modal>
        )}

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
          statusBarTranslucent
        >
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.successIconContainer}>
                <LinearGradient
                  colors={SUCCESS_CTA_GRADIENT}
                  style={styles.successIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </LinearGradient>
              </View>
              
              <Text style={styles.successTitle}>{principal ? 'Ride Saved!' : 'Ride complete'}</Text>
              <Text style={styles.successSubtitle}>
                {principal ? 'Your ride has been successfully recorded' : 'Guest ride finished. Sign in from More to save future rides to your account.'}
              </Text>

              {savedSessionData && (
                <View style={styles.successStatsContainer}>
                  <View style={styles.successStatRow}>
                    <View style={styles.successStatItem}>
                      <Ionicons name="speedometer" size={20} color={colors.brandBlue100} />
                      <Text style={styles.successStatValue}>
                        {savedSessionData.distance.toFixed(2)}
                      </Text>
                      <Text style={styles.successStatLabel}>km</Text>
                    </View>
                    <View style={styles.successStatDivider} />
                    <View style={styles.successStatItem}>
                      <Ionicons name="time" size={20} color={colors.brandBlue100} />
                      <Text style={styles.successStatValue}>
                        {formatTime(savedSessionData.duration)}
                      </Text>
                      <Text style={styles.successStatLabel}>time</Text>
                    </View>
                  </View>
                  
                  <View style={styles.successStatRow}>
                    <View style={styles.successStatItem}>
                      <Ionicons name="flame" size={20} color={colors.warning} />
                      <Text style={styles.successStatValue}>
                        {Math.floor(savedSessionData.calories)}
                      </Text>
                      <Text style={styles.successStatLabel}>kcal</Text>
                    </View>
                    <View style={styles.successStatDivider} />
                    <View style={styles.successStatItem}>
                      <Ionicons name="trophy" size={20} color={colors.success} />
                      <Text style={styles.successStatValue}>
                        {savedSessionData.maxSpeed.toFixed(1)}
                      </Text>
                      <Text style={styles.successStatLabel}>max km/h</Text>
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                style={styles.successButton}
                onPress={() => {
                  setShowSuccessModal(false);
                  setSavedSessionData(null);
                }}
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  style={styles.successButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.successButtonText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f1021',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  mapGridHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  mapGridVertical: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  routePath: {
    position: 'absolute',
    width: 200,
    height: 200,
    top: '25%',
    left: '20%',
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.brandBlue100,
    borderRadius: 100,
    transform: [{ rotate: '45deg' }],
    opacity: 0.8,
  },
  currentLocation: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(65, 190, 238, 0.3)',
  },
  headerOverlay: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    zIndex: 10,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleBlock: {
    flexShrink: 1,
    paddingRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
  },
  guestHint: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  gpsText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsOverlay: {
    position: 'absolute',
    top: 90,
    left: 16,
    right: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 16,
  },
  statsOverlayWithAutoStart: {
    top: 128,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statsHorizontalDivider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brandBlue100,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mainButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border1,
  },
  tipsContainer: {
    position: 'absolute',
    bottom: 140,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  autoStartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 7, 23, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  autoStartTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  tipsText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pausedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  pausedText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 8,
    marginBottom: 32,
    letterSpacing: 2,
  },
  centerPlayButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    ...shadows.soft,
    shadowColor: colors.brandBlue100,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  centerPlayButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeHint: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  loadingSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.soft,
    shadowColor: colors.success,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 24,
  },
  successIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 32,
    textAlign: 'center',
  },
  successStatsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  successStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 16,
  },
  successStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  successStatValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  successStatLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  successStatDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  successButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...shadows.soft,
    shadowColor: colors.brandBlue100,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  successButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
