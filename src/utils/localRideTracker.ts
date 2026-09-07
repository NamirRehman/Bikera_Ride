import { Principal } from '@dfinity/principal';

/**
 * Local Ride Tracker - Aggregates GPS points locally
 * Reduces canister writes by 50-100X
 * 
 * Security: Only aggregates for UI, final validation on canister
 * Performance: Batches updates every 30 seconds instead of per-point
 * Adapted for React Native
 */
export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export interface RideSummary {
  distance: number; // meters
  duration: number; // milliseconds
  maxSpeed: number; // m/s
  avgSpeed: number; // m/s
  pointCount: number;
  startPoint: LocationPoint;
  endPoint: LocationPoint;
  routePoints: LocationPoint[]; // First + last + key points only
}

export class LocalRideTracker {
  private points: LocationPoint[] = [];
  private startTime: number = 0;
  private totalDistance: number = 0;
  private maxSpeed: number = 0;
  private speedSum: number = 0;
  private speedCount: number = 0;
  private isActive: boolean = false;
  
  // Sync configuration
  private readonly SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds
  private readonly MAX_POINTS_TO_STORE = 100; // Keep only key points
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Callbacks
  private onSummaryUpdate?: (summary: RideSummary) => void;
  private onSync?: (summary: RideSummary) => Promise<void>;
  
  constructor(
    onSummaryUpdate?: (summary: RideSummary) => void,
    onSync?: (summary: RideSummary) => Promise<void>
  ) {
    this.onSummaryUpdate = onSummaryUpdate;
    this.onSync = onSync;
  }
  
  /**
   * Start tracking a new ride
   */
  start() {
    if (this.isActive) {
      console.warn('[LocalRideTracker] Already tracking, stopping previous ride');
      this.stop();
    }
    
    this.points = [];
    this.startTime = Date.now();
    this.totalDistance = 0;
    this.maxSpeed = 0;
    this.speedSum = 0;
    this.speedCount = 0;
    this.isActive = true;
    
    console.log('[LocalRideTracker] Started tracking');
  }
  
  /**
   * Add a GPS point
   */
  addPoint(point: LocationPoint) {
    if (!this.isActive) {
      console.warn('[LocalRideTracker] Not active, call start() first');
      return;
    }
    
    // Add point
    this.points.push(point);
    
    // Calculate distance from previous point
    if (this.points.length > 1) {
      const prev = this.points[this.points.length - 2];
      const distance = this.calculateDistance(
        prev.latitude,
        prev.longitude,
        point.latitude,
        point.longitude
      );
      this.totalDistance += distance;
    }
    
    // Update speed stats
    if (point.speed !== undefined && point.speed > 0) {
      this.speedSum += point.speed;
      this.speedCount++;
      if (point.speed > this.maxSpeed) {
        this.maxSpeed = point.speed;
      }
    }
    
    // Optimize stored points (keep first, last, and key points)
    this.optimizePoints();
    
    // Update UI callback
    if (this.onSummaryUpdate) {
      this.onSummaryUpdate(this.getSummary());
    }
    
    // Schedule sync if not already scheduled
    this.scheduleSync();
  }
  
  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Optimize stored points - keep only key points
   */
  private optimizePoints() {
    if (this.points.length <= this.MAX_POINTS_TO_STORE) {
      return; // No optimization needed
    }
    
    // Keep: first point, last point, and evenly spaced points in between
    const keepIndices = new Set<number>();
    keepIndices.add(0); // First
    keepIndices.add(this.points.length - 1); // Last
    
    // Add evenly spaced points
    const step = Math.floor(this.points.length / (this.MAX_POINTS_TO_STORE - 2));
    for (let i = step; i < this.points.length - 1; i += step) {
      keepIndices.add(i);
    }
    
    // Filter points
    this.points = this.points.filter((_, index) => keepIndices.has(index));
  }
  
  /**
   * Get current ride summary
   */
  getSummary(): RideSummary {
    const duration = Date.now() - this.startTime;
    const avgSpeed = this.speedCount > 0 ? this.speedSum / this.speedCount : 0;
    
    return {
      distance: this.totalDistance,
      duration,
      maxSpeed: this.maxSpeed,
      avgSpeed,
      pointCount: this.points.length,
      startPoint: this.points[0] || { latitude: 0, longitude: 0, timestamp: this.startTime },
      endPoint: this.points[this.points.length - 1] || { latitude: 0, longitude: 0, timestamp: Date.now() },
      routePoints: this.points // Already optimized
    };
  }
  
  /**
   * Schedule periodic sync to canister
   */
  private scheduleSync() {
    if (this.syncTimer) {
      return; // Already scheduled
    }
    
    this.syncTimer = setTimeout(async () => {
      await this.syncToCanister(false); // Not final
      this.syncTimer = null;
    }, this.SYNC_INTERVAL_MS);
  }
  
  /**
   * Sync summary to canister
   */
  async syncToCanister(isFinal: boolean = false): Promise<void> {
    if (!this.isActive && !isFinal) {
      return;
    }
    
    const summary = this.getSummary();
    
    if (this.onSync) {
      try {
        await this.onSync(summary);
        console.log(`[LocalRideTracker] ${isFinal ? 'Final' : 'Periodic'} sync completed`);
      } catch (error) {
        console.error('[LocalRideTracker] Sync failed:', error);
        throw error;
      }
    }
  }
  
  /**
   * Stop tracking and finalize
   */
  async stop(): Promise<RideSummary> {
    if (!this.isActive) {
      throw new Error('Not tracking a ride');
    }
    
    // Clear sync timer
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Final sync
    await this.syncToCanister(true);
    
    const summary = this.getSummary();
    this.isActive = false;
    
    console.log('[LocalRideTracker] Stopped tracking', summary);
    return summary;
  }
  
  /**
   * Check if currently tracking
   */
  isTracking(): boolean {
    return this.isActive;
  }
}

