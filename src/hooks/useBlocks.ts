import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Block, BlockMetrics } from '@/types/farm';
import type { Feature, Polygon } from 'geojson';
import type { Database } from '@/integrations/supabase/types';

type BlockInsert = Database['public']['Tables']['blocks']['Insert'];

export function useBlocks(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['blocks', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Cast geometry_geojson from Json to Feature<Polygon>
      return (data || []).map(block => ({
        ...block,
        geometry_geojson: block.geometry_geojson as unknown as Feature<Polygon>,
      })) as Block[];
    },
    enabled: !!tenantId,
  });
}

export function useBlockMetrics(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['block_metrics', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('block_metrics')
        .select('*');
      
      if (error) throw error;
      
      // Convert array to Record<blockId, metrics>
      const metricsMap: Record<string, BlockMetrics> = {};
      (data || []).forEach(m => {
        metricsMap[m.block_id] = m as BlockMetrics;
      });
      return metricsMap;
    },
    enabled: !!tenantId,
  });
}

interface CreateBlockInput {
  tenant_id: string;
  name: string;
  farm_name: string | null;
  crop: string | null;
  geometry_geojson: Feature<Polygon>;
  metadata?: Record<string, unknown>;
}

export function useCreateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBlockInput) => {
      const blockData: BlockInsert = {
        tenant_id: input.tenant_id,
        name: input.name,
        farm_name: input.farm_name,
        crop: input.crop,
        geometry_geojson: JSON.parse(JSON.stringify(input.geometry_geojson)),
        metadata: JSON.parse(JSON.stringify(input.metadata || {})),
      };

      const { data: block, error: blockError } = await supabase
        .from('blocks')
        .insert(blockData)
        .select()
        .single();
      
      if (blockError) throw blockError;

      // Create initial metrics for the block
      const { error: metricsError } = await supabase
        .from('block_metrics')
        .insert({
          block_id: block.id,
          total_passes: 0,
          passes_24h: 0,
          passes_7d: 0,
        });
      
      if (metricsError) {
        console.error('Failed to create block metrics:', metricsError);
      }

      return {
        ...block,
        geometry_geojson: block.geometry_geojson as unknown as Feature<Polygon>,
      } as Block;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', variables.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['block_metrics', variables.tenant_id] });
    },
  });
}

export function useCreateBlocksBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: CreateBlockInput[]) => {
      if (inputs.length === 0) return [];

      const insertedBlocks: Block[] = [];
      
      for (const input of inputs) {
        const blockData: BlockInsert = {
          tenant_id: input.tenant_id,
          name: input.name,
          farm_name: input.farm_name,
          crop: input.crop,
          geometry_geojson: JSON.parse(JSON.stringify(input.geometry_geojson)),
          metadata: JSON.parse(JSON.stringify(input.metadata || {})),
        };

        const { data: block, error: blockError } = await supabase
          .from('blocks')
          .insert(blockData)
          .select()
          .single();
        
        if (blockError) throw blockError;
        
        insertedBlocks.push({
          ...block,
          geometry_geojson: block.geometry_geojson as unknown as Feature<Polygon>,
        } as Block);
      }

      // Create initial metrics for all blocks
      for (const block of insertedBlocks) {
        await supabase.from('block_metrics').insert({
          block_id: block.id,
          total_passes: 0,
          passes_24h: 0,
          passes_7d: 0,
        });
      }

      return insertedBlocks;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['blocks', variables[0].tenant_id] });
        queryClient.invalidateQueries({ queryKey: ['block_metrics', variables[0].tenant_id] });
      }
    },
  });
}

interface UpdateBlockInput {
  id: string;
  tenant_id: string;
  name?: string;
  farm_name?: string | null;
  crop?: string | null;
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBlockInput) => {
      const { id, tenant_id, ...updates } = input;
      
      const { data: block, error } = await supabase
        .from('blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      return {
        ...block,
        geometry_geojson: block.geometry_geojson as unknown as Feature<Polygon>,
      } as Block;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', variables.tenant_id] });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenant_id }: { id: string; tenant_id: string }) => {
      // First delete related block_metrics
      await supabase.from('block_metrics').delete().eq('block_id', id);
      
      // Then delete the block
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', variables.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['block_metrics', variables.tenant_id] });
    },
  });
}
