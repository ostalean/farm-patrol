import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/hooks/useTenant';

interface ProcessVisitsResult {
  success: boolean;
  visitsCreated: number;
  metricsUpdated: number;
  errors: string[];
}

export function useProcessVisits() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const processVisits = useCallback(async (options?: {
    blockId?: string;
    tractorId?: string;
  }): Promise<ProcessVisitsResult | null> => {
    if (!tenantId) {
      toast({
        title: 'Error',
        description: 'No se encontró el tenant',
        variant: 'destructive',
      });
      return null;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-historical-visits', {
        body: {
          tenant_id: tenantId,
          block_id: options?.blockId,
          tractor_id: options?.tractorId,
        },
      });

      if (error) {
        throw error;
      }

      const result = data as ProcessVisitsResult;

      if (result.success) {
        // Invalidate caches to force UI refresh with new data
        await queryClient.invalidateQueries({ queryKey: ['visits'] });
        await queryClient.invalidateQueries({ queryKey: ['block-metrics'] });
        
        toast({
          title: 'Visitas procesadas',
          description: `Se crearon ${result.visitsCreated} visitas y se actualizaron ${result.metricsUpdated} métricas`,
        });
      } else {
        toast({
          title: 'Error al procesar',
          description: result.errors.join(', '),
          variant: 'destructive',
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error processing visits:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al procesar visitas',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [tenantId, toast, queryClient]);

  return {
    processVisits,
    isProcessing,
  };
}
