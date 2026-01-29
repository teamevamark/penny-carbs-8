import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cook, CookOrder, CookStatus } from '@/types/cook';

export function useCookProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cook-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('cooks')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Cook | null;
    },
    enabled: !!user?.id,
  });
}

export function useCookOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cook-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_type,
          total_amount,
          cook_status,
          event_date,
          event_details,
          delivery_address,
          guest_count,
          created_at,
          customer_id
        `)
        .eq('assigned_cook_id', user.id)
        .in('cook_status', ['pending', 'accepted', 'preparing', 'cooked'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch customer details separately
      const ordersWithCustomers = await Promise.all((data || []).map(async (order) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, mobile_number')
          .eq('user_id', order.customer_id)
          .maybeSingle();
        
        return {
          ...order,
          customer: profile || undefined,
        };
      }));
      
      return ordersWithCustomers as CookOrder[];
    },
    enabled: !!user?.id,
  });
}

export function useUpdateCookStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: CookStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          cook_status: status,
          cook_responded_at: status === 'accepted' ? new Date().toISOString() : undefined,
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-orders'] });
    },
  });
}

export function useUpdateCookAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (isAvailable: boolean) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cooks')
        .update({ is_available: isAvailable })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-profile'] });
    },
  });
}
