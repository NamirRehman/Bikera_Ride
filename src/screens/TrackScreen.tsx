import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView, Platform, Modal, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Principal } from '@dfinity/principal';

import { Screen } from '../components/Screen';
import { colors, radii, shadows } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import { ThreeDotLoader } from '../components/ThreeDotLoader';
import {
  getBikeraUserActor,
  getBikeraConsensusActor,
  getBikeraXpActor,
} from '../utils/actors';
import { invalidateDashboardCache, invalidateUserCaches } from '../utils/cacheHelpers';
import { ShadowWorkerService } from '../services/ShadowWorkerService';
import { getGPSPointBatcher } from '../services/gpsPointBatcher';
import { useToastHelpers } from '../contexts/ToastContext';

const { width } = Dimensions.get('window');

interface SessionData {
  distance: number; // in km
  duration: number; // in seconds
  avgSpeed: number; // in km/h
  maxSpeed: number; // in km/h
  calories: number;
}

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'debug' | 'warn' | 'error';
  message: string;
  data?: any;
}

// Mock Map Component (can be replaced with react-native-maps later)
function MapPlaceholder() {
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
}

export function TrackScreen() {
  const { principal, getIdentity } = useAuth();
  const { success, error, info, warning } = useToastHelpers();
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<SessionData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentPos, setCurrentPos] = useState<Location.LocationObject | null>(null);
  const [session, setSession] = useState<SessionData>({
    distance: 0,
    duration: 0,
    avgSpeed: 0,
    maxSpeed: 0,
    calories: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logScrollViewRef = useRef<ScrollView>(null);

  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastPointRef = useRef<{ lat: number; lon: number; ts: number } | null>(null);
  const routePointsRef = useRef<Array<{ latitude: number; longitude: number; timestamp: number; accuracy?: number }>>([]);
  const sessionRef = useRef<SessionData>(session);
  const startTimeRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);
  // Use refs for tracking state so callbacks can access current values immediately
  const isTrackingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

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

  const FIRST_FLUSH_DELAY_MS = 150000; // 2.5 minutes (150 seconds) - same as web
  const CACHE_MAX_POINTS = 800; // Same as web

  // Logging function - adds logs to state and console
  const addLog = useCallback((level: LogEntry['level'], message: string, data?: any) => {
    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    // Also log to console for development
    const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.log;
    if (data) {
      consoleMethod(`[${level.toUpperCase()}] ${message}`, data);
    } else {
      consoleMethod(`[${level.toUpperCase()}] ${message}`);
    }

    // Add to state (keep last 100 logs)
    setLogs((prev) => {
      const newLogs = [...prev, logEntry];
      return newLogs.slice(-100);
    });

    // Auto-scroll to bottom
    setTimeout(() => {
      logScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Haversine formula to calculate distance between two points
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in meters
  };

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

  // Duration timer - updates every second
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTracking && !isPaused && startTimeRef.current !== null) {
      interval = setInterval(() => {
        const now = Date.now();
        const totalPaused = pausedDurationRef.current + (pauseStartTimeRef.current ? now - pauseStartTimeRef.current : 0);
        const elapsed = Math.floor((now - startTimeRef.current! - totalPaused) / 1000);

        setSession((prev) => {
          const newDuration = Math.max(0, elapsed);
          const newAvgSpeed = prev.distance > 0 && newDuration > 0
            ? (prev.distance / (newDuration / 3600))
            : prev.avgSpeed;

          return {
            ...prev,
            duration: newDuration,
            avgSpeed: newAvgSpeed,
            calories: Math.floor(prev.distance * 50), // Approximate: 50 calories per km
          };
        });
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

      // Try batch update first, fallback to single point updates (matches web)
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
          // Fallback: update with single point
          if (backendRoutePoints.length > 0) {
            await (actor as any).updateActivitySession(
              sessionId,
              Math.round(totalDistanceMeters),
              Math.round(maxSpeedKmh),
              Math.round(avgSpeedKmh),
              [backendRoutePoints[backendRoutePoints.length - 1]], // Send last point
              p
            );
            addLog('debug', `Session updated (fallback method)`);
          }
        }
      } catch (error) {
        addLog('warn', 'Session update failed', error);
        return false;
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
    if (sendInFlightRef.current) {
      addLog('debug', 'Flush already in flight, skipping');
      return;
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

  // End activity session on canister
  const endSessionOnCanister = useCallback(async (): Promise<void> => {
    try {
      const sessionId = sessionIdRef.current;
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
      } else {
        addLog('error', 'endActivitySession error', res);
      }
    } catch (e) {
      addLog('error', 'Failed to end session', e);
      error('Could not end session', 'An unexpected error occurred while saving your ride.');
    } finally {
      sessionIdRef.current = null;
    }
  }, [principal, getIdentity]);

  // Handle GPS position updates
  const handleLocationUpdate = useCallback((location: Location.LocationObject) => {
    setCurrentPos(location);
    setGpsError(null);

    const { latitude, longitude, accuracy, speed } = location.coords;
    // expo-location timestamp is in milliseconds, same as Date.now()
    const ts = location.timestamp || Date.now();

    // Use refs to get current tracking state (state updates are async, refs are immediate)
    const currentlyTracking = isTrackingRef.current;
    const currentlyPaused = isPausedRef.current;

    addLog('debug', 'GPS Position update', {
      latitude,
      longitude,
      accuracy,
      speed,
      ts,
      isTracking: currentlyTracking,
      isPaused: currentlyPaused
    });

    // Always update last point reference (even if not tracking yet) - critical for initial position
    // This ensures we have a reference point when tracking starts
    const last = lastPointRef.current;

    // If not tracking or paused, just update the reference point and return
    if (!currentlyTracking || currentlyPaused) {
      lastPointRef.current = { lat: latitude, lon: longitude, ts };
      addLog('debug', 'Not tracking or paused, updating reference point only', {
        isTracking: currentlyTracking,
        isPaused: currentlyPaused
      });
      return;
    }

    let deltaMeters = 0;
    let deltaSeconds = 0;

    if (last) {
      deltaMeters = haversine(last.lat, last.lon, latitude, longitude);
      deltaSeconds = Math.max(0, (ts - last.ts) / 1000);

      // Match web app: enforce ~1s update rate for processing (less strict than 0.3s)
      // This allows more updates to be processed, especially for slow movement
      if (deltaSeconds < 1) {
        addLog('debug', 'Skipping update (less than 1s since last)', {
          deltaSeconds: deltaSeconds.toFixed(2),
          deltaMeters: deltaMeters.toFixed(2)
        });
        return;
      }
    } else {
      // First point - no delta, but we need to set the reference
      addLog('info', 'First GPS point received, setting reference');
    }

    addLog('debug', 'GPS Delta', {
      deltaMeters: deltaMeters.toFixed(2),
      deltaSeconds: deltaSeconds.toFixed(2),
      gpsSpeed: speed !== null && speed !== undefined ? `${(speed * 3.6).toFixed(1)} km/h` : 'N/A'
    });

    // Update last point reference AFTER processing (matches web app pattern)
    lastPointRef.current = { lat: latitude, lon: longitude, ts };

    // Always process updates if we have movement, it's the first point, or enough time has passed
    const deltaKm = deltaMeters / 1000;

    // Calculate instantaneous speed (m/s to km/h) - matches web app pattern
    // Prefer speed from location.coords if available, otherwise calculate from movement
    let instSpeedKmh = 0;
    if (typeof speed === 'number' && speed !== null && isFinite(speed) && speed >= 0) {
      // Use speed from GPS (m/s to km/h) - this is most accurate
      instSpeedKmh = speed * 3.6;
      addLog('debug', 'Using GPS speed', { gpsSpeed: speed, instSpeedKmh: instSpeedKmh.toFixed(1) });
    } else if (deltaSeconds > 0) {
      // Calculate from movement (m/s to km/h) - fallback when GPS speed not available
      // This works even for slow movement (walking)
      instSpeedKmh = (deltaMeters / deltaSeconds) * 3.6;
      addLog('debug', 'Calculated speed from movement', {
        deltaMeters: deltaMeters.toFixed(2),
        deltaSeconds: deltaSeconds.toFixed(2),
        instSpeedKmh: instSpeedKmh.toFixed(1)
      });
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

    // Update UI session state (for display only) - matches web pattern exactly
    setSession((prev) => {
      const newDistanceMeters = (prev.distance * 1000) + deltaMeters;
      const newDistanceKm = newDistanceMeters / 1000;
      // Use current duration from timer and add deltaSeconds (matches web app)
      const totalSeconds = prev.duration + deltaSeconds;
      const newAvgSpeedKmh = totalSeconds > 0
        ? (newDistanceKm / (totalSeconds / 3600))
        : prev.avgSpeed;
      const newMaxSpeedKmh = Math.max(prev.maxSpeed, instSpeedKmh);

      addLog('debug', 'Session Update', {
        distance: `${newDistanceKm.toFixed(3)} km`,
        maxSpeed: `${newMaxSpeedKmh.toFixed(1)} km/h`,
        avgSpeed: `${newAvgSpeedKmh.toFixed(1)} km/h`,
        instSpeed: `${instSpeedKmh.toFixed(1)} km/h`,
        deltaMeters: `${deltaMeters.toFixed(2)} m`,
        cachedDistance: `${(cached.distance / 1000).toFixed(3)} km`,
        cachedPoints: cached.routePoints.length,
      });

      return {
        ...prev,
        distance: newDistanceKm,
        maxSpeed: newMaxSpeedKmh,
        avgSpeed: newAvgSpeedKmh,
        calories: Math.floor(newDistanceKm * 50),
      };
    });

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
  }, [flushRideDataToBackend, sendGPSPointToShadowWorker]); // Removed isTracking/isPaused from deps - using refs instead

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

  // Start tracking
  const handleStart = async () => {
    setGpsError(null);
    setIsStarting(true);

    try {
      // Request permissions if needed
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        status = newStatus;
      }

      if (status !== 'granted') {
        setGpsError('Location permission denied');
        error('Permission Required', 'Location permission is required to track your ride.');
        setIsStarting(false);
        return;
      }

      setPermissionStatus(status);

      // Start session on canister
      try {
        await startSessionOnCanister();
      } catch (e) {
        addLog('warn', 'Session start failed, continuing anyway', e);
        // Continue tracking even if session start fails
      }

      // Reset state
      setSession({
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        calories: 0,
      });
      routePointsRef.current = [];
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
          accuracy: Platform.OS === 'ios' ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
        });
        addLog('info', 'Got initial position', initialLocation.coords);
        // Set the initial reference point directly (don't call handleLocationUpdate yet)
        const ts = initialLocation.timestamp || Date.now();
        lastPointRef.current = {
          lat: initialLocation.coords.latitude,
          lon: initialLocation.coords.longitude,
          ts: ts,
        };
        addLog('info', 'Initial reference point set', lastPointRef.current);
      } catch (initialError) {
        addLog('warn', 'Could not get initial position, will use first watch update', initialError);
        // Continue anyway - first watch update will establish the point
      }

      // Start location tracking
      // Use High accuracy for better GPS updates on mobile
      // Note: timeInterval and distanceInterval are hints, actual updates may vary
      try {
        const watchOptions: Location.LocationOptions = {
          accuracy: Platform.OS === 'ios' ? Location.Accuracy.BestForNavigation : Location.Accuracy.High,
          timeInterval: 500, // Android only (iOS ignores). Still safe to include.
          distanceInterval: 1,
        };
        // Android-only: can pop a system dialog directing user to enable location
        if (Platform.OS === 'android') {
          (watchOptions as any).mayShowUserSettingsDialog = true;
        }

        watchSubscriptionRef.current = await Location.watchPositionAsync(
          watchOptions,
          (location) => {
            // Wrap in try-catch to prevent crashes from breaking the watch
            try {
              handleLocationUpdate(location);
            } catch (error) {
              addLog('error', 'Error in location update handler', error);
            }
          }
        );

        addLog('info', 'Location watch started successfully');
      } catch (watchError: any) {
        addLog('error', 'Failed to start location watch', watchError);
        setGpsError(watchError?.message || 'Failed to start GPS tracking');
        throw watchError;
      }

      // Set tracking state using both state and refs
      // Refs ensure callbacks see the value immediately (state updates are async)
      isTrackingRef.current = true;
      isPausedRef.current = false;
      setIsTracking(true);
      setIsPaused(false);
    } catch (error: any) {
      addLog('error', 'Start error', error);
      setGpsError(error.message || 'Failed to start tracking');
      Alert.alert('Error', error.message || 'Failed to start tracking');
    } finally {
      setIsStarting(false);
    }
  };

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
      `Are you sure you want to stop tracking?\n\nYour ride will be saved with:\n• ${session.distance.toFixed(2)} km\n• ${formatTime(session.duration)}\n• ${session.maxSpeed.toFixed(1)} km/h max speed`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Stop & Save',
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
    setIsStopping(true);
    info('Saving your ride...', 'Please wait while we save your ride data.');
    
    // Store session data for success modal
    const finalSessionData = { ...session };
    setSavedSessionData(finalSessionData);
    
    // Update refs immediately so callbacks stop processing
    isTrackingRef.current = false;
    isPausedRef.current = false;
    setIsTracking(false);
    setIsPaused(false);

    // Flush GPS point batcher before stopping
    try {
      const batcher = getGPSPointBatcher();
      if (batcher.getQueueSize() > 0) {
        addLog('info', `Flushing ${batcher.getQueueSize()} queued GPS points...`);
        await batcher.forceFlush();
        addLog('info', 'GPS points flushed successfully');
      }
    } catch (error) {
      addLog('warn', 'Error flushing GPS points', error);
      // Continue even if flush fails
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
    const cached = cachedRideDataRef.current;
    addLog('info', `🛑 Stopping ride, sending END flush with ${cached.routePoints.length} points`);

    // Send end flush with all remaining cached data
    await flushRideDataToBackend(true);

    // End session on canister - this saves the session to history
    addLog('info', 'Ending session on canister');
    await endSessionOnCanister();

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

    // Invalidate caches after completing a ride
    // This ensures dashboard, profile, history, etc. show updated data
    if (principal) {
      await invalidateDashboardCache(principal);
      await invalidateUserCaches(principal);
      addLog('info', 'Invalidated caches after ride completion');
    }

    setIsStopping(false);
    
    // Show success modal with ride summary
    setShowSuccessModal(true);
    
    // Reset session data after showing success modal
    setTimeout(() => {
      setSession({
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        calories: 0,
      });
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
      if (currentPos) return 'GPS ACTIVE';
      return 'GPS SEARCHING';
    }
    return 'GPS READY';
  };

  const getGpsStatusColor = () => {
    if (gpsError) return colors.error;
    if (!permissionStatus || permissionStatus === 'denied') return colors.warning;
    if (isTracking && currentPos) return colors.success;
    return colors.textSecondary;
  };

  return (
    <Screen scroll={false} contentClassName={{ paddingHorizontal: 0, paddingTop: 0, flex: 1 }}>
      <View style={styles.container}>
        {/* Header Overlay */}
        <View style={styles.headerOverlay}>
          <Text style={styles.headerTitle}>Track Ride</Text>
          <View style={styles.gpsIndicator}>
            <Ionicons name="cellular" size={14} color={getGpsStatusColor()} />
            <Text style={[styles.gpsText, { color: getGpsStatusColor() }]}>{getGpsStatus()}</Text>
          </View>
        </View>

        {/* Map Layer */}
        <MapPlaceholder />

        {/* Live Stats Overlay */}
        <LinearGradient
          colors={['rgba(6, 7, 23, 0.9)', 'rgba(6, 7, 23, 0.98)']}
          style={styles.statsOverlay}
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
              style={[styles.mainButton, { backgroundColor: colors.brandBlue100 }]}
              onPress={handleStart}
              disabled={isStarting}
              accessibilityLabel="Start ride"
              accessibilityRole="button"
            >
              {isStarting ? (
                <ThreeDotLoader color="#fff" size="small" />
              ) : (
                <Ionicons name="play" size={32} color="#fff" style={{ marginLeft: 4 }} />
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
              {gpsError ? `Error: ${gpsError}` : 'Ready to ride? Tap play to start tracking.'}
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
                colors={[colors.brandBlue100, colors.brandPurple]}
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

        {/* Log Viewer Toggle Button */}
        <TouchableOpacity
          style={styles.logToggleButton}
          onPress={() => setShowLogs(!showLogs)}
        >
          <Ionicons
            name={showLogs ? "chevron-down" : "chevron-up"}
            size={20}
            color={colors.textSecondary}
          />
          <Text style={styles.logToggleText}>
            {showLogs ? 'Hide Logs' : 'Show Logs'} ({logs.length})
          </Text>
        </TouchableOpacity>

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
                <Text style={styles.loadingText}>Saving your ride...</Text>
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
                  colors={[colors.success, colors.brandBlue100]}
                  style={styles.successIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark" size={48} color="#fff" />
                </LinearGradient>
              </View>
              
              <Text style={styles.successTitle}>Ride Saved!</Text>
              <Text style={styles.successSubtitle}>Your ride has been successfully recorded</Text>

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
                  colors={[colors.brandBlue100, colors.brandPurple]}
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

        {/* Log Viewer Panel */}
        {showLogs && (
          <View style={styles.logPanel}>
            <View style={styles.logHeader}>
              <Text style={styles.logHeaderText}>Debug Logs ({logs.length})</Text>
              <TouchableOpacity
                onPress={() => setLogs([])}
                style={styles.logClearButton}
              >
                <Text style={styles.logClearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={logScrollViewRef}
              style={styles.logScrollView}
              contentContainerStyle={styles.logContent}
            >
              {logs.map((log) => {
                const levelCapitalized = log.level.charAt(0).toUpperCase() + log.level.slice(1);
                const logEntryStyle = (styles as any)[`logEntry${levelCapitalized}`];
                const logLevelStyle = (styles as any)[`logLevel${levelCapitalized}`];

                return (
                  <View key={log.id} style={[styles.logEntry, logEntryStyle]}>
                    <View style={styles.logEntryHeader}>
                      <Text style={[styles.logLevel, logLevelStyle]}>
                        {log.level.toUpperCase()}
                      </Text>
                      <Text style={styles.logTime}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <Text style={styles.logMessage}>{log.message}</Text>
                    {log.data && (
                      <Text style={styles.logData}>
                        {typeof log.data === 'object' ? JSON.stringify(log.data, null, 2) : String(log.data)}
                      </Text>
                    )}
                  </View>
                );
              })}
              {logs.length === 0 && (
                <Text style={styles.logEmpty}>No logs yet. Start tracking to see logs.</Text>
              )}
            </ScrollView>
          </View>
        )}
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
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 4,
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
  logToggleButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    zIndex: 20,
  },
  logToggleText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  logPanel: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    bottom: 160,
    backgroundColor: 'rgba(6, 7, 23, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 30,
    overflow: 'hidden',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logHeaderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  logClearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logClearText: {
    color: colors.brandBlue100,
    fontSize: 12,
    fontWeight: '600',
  },
  logScrollView: {
    flex: 1,
  },
  logContent: {
    padding: 12,
    gap: 8,
  },
  logEntry: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 3,
  },
  logEntryInfo: {
    borderLeftColor: colors.brandBlue100,
  },
  logEntryDebug: {
    borderLeftColor: colors.textSecondary,
  },
  logEntryWarn: {
    borderLeftColor: colors.warning,
  },
  logEntryError: {
    borderLeftColor: colors.error,
  },
  logEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logLevelInfo: {
    color: colors.brandBlue100,
  },
  logLevelDebug: {
    color: colors.textSecondary,
  },
  logLevelWarn: {
    color: colors.warning,
  },
  logLevelError: {
    color: colors.error,
  },
  logTime: {
    color: colors.textTertiary,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  logMessage: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  logData: {
    color: colors.textSecondary,
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  logEmpty: {
    color: colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    padding: 20,
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
