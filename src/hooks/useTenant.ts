import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useTenant() {
  const { user } = useAuth();

  const { data: tenantId, isLoading, error } = useQuery({
    queryKey: ['tenant', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data?.tenant_id ?? null;
    },
    enabled: !!user?.id,
    staleTime: Infinity, // tenant_id doesn't change
  });

  return { tenantId, isLoading, error };
}
