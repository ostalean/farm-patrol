import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GpsPing {
  ts: string;
  lat: number;
  lon: number;
  speed?: number;
}

interface ImportStats {
  total: number;
  inserted: number;
  duplicates: number;
  errors: number;
  errorDetails: { row: number; reason: string }[];
}

interface ImportProgress {
  currentChunk: number;
  totalChunks: number;
  totalProcessed: number;
  stats: ImportStats;
}

export function useGpsImport() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  const importPings = useCallback(async (
    tractorId: string,
    pings: GpsPing[],
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportStats> => {
    setIsImporting(true);
    
    const CHUNK_SIZE = 1000;
    const totalChunks = Math.ceil(pings.length / CHUNK_SIZE);
    
    const aggregatedStats: ImportStats = {
      total: pings.length,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: [],
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      for (let i = 0; i < pings.length; i += CHUNK_SIZE) {
        const chunk = pings.slice(i, i + CHUNK_SIZE);
        const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;

        const response = await supabase.functions.invoke('import-gps-data', {
          body: {
            tractor_id: tractorId,
            pings: chunk,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Error en la importación');
        }

        const result = response.data;
        
        if (result.stats) {
          aggregatedStats.inserted += result.stats.inserted;
          aggregatedStats.duplicates += result.stats.duplicates;
          aggregatedStats.errors += result.stats.errors;
          if (result.stats.errorDetails) {
            // Adjust row numbers for the chunk offset
            const adjustedErrors = result.stats.errorDetails.map((e: { row: number; reason: string }) => ({
              row: e.row + i,
              reason: e.reason,
            }));
            aggregatedStats.errorDetails.push(...adjustedErrors);
          }
        }

        const currentProgress: ImportProgress = {
          currentChunk,
          totalChunks,
          totalProcessed: Math.min(i + CHUNK_SIZE, pings.length),
          stats: { ...aggregatedStats },
        };

        setProgress(currentProgress);
        onProgress?.(currentProgress);
      }

      toast({
        title: 'Importación completada',
        description: `${aggregatedStats.inserted} pings importados, ${aggregatedStats.duplicates} duplicados, ${aggregatedStats.errors} errores`,
      });

      return aggregatedStats;

    } catch (error: any) {
      toast({
        title: 'Error en la importación',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsImporting(false);
    }
  }, [toast]);

  const reset = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    importPings,
    isImporting,
    progress,
    reset,
  };
}
