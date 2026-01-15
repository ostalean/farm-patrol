import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BlockVisit } from '@/types/farm';

export function useVisits(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['visits', tenantId],
    queryFn: async (): Promise<BlockVisit[]> => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('block_visits')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(v => ({
        id: v.id,
        tenant_id: v.tenant_id,
        block_id: v.block_id,
        tractor_id: v.tractor_id,
        started_at: v.started_at,
        ended_at: v.ended_at,
        ping_count: v.ping_count ?? 0,
        created_at: v.created_at,
      }));
    },
    enabled: !!tenantId,
  });
}
