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
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as Cook | null;
    },
    enabled: !!user?.id,
  });
}

export function useCookOrders() {
  const { user } = useAuth();
  const { data: profile } = useCookProfile();

  return useQuery({
    queryKey: ['cook-orders', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Fetch assignments from order_assigned_cooks
      const { data: assignments, error: assignError } = await supabase
        .from('order_assigned_cooks')
        .select('order_id, cook_status')
        .eq('cook_id', profile.id)
        .in('cook_status', ['pending', 'accepted', 'preparing', 'cooked']);

      if (assignError) throw assignError;
      if (!assignments || assignments.length === 0) return [];

      const orderIds = assignments.map(a => a.order_id);

      // Fetch orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_type,
          total_amount,
          event_date,
          event_details,
          delivery_address,
          guest_count,
          created_at,
          customer_id
        `)
        .in('id', orderIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Merge cook_status from assignments
      const assignmentMap = new Map(assignments.map(a => [a.order_id, a.cook_status]));
      
      // Fetch customer details separately
      const ordersWithCustomers = await Promise.all((orders || []).map(async (order) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, mobile_number')
          .eq('user_id', order.customer_id)
          .maybeSingle();
        
        return {
          ...order,
          cook_status: assignmentMap.get(order.id) || 'pending',
          customer: profile || undefined,
        };
      }));
      
      return ordersWithCustomers as CookOrder[];
    },
    enabled: !!profile?.id,
  });
}

export function useUpdateCookStatus() {
  const queryClient = useQueryClient();
  const { data: profile } = useCookProfile();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: CookStatus }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Update the assignment status
      const { error } = await supabase
        .from('order_assigned_cooks')
        .update({ 
          cook_status: status,
          responded_at: status === 'accepted' ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)
        .eq('cook_id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-orders'] });
    },
  });
}

export function useUpdateCookAvailability() {
  const queryClient = useQueryClient();
  const { data: profile } = useCookProfile();

  return useMutation({
    mutationFn: async (isAvailable: boolean) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('cooks')
        .update({ is_available: isAvailable })
        .eq('id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-profile'] });
    },
  });
}
