import { useEffect, useRef, useCallback } from 'react';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/turf';
import type { Block, Tractor, BlockMetrics } from '@/types/farm';

interface SimulatorOptions {
  isRunning: boolean;
  blocks: Block[];
  tractors: Tractor[];
  blockMetrics: Record<string, BlockMetrics>;
  onTractorMove: (tractorId: string, lat: number, lon: number) => void;
  onBlockVisit: (blockId: string, tractorId: string) => void;
  onMetricsUpdate: (blockId: string, metrics: Partial<BlockMetrics>) => void;
}

// Waypoints for realistic tractor movement across blocks
const SIMULATOR_ROUTES = [
  // Route 1: Through north blocks
  [
    { lat: -33.310, lon: -71.430 },
    { lat: -33.314, lon: -71.424 },
    { lat: -33.315, lon: -71.418 },
    { lat: -33.314, lon: -71.412 },
    { lat: -33.318, lon: -71.408 },
    { lat: -33.322, lon: -71.415 },
    { lat: -33.325, lon: -71.420 },
    { lat: -33.322, lon: -71.428 },
    { lat: -33.316, lon: -71.432 },
  ],
  // Route 2: Through south and east blocks
  [
    { lat: -33.328, lon: -71.430 },
    { lat: -33.324, lon: -71.422 },
    { lat: -33.320, lon: -71.415 },
    { lat: -33.322, lon: -71.405 },
    { lat: -33.318, lon: -71.408 },
    { lat: -33.315, lon: -71.415 },
    { lat: -33.318, lon: -71.425 },
    { lat: -33.324, lon: -71.428 },
  ],
];

export function useGpsSimulator({
  isRunning,
  blocks,
  tractors,
  blockMetrics,
  onTractorMove,
  onBlockVisit,
  onMetricsUpdate,
}: SimulatorOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const tractorPositionsRef = useRef<Map<string, { 
    routeIndex: number; 
    waypointIndex: number; 
    progress: number;
    lastBlockId: string | null;
  }>>(new Map());

  const checkBlockVisit = useCallback((lat: number, lon: number, tractorId: string) => {
    const tractorPoint = point([lon, lat]);
    
    for (const block of blocks) {
      const isInside = booleanPointInPolygon(tractorPoint, block.geometry_geojson);
      const tractorState = tractorPositionsRef.current.get(tractorId);
      
      if (isInside && tractorState?.lastBlockId !== block.id) {
        // Tractor entered a new block
        onBlockVisit(block.id, tractorId);
        
        // Update metrics
        const currentMetrics = blockMetrics[block.id];
        onMetricsUpdate(block.id, {
          last_seen_at: new Date().toISOString(),
          last_tractor_id: tractorId,
          total_passes: (currentMetrics?.total_passes || 0) + 1,
          passes_24h: (currentMetrics?.passes_24h || 0) + 1,
          passes_7d: (currentMetrics?.passes_7d || 0) + 1,
        });
        
        if (tractorState) {
          tractorState.lastBlockId = block.id;
        }
        return;
      } else if (!isInside && tractorState?.lastBlockId === block.id) {
        // Tractor left the block
        if (tractorState) {
          tractorState.lastBlockId = null;
        }
      }
    }
  }, [blocks, blockMetrics, onBlockVisit, onMetricsUpdate]);

  const updateTractorPosition = useCallback((tractorId: string, routeIndex: number) => {
    let state = tractorPositionsRef.current.get(tractorId);
    
    if (!state) {
      state = { routeIndex, waypointIndex: 0, progress: 0, lastBlockId: null };
      tractorPositionsRef.current.set(tractorId, state);
    }

    const route = SIMULATOR_ROUTES[state.routeIndex % SIMULATOR_ROUTES.length];
    const currentWp = route[state.waypointIndex];
    const nextWp = route[(state.waypointIndex + 1) % route.length];

    // Interpolate position
    const lat = currentWp.lat + (nextWp.lat - currentWp.lat) * state.progress;
    const lon = currentWp.lon + (nextWp.lon - currentWp.lon) * state.progress;

    // Add slight randomness for realism
    const jitteredLat = lat + (Math.random() - 0.5) * 0.0003;
    const jitteredLon = lon + (Math.random() - 0.5) * 0.0003;

    onTractorMove(tractorId, jitteredLat, jitteredLon);
    checkBlockVisit(jitteredLat, jitteredLon, tractorId);

    // Advance progress
    state.progress += 0.15; // Speed of movement
    if (state.progress >= 1) {
      state.progress = 0;
      state.waypointIndex = (state.waypointIndex + 1) % route.length;
    }
  }, [onTractorMove, checkBlockVisit]);

  useEffect(() => {
    if (isRunning && tractors.length > 0) {
      // Initialize positions
      tractors.forEach((tractor, i) => {
        if (!tractorPositionsRef.current.has(tractor.id)) {
          tractorPositionsRef.current.set(tractor.id, {
            routeIndex: i,
            waypointIndex: 0,
            progress: 0,
            lastBlockId: null,
          });
        }
      });

      intervalRef.current = setInterval(() => {
        tractors.forEach((tractor, i) => {
          updateTractorPosition(tractor.id, i);
        });
      }, 800); // Update every 800ms

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRunning, tractors, updateTractorPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
