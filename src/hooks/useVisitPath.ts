import { useState, useEffect } from 'react';
import type { GpsPing, BlockVisit } from '@/types/farm';

interface UseVisitPathResult {
  pings: GpsPing[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch GPS pings for a specific block visit.
 * In demo mode, this generates simulated path data.
 * With real data, this would query gps_pings table.
 */
export function useVisitPath(visit: BlockVisit | null): UseVisitPathResult {
  const [pings, setPings] = useState<GpsPing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visit) {
      setPings([]);
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate fetching GPS pings for the visit
    // In production, this would query:
    // SELECT * FROM gps_pings 
    // WHERE tractor_id = visit.tractor_id 
    //   AND ts BETWEEN visit.started_at AND visit.ended_at
    // ORDER BY ts ASC

    const simulatePathFetch = async () => {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Generate demo path based on visit data
        const generatedPings = generateDemoPath(visit);
        setPings(generatedPings);
      } catch (err) {
        setError('Failed to load path data');
        console.error('Error fetching visit path:', err);
      } finally {
        setLoading(false);
      }
    };

    simulatePathFetch();
  }, [visit?.id]);

  return { pings, loading, error };
}

/**
 * Generate a demo GPS path for visualization.
 * Creates a realistic-looking path within the timeframe of the visit.
 */
function generateDemoPath(visit: BlockVisit): GpsPing[] {
  const pings: GpsPing[] = [];
  const startTime = new Date(visit.started_at).getTime();
  const endTime = visit.ended_at 
    ? new Date(visit.ended_at).getTime() 
    : startTime + 30 * 60 * 1000; // Default 30 min if no end

  const duration = endTime - startTime;
  const pingCount = visit.ping_count || Math.floor(duration / (30 * 1000)); // ~30 sec intervals

  // Demo coordinates - these would come from actual GPS data
  // For now, generate a serpentine path pattern
  const baseLat = -34.85;
  const baseLon = -70.12;
  const rowSpacing = 0.0003; // ~30m rows
  const stepSize = 0.0001; // ~10m steps

  let currentLat = baseLat;
  let currentLon = baseLon;
  let direction = 1;
  let rowCount = 0;

  for (let i = 0; i < pingCount; i++) {
    const progress = i / pingCount;
    const ts = new Date(startTime + duration * progress).toISOString();

    // Move along the row
    currentLon += stepSize * direction;

    // Turn at end of row
    if (Math.abs(currentLon - baseLon) > 0.002) {
      direction *= -1;
      currentLat += rowSpacing;
      rowCount++;
    }

    pings.push({
      id: `ping-${visit.id}-${i}`,
      tenant_id: visit.tenant_id,
      tractor_id: visit.tractor_id,
      ts,
      lat: currentLat + (Math.random() - 0.5) * 0.00002, // Add slight noise
      lon: currentLon + (Math.random() - 0.5) * 0.00002,
      speed: 5 + Math.random() * 3, // 5-8 km/h
      created_at: ts,
    });
  }

  return pings;
}
