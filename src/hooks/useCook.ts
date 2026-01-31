import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Cook, CookOrder, CookStatus, CookEarnings, CookOrderItem } from '@/types/cook';

export interface CookOrderHistory {
  id: string;
  order_id: string;
  cook_status: string;
  assigned_at: string;
  responded_at: string | null;
  order: {
    order_number: string;
    status: string;
    total_amount: number;
    guest_count: number | null;
    event_date: string | null;
    service_type: string;
    created_at: string;
    customer_id: string;
  };
  customer?: {
    name: string;
    mobile_number: string;
  };
  order_items?: CookOrderItem[];
}

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

      // Fetch assignments from order_assigned_cooks (include cooked status for visibility until shipped)
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

      // Fetch order items assigned to this cook
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          food_item_id,
          quantity,
          unit_price,
          total_price,
          food_item:food_items(id, name)
        `)
        .in('order_id', orderIds)
        .eq('assigned_cook_id', profile.id);

      // Group order items by order_id
      const orderItemsMap = new Map<string, typeof orderItems>();
      orderItems?.forEach(item => {
        if (!orderItemsMap.has(item.order_id)) {
          orderItemsMap.set(item.order_id, []);
        }
        orderItemsMap.get(item.order_id)!.push(item);
      });
      
      // Fetch customer details separately
      const ordersWithDetails = await Promise.all((orders || []).map(async (order) => {
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('name, mobile_number')
          .eq('user_id', order.customer_id)
          .maybeSingle();
        
        return {
          ...order,
          cook_status: assignmentMap.get(order.id) || 'pending',
          customer: customerProfile || undefined,
          order_items: orderItemsMap.get(order.id) || [],
        };
      }));
      
      return ordersWithDetails as CookOrder[];
    },
    enabled: !!profile?.id,
  });
}

export interface CookSettlement {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  order_id: string | null;
}

export function useCookEarnings() {
  const { data: profile } = useCookProfile();

  return useQuery({
    queryKey: ['cook-earnings', profile?.id],
    queryFn: async (): Promise<CookEarnings> => {
      if (!profile?.id) {
        return { total_orders_completed: 0, total_earnings: 0, pending_payout: 0 };
      }

      // Count completed orders (cook_status = 'ready')
      const { data: completedAssignments, error: assignError } = await supabase
        .from('order_assigned_cooks')
        .select('order_id')
        .eq('cook_id', profile.id)
        .eq('cook_status', 'ready');

      if (assignError) throw assignError;

      const completedOrderIds = completedAssignments?.map(a => a.order_id) || [];

      // Get settlements for this cook
      const { data: settlements, error: settleError } = await supabase
        .from('settlements')
        .select('amount, status')
        .eq('user_id', profile.user_id || '');

      if (settleError) throw settleError;

      const totalEarnings = settlements?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;
      const pendingPayout = settlements
        ?.filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + Number(s.amount), 0) || 0;

      return {
        total_orders_completed: completedOrderIds.length,
        total_earnings: totalEarnings,
        pending_payout: pendingPayout,
      };
    },
    enabled: !!profile?.id,
  });
}

export function useCookSettlements() {
  const { data: profile } = useCookProfile();

  return useQuery({
    queryKey: ['cook-settlements', profile?.user_id],
    queryFn: async (): Promise<CookSettlement[]> => {
      if (!profile?.user_id) return [];

      const { data, error } = await supabase
        .from('settlements')
        .select('id, amount, status, created_at, approved_at, order_id')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CookSettlement[];
    },
    enabled: !!profile?.user_id,
  });
}

export function useCookOrderHistory() {
  const { data: profile } = useCookProfile();

  return useQuery({
    queryKey: ['cook-order-history', profile?.id],
    queryFn: async (): Promise<CookOrderHistory[]> => {
      if (!profile?.id) return [];

      // Fetch all completed assignments
      const { data: assignments, error } = await supabase
        .from('order_assigned_cooks')
        .select(`
          id, order_id, cook_status, assigned_at, responded_at,
          order:orders(order_number, status, total_amount, guest_count, event_date, service_type, created_at, customer_id)
        `)
        .eq('cook_id', profile.id)
        .eq('cook_status', 'ready')
        .order('assigned_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!assignments || assignments.length === 0) return [];

      // Fetch customer profiles
      const customerIds = [...new Set(assignments.map((a: any) => a.order?.customer_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      // Fetch order items assigned to this cook
      const orderIds = assignments.map(a => a.order_id);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          id, order_id, food_item_id, quantity, unit_price, total_price,
          food_item:food_items(id, name)
        `)
        .in('order_id', orderIds)
        .eq('assigned_cook_id', profile.id);

      const orderItemsMap = new Map<string, typeof orderItems>();
      orderItems?.forEach(item => {
        if (!orderItemsMap.has(item.order_id)) {
          orderItemsMap.set(item.order_id, []);
        }
        orderItemsMap.get(item.order_id)!.push(item);
      });

      return assignments.map((a: any) => ({
        ...a,
        customer: a.order?.customer_id ? profileMap.get(a.order.customer_id) : null,
        order_items: orderItemsMap.get(a.order_id) || [],
      }));
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
      queryClient.invalidateQueries({ queryKey: ['cook-order-history'] });
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
