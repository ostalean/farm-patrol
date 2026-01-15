import { useMemo } from 'react';
import type { Block, GpsPing } from '@/types/farm';
import type { Feature, Polygon } from 'geojson';
import * as turf from '@turf/turf';

export interface VisitCoverageStats {
  averageSpeed: number;        // km/h
  maxSpeed: number;            // km/h
  coveragePercentage: number;  // 0-100
  coveredArea: number;         // hectares
  totalDistance: number;       // meters
  missedAreas: Feature<Polygon>[];
}

interface UseVisitCoverageResult {
  stats: VisitCoverageStats | null;
  loading: boolean;
}

// Work width in meters (typical tractor implement width)
const WORK_WIDTH_METERS = 6;

export function useVisitCoverage(
  block: Block | null,
  pings: GpsPing[]
): UseVisitCoverageResult {
  const stats = useMemo(() => {
    if (!block || pings.length < 2) return null;

    try {
      // Calculate speeds
      const speeds = pings
        .map(p => p.speed)
        .filter((s): s is number => s !== null && s > 0);
      
      const averageSpeed = speeds.length > 0
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
        : 0;
      
      const maxSpeed = speeds.length > 0
        ? Math.max(...speeds)
        : 0;

      // Create LineString from pings
      const coordinates = pings.map(p => [p.lon, p.lat]);
      const pathLine = turf.lineString(coordinates);

      // Calculate total distance
      const totalDistance = turf.length(pathLine, { units: 'meters' });

      // Get block polygon
      const blockPolygon = block.geometry_geojson;
      const blockArea = turf.area(blockPolygon); // in square meters

      // Create buffer around path (work width)
      const bufferedPath = turf.buffer(pathLine, WORK_WIDTH_METERS / 2, { units: 'meters' });
      
      if (!bufferedPath) {
        return {
          averageSpeed,
          maxSpeed,
          coveragePercentage: 0,
          coveredArea: 0,
          totalDistance,
          missedAreas: [],
        };
      }

      // Intersect buffered path with block to get covered area
      let coveredPolygon: Feature<Polygon> | null = null;
      try {
        const intersection = turf.intersect(
          turf.featureCollection([blockPolygon as Feature<Polygon>, bufferedPath as Feature<Polygon>])
        );
        if (intersection && intersection.geometry.type === 'Polygon') {
          coveredPolygon = intersection as Feature<Polygon>;
        }
      } catch {
        // Intersection failed, assume full coverage of buffered area within block
      }

      const coveredArea = coveredPolygon 
        ? turf.area(coveredPolygon) / 10000 // convert to hectares
        : turf.area(bufferedPath) / 10000;

      const coveragePercentage = Math.min(100, (coveredArea * 10000 / blockArea) * 100);

      // Calculate missed areas (difference between block and covered area)
      let missedAreas: Feature<Polygon>[] = [];
      try {
        if (coveredPolygon || bufferedPath) {
          const covered = coveredPolygon || bufferedPath;
          const difference = turf.difference(
            turf.featureCollection([blockPolygon as Feature<Polygon>, covered as Feature<Polygon>])
          );
          
          if (difference) {
            if (difference.geometry.type === 'Polygon') {
              missedAreas = [difference as Feature<Polygon>];
            } else if (difference.geometry.type === 'MultiPolygon') {
              // Convert MultiPolygon to array of Polygons
              missedAreas = difference.geometry.coordinates.map((coords, idx) => ({
                type: 'Feature' as const,
                properties: { id: idx },
                geometry: {
                  type: 'Polygon' as const,
                  coordinates: coords,
                },
              }));
            }
          }
        }
      } catch {
        // Difference calculation failed
      }

      return {
        averageSpeed,
        maxSpeed,
        coveragePercentage,
        coveredArea,
        totalDistance,
        missedAreas,
      };
    } catch (error) {
      console.error('Error calculating coverage stats:', error);
      return null;
    }
  }, [block, pings]);

  return {
    stats,
    loading: false,
  };
}

// Generate demo coverage stats for testing
export function generateDemoCoverageStats(): VisitCoverageStats {
  const coveragePercentage = 65 + Math.random() * 30; // 65-95%
  return {
    averageSpeed: 5 + Math.random() * 3, // 5-8 km/h
    maxSpeed: 8 + Math.random() * 4,     // 8-12 km/h
    coveragePercentage,
    coveredArea: 2 + Math.random() * 3,  // 2-5 hectares
    totalDistance: 3000 + Math.random() * 2000, // 3-5 km
    missedAreas: [], // Demo doesn't generate real missed areas
  };
}