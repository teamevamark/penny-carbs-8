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
  const { data: profile } = useDeliveryProfile();

  return useQuery({
    queryKey: ['delivery-wallet', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('delivery_wallets')
        .select('*')
        .eq('delivery_staff_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('Wallet fetch error:', error);
        throw error;
      }
      return data as DeliveryWallet | null;
    },
    enabled: !!profile?.id,
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
          delivery_amount,
          delivery_status,
          delivery_address,
          delivery_instructions,
          estimated_delivery_minutes,
          delivery_eta,
          panchayat_id,
          ward_number,
          created_at,
          delivered_at,
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
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}

export function useDeliveryOrderHistory(startDate?: Date, endDate?: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['delivery-order-history', user?.id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_type,
          total_amount,
          delivery_amount,
          delivery_status,
          delivery_address,
          delivery_instructions,
          panchayat_id,
          ward_number,
          created_at,
          delivered_at,
          customer_id
        `)
        .eq('assigned_delivery_id', user.id)
        .order('created_at', { ascending: false });

      // Add date filters
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        // Add 1 day to include the entire end date
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

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

      // Build list of all panchayat IDs this staff is connected to
      const panchayatIds = [profile.panchayat_id, ...(profile.assigned_panchayat_ids || [])].filter(Boolean);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          service_type,
          total_amount,
          delivery_amount,
          delivery_status,
          delivery_address,
          delivery_instructions,
          estimated_delivery_minutes,
          delivery_eta,
          panchayat_id,
          ward_number,
          created_at,
          delivered_at,
          customer_id
        `)
        .in('panchayat_id', panchayatIds)
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
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  const { data: profile } = useDeliveryProfile();

  return useMutation({
    mutationFn: async ({ orderId, status, orderAmount, deliveryCharge }: { 
      orderId: string; 
      status: DeliveryStatus;
      orderAmount?: number;
      deliveryCharge?: number;
    }) => {
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

      // Update wallet when order is delivered
      if (status === 'delivered' && profile?.id) {
        // Get current wallet
        const { data: wallet } = await supabase
          .from('delivery_wallets')
          .select('*')
          .eq('delivery_staff_id', profile.id)
          .maybeSingle();

        if (wallet) {
          // Update wallet: collected_amount = order total, job_earnings = delivery charge
          const newCollectedAmount = (wallet.collected_amount || 0) + (orderAmount || 0);
          const newJobEarnings = (wallet.job_earnings || 0) + (deliveryCharge || 0);

          await supabase
            .from('delivery_wallets')
            .update({
              collected_amount: newCollectedAmount,
              job_earnings: newJobEarnings,
              updated_at: new Date().toISOString(),
            })
            .eq('delivery_staff_id', profile.id);

          // Create wallet transactions for tracking
          if (orderAmount && orderAmount > 0) {
            await supabase.from('wallet_transactions').insert({
              delivery_staff_id: profile.id,
              order_id: orderId,
              transaction_type: 'collection',
              amount: orderAmount,
              description: 'Order amount collected',
              status: 'pending',
            });
          }

          if (deliveryCharge && deliveryCharge > 0) {
            await supabase.from('wallet_transactions').insert({
              delivery_staff_id: profile.id,
              order_id: orderId,
              transaction_type: 'earning',
              amount: deliveryCharge,
              description: 'Delivery charge earned',
              status: 'approved',
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['available-delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-order-history'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
  });
}

export function useAcceptDelivery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('accept_delivery_order', {
        p_order_id: orderId,
      });

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
