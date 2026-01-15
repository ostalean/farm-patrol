import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GpsPing, BlockVisit } from '@/types/farm';

interface UseVisitPathResult {
  pings: GpsPing[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch GPS pings for a specific block visit from the database.
 * Queries the gps_pings table for pings within the visit's time range.
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

    const fetchPings = async () => {
      setLoading(true);
      setError(null);

      try {
        // Query GPS pings for this visit's tractor within the visit time range
        const { data, error: queryError } = await supabase
          .from('gps_pings')
          .select('*')
          .eq('tractor_id', visit.tractor_id)
          .gte('ts', visit.started_at)
          .lte('ts', visit.ended_at || new Date().toISOString())
          .order('ts', { ascending: true });

        if (queryError) {
          throw queryError;
        }

        const mappedPings: GpsPing[] = (data || []).map(ping => ({
          id: ping.id,
          tenant_id: ping.tenant_id,
          tractor_id: ping.tractor_id,
          ts: ping.ts,
          lat: ping.lat,
          lon: ping.lon,
          speed: ping.speed ?? undefined,
          created_at: ping.created_at,
        }));

        setPings(mappedPings);
      } catch (err) {
        console.error('Error fetching visit path:', err);
        setError('Failed to load path data');
        setPings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPings();
  }, [visit?.id, visit?.tractor_id, visit?.started_at, visit?.ended_at]);

  return { pings, loading, error };
}
