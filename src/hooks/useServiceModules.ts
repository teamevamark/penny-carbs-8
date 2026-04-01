import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ServiceModule {
  id: string;
  service_type: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useServiceModules() {
  return useQuery({
    queryKey: ['service-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_modules')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ServiceModule[];
    },
  });
}

export function useActiveServiceTypes() {
  return useQuery({
    queryKey: ['service-modules', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_modules')
        .select('service_type')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map((d) => d.service_type);
    },
  });
}

export function useToggleServiceModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('service_modules')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-modules'] });
      toast({ title: 'Module updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update module', description: error.message, variant: 'destructive' });
    },
  });
}
