import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CustomerAddress {
  id: string;
  user_id: string;
  address_label: string;
  full_address: string;
  landmark: string | null;
  panchayat_id: string | null;
  ward_number: number | null;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressInput {
  address_label?: string;
  full_address: string;
  landmark?: string;
  panchayat_id?: string;
  ward_number?: number;
  is_default?: boolean;
  latitude?: number;
  longitude?: number;
}

export const useCustomerAddresses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: addresses, isLoading, error } = useQuery({
    queryKey: ['customer-addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerAddress[];
    },
    enabled: !!user,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (input: CreateAddressInput) => {
      if (!user) throw new Error('User not authenticated');

      // If setting as default, unset other defaults first
      if (input.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({
          user_id: user.id,
          address_label: input.address_label || 'Home',
          full_address: input.full_address,
          landmark: input.landmark || null,
          panchayat_id: input.panchayat_id || null,
          ward_number: input.ward_number || null,
          is_default: input.is_default || false,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CustomerAddress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', user?.id] });
      toast({ title: 'Address saved' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateAddressInput> & { id: string }) => {
      if (!user) throw new Error('User not authenticated');

      // If setting as default, unset other defaults first
      if (input.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('customer_addresses')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomerAddress;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', user?.id] });
      toast({ title: 'Address updated' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', user?.id] });
      toast({ title: 'Address removed' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete address',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      // Unset all defaults first
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set the new default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', user?.id] });
      toast({ title: 'Default address updated' });
    },
  });

  const defaultAddress = addresses?.find(a => a.is_default) || addresses?.[0];

  return {
    addresses: addresses || [],
    isLoading,
    error,
    defaultAddress,
    createAddress: createAddressMutation.mutate,
    updateAddress: updateAddressMutation.mutate,
    deleteAddress: deleteAddressMutation.mutate,
    setDefaultAddress: setDefaultAddressMutation.mutate,
    isCreating: createAddressMutation.isPending,
    isUpdating: updateAddressMutation.isPending,
    isDeleting: deleteAddressMutation.isPending,
  };
};
