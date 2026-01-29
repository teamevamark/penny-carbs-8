import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DeliveryStaff, DeliveryWallet, WalletTransaction, DeliveryOrder, DeliveryStatus } from '@/types/delivery';

export function useDeliveryProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['delivery-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('delivery_staff')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as DeliveryStaff | null;
    },
    enabled: !!user?.id,
  });
}

export function useDeliveryWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['delivery-wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the delivery staff id
      const { data: staffData } = await supabase
        .from('delivery_staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!staffData) return null;

      const { data, error } = await supabase
        .from('delivery_wallets')
        .select('*')
        .eq('delivery_staff_id', staffData.id)
        .maybeSingle();

      if (error) throw error;
      return data as DeliveryWallet | null;
    },
    enabled: !!user?.id,
  });
}

export function useWalletTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: staffData } = await supabase
        .from('delivery_staff')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!staffData) return [];

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('delivery_staff_id', staffData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as WalletTransaction[];
    },
    enabled: !!user?.id,
  });
}

export function useDeliveryOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['delivery-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_type,
          total_amount,
          delivery_status,
          delivery_address,
          delivery_instructions,
          estimated_delivery_minutes,
          delivery_eta,
          panchayat_id,
          ward_number,
          created_at,
          customer_id
        `)
        .eq('assigned_delivery_id', user.id)
        .in('delivery_status', ['assigned', 'picked_up'])
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

      return ordersWithCustomers as DeliveryOrder[];
    },
    enabled: !!user?.id,
  });
}

export function useAvailableDeliveryOrders() {
  const { data: profile } = useDeliveryProfile();

  return useQuery({
    queryKey: ['available-delivery-orders', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      // For registered partners, show orders in their ward that aren't assigned
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_type,
          total_amount,
          delivery_status,
          delivery_address,
          delivery_instructions,
          estimated_delivery_minutes,
          delivery_eta,
          panchayat_id,
          ward_number,
          created_at,
          customer_id
        `)
        .eq('panchayat_id', profile.panchayat_id)
        .in('service_type', ['cloud_kitchen', 'homemade'])
        .eq('cook_status', 'ready')
        .eq('delivery_status', 'pending')
        .is('assigned_delivery_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch customer details separately
      const ordersWithCustomers = await Promise.all((data || []).map(async (order) => {
        const { data: orderProfile } = await supabase
          .from('profiles')
          .select('name, mobile_number')
          .eq('user_id', order.customer_id)
          .maybeSingle();
        
        return {
          ...order,
          customer: orderProfile || undefined,
        };
      }));
      
      // Filter by assigned wards for registered partners
      if (profile.staff_type === 'registered_partner' && profile.assigned_wards.length > 0) {
        return ordersWithCustomers.filter(order => 
          profile.assigned_wards.includes(order.ward_number)
        ) as DeliveryOrder[];
      }

      return ordersWithCustomers as DeliveryOrder[];
    },
    enabled: !!profile && profile.is_approved,
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: DeliveryStatus }) => {
      const updateData: Record<string, unknown> = { delivery_status: status };
      
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
        updateData.status = 'delivered';
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['available-delivery-orders'] });
    },
  });
}

export function useAcceptDelivery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_delivery_id: user.id,
          delivery_status: 'assigned',
          delivery_eta: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        })
        .eq('id', orderId)
        .is('assigned_delivery_id', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['available-delivery-orders'] });
    },
  });
}

export function useUpdateDeliveryAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (isAvailable: boolean) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('delivery_staff')
        .update({ is_available: isAvailable })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] });
    },
  });
}
