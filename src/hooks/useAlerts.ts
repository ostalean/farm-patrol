import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Alert } from '@/types/farm';

interface AlertInsert {
  tenant_id: string;
  block_id: string;
  rule_hours: number;
  is_recurring: boolean;
}

export function useAlerts(tenantId: string | null) {
  return useQuery({
    queryKey: ['alerts', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateAlertsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alerts: AlertInsert[]) => {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alerts)
        .select();

      if (error) throw error;
      return data as Alert[];
    },
    onSuccess: (_, variables) => {
      // Invalidate alerts query to refetch
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['alerts', variables[0].tenant_id] });
      }
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenantId }: { id: string; tenantId: string }) => {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return { id, tenantId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', data.tenantId] });
    },
  });
}

export function useDeleteAlertsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, tenantId }: { ids: string[]; tenantId: string }) => {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .in('id', ids)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return { ids, tenantId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts', data.tenantId] });
    },
  });
}
