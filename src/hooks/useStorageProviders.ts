import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StorageProvider {
  id: string;
  provider_name: string;
  is_enabled: boolean;
  priority: number;
  credentials: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export const fetchActiveStorageProvider = async (): Promise<StorageProvider | null> => {
  const { data, error } = await supabase
    .from('storage_providers' as any)
    .select('*')
    .eq('is_enabled', true)
    .order('priority', { ascending: false })
    .limit(1);

  if (error) throw error;

  const providers = (data || []) as unknown as StorageProvider[];
  return providers.length > 0 ? providers[0] : null;
};

export const useStorageProviders = () => {
  return useQuery({
    queryKey: ['storage-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('storage_providers' as any)
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as StorageProvider[];
    },
  });
};

export const useCreateStorageProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (provider: { provider_name: string; credentials: Record<string, string>; priority?: number }) => {
      const { data, error } = await supabase
        .from('storage_providers' as any)
        .insert(provider as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-providers'] });
      queryClient.invalidateQueries({ queryKey: ['storage-providers', 'active'] });
      toast({ title: 'Provider added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to add provider', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateStorageProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StorageProvider> & { id: string }) => {
      const { error } = await supabase
        .from('storage_providers' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-providers'] });
      queryClient.invalidateQueries({ queryKey: ['storage-providers', 'active'] });
      toast({ title: 'Provider updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteStorageProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('storage_providers' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-providers'] });
      queryClient.invalidateQueries({ queryKey: ['storage-providers', 'active'] });
      toast({ title: 'Provider deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useActiveStorageProvider = () => {
  return useQuery({
    queryKey: ['storage-providers', 'active'],
    queryFn: fetchActiveStorageProvider,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
};
