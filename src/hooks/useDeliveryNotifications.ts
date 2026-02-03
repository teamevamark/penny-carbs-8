import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDeliveryProfile } from './useDeliveryStaff';
import type { DeliveryOrder } from '@/types/delivery';

const ORDER_ACCEPT_CUTOFF_SECONDS = 120; // 2 minutes to accept

export interface PendingDeliveryOrder extends DeliveryOrder {
  cutoff_at: Date;
  seconds_remaining: number;
}

export interface OrderTakenInfo {
  orderId: string;
  orderNumber: string;
  takenBy: string;
}

export function useDeliveryNotifications() {
  const queryClient = useQueryClient();
  const { data: profile } = useDeliveryProfile();
  const [pendingOrders, setPendingOrders] = useState<PendingDeliveryOrder[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [ordersTaken, setOrdersTaken] = useState<OrderTakenInfo[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,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2LJKKwhIwezbrnQhZpJWwubaunotHF5Ync/g2LJJKghIwezbrnQhZpJXwubbunotHF5Ync/g2bJJKghIwu3brnQhZpJXwubbunotHF5Ync/g2bJJKghIwu3brnQhZpJXw+bbunotG15Ync/h2bJJKghIwu3brnQgZpJXw+fcunotG15Ync/h2bJJKQhIwu3cr3QgZpJXw+fcunotG15Ync/h2rJJKQhIwu3cr3QgZpJXw+fcu3otG15Zns/h2rJJKQhIwu3cr3QgZpNXw+fcu3otG15Zns/h2rJJKQhIw+3cr3QgZpNXw+fcu3otG15Zns/h2rJIKQhIw+3cr3QgZpNXw+jdu3otG15Zns/h27JIKQhIw+3cr3UgZpNXw+jdu3stG15Zns/h27JIKQhIw+7cr3UgZpNXw+jdu3stG15Zns/i27JIKQhIw+7cr3UgZpNYxOjdu3stG15Zns/i27JIKQhJw+7dr3UgZpNYxOjdu3stG15Zntfi27JIKQhJw+7dr4UgZpNYxOjdvHstG15ZntDi27JIKQhJw+7dr4UgZpNYxOjdvHstG15ZntDi3LJIKQhJw+7dr4UfZpNYxOndvHstG15ZntDi3LJIKQhJw+7dr4UfZpNYxendvHstG15ZntDi3LJHKQhJxO7dr4UfZpNYxendvXstG15antDi3LJHKQhJxO7dr4YfZpRYxendvXstG15antDi3LJHKQhJxO7er4YfZpRYxendvXstG15antDj3bJHKQhJxO7er4YfZpRYxendvXwtGl5antDj3bJHKAhJxO7er4YfZpRZxendvXwtGl5antHj3bJHKAhJxO/er4YfZpRZxu7evXwtGl5antHj3bJHKAhJxO/er4YfZpRZxu7evXwtGl5antHj3bJHKAhJxO/er4YeZpRZxu7evnwtGl5antHj3rJHKAhJxO/er4YeZpRZxu/evnwtGl5bntHj3rJGKAhJxe/er4YeZpRZxu/evnwtGl5bntHj3rJGKAhJxe/er4YeZpRZxu/fvnwtGl5bntHj37JGKAhJxe/er4YeZpRZxu/fvnwtGl5bntHk37JGKAhJxe/fr4YeZpRZx+/fvnwtGl5bntHk37JGJwhJxe/fr5YeZpRax+/fvnwtGl5bntHk37JGJwhJxe/fr5YeZpRax+/fv3wtGl5bntLk4LJGJwhJxe/fr5YeZpVax+/fv3wtGl5bntLk4LJGJwhJxe/fr5YeZpVax/DgwHwtGl5bntLk4LJGJwhKxe/fr5YdZpVax/DgwHwtGl5cntLk4LJFJwhKxe/fr5YdZpVax/DgwHwtGl5cntLk4bJFJwhKxu/fr5YdZpVax/DgwXwtGl5cntLk4bJFJwhKxu/fr5YdZpVax/DgwXwtGl5cntPk4bJFJwhKxu/gr5YdZpVax/DhwXwtGV5cntPk4bJFJwhKxu/gr5YdZpVax/DhwXwtGV5cntPk4bJFJwhKxu/gr5cdZpVax/DhwXwtGV5cntPl4rJFJwhKxu/gr5cdZpVax/DhwXwtGV5cntPl4rJFJghKxu/gr5cdZpVax/DhwXwsGV5cntPl4rJFJghKxu/gr5cdZpVax/DhwXwsGV5cntPl47JFJghKxu/gr5cdZpVayPDhwXwsGV5dntPl47JFJghKx+/hr5cdZpVayPDhwnwsGV5dntPl47JEJghKx+/hr5cdZpZayPDiwnsGV5dntPl47JEJghKx+/hr5cdZpZayPDiwnsGV5dntTl47JEJghKx+/hr5ccZpZayPDiwnsGV5dntTl47JEJghLx+/hr5ccZpZayPDiwnsGV5dn9Tl47JEJghLx+/hr5ccZpZayPHiwnsGV5dn9Tl47JEJghLx+/hr5ccZpZayPHiwnsGV5dn9Tl5LJEJghLx+/hr5ccZpZayPHiwnsMV5dn9Tl5LJEJghLx+/hr5ccZpZayPHiwnsNV5dn9Tl5LJEJQhLx+/ir5ccZpZayPHiwnsMV5dn9Tl5LJEJQhLx+/ir5ccZpZbyPHiwnsMV5dn9Tl5LJEJQhLx+/ir5ccZpZbyPLiwnsNV5dn9Xl5LJEJQhLx+/ir5ccZpZbyPLjwnsMV5dn9Xl5LJDJQhLx+/ir5bcZpZbyPLjwnsMV5do9Xl5LJDJQhLx+/ir5bcZpZbyPLjwnsNV5do9Xl5bJDJQhLx+/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5doNXl5bJDJQhLyO/ir6bcZpZbyfLjwnsNV5doNXl5bJDJQhLyO/ir6bcZpZbyf');
      }
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (e) {
      // Ignore audio errors
    }
  }, []);

  // Check if order matches staff location (panchayat and ward)
  const orderMatchesLocation = useCallback((order: any) => {
    if (!profile) return false;

    // Check if panchayat matches - staff's own panchayat or any assigned panchayat
    const assignedPanchayats = profile.assigned_panchayat_ids || [];
    const matchesPanchayat = 
      profile.panchayat_id === order.panchayat_id ||
      assignedPanchayats.includes(order.panchayat_id);

    if (!matchesPanchayat) return false;

    // For registered partners with specific ward assignments, check ward
    if (profile.staff_type === 'registered_partner' && profile.assigned_wards && profile.assigned_wards.length > 0) {
      return profile.assigned_wards.includes(order.ward_number);
    }

    // Fixed salary staff or partners without specific wards get all orders in their panchayat
    return true;
  }, [profile]);

  // Add order to pending list with cutoff time
  const addPendingOrder = useCallback(async (orderData: any) => {
    // Fetch customer details
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('name, mobile_number')
      .eq('user_id', orderData.customer_id)
      .maybeSingle();

    const newOrder: PendingDeliveryOrder = {
      id: orderData.id,
      order_number: orderData.order_number,
      service_type: orderData.service_type,
      total_amount: orderData.total_amount,
      delivery_status: orderData.delivery_status || 'pending',
      delivery_address: orderData.delivery_address,
      delivery_instructions: orderData.delivery_instructions,
      estimated_delivery_minutes: orderData.estimated_delivery_minutes || 60,
      delivery_eta: orderData.delivery_eta,
      panchayat_id: orderData.panchayat_id,
      ward_number: orderData.ward_number,
      created_at: orderData.created_at,
      customer: customerProfile || undefined,
      cutoff_at: new Date(Date.now() + ORDER_ACCEPT_CUTOFF_SECONDS * 1000),
      seconds_remaining: ORDER_ACCEPT_CUTOFF_SECONDS,
    };

    setPendingOrders(prev => {
      // Don't add if already exists or already taken
      if (prev.find(o => o.id === newOrder.id)) return prev;
      return [...prev, newOrder];
    });
    setShowAlert(true);
    playNotificationSound();
  }, [playNotificationSound]);

  // Remove order from pending (accepted by someone or expired)
  const removeOrder = useCallback((orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  // Clear order taken notification
  const clearOrderTaken = useCallback((orderId: string) => {
    setOrdersTaken(prev => prev.filter(o => o.orderId !== orderId));
  }, []);

  // Dismiss alert
  const dismissAlert = useCallback(() => {
    setShowAlert(false);
  }, []);

  // Update countdown timers
  useEffect(() => {
    if (pendingOrders.length === 0) return;

    const interval = setInterval(() => {
      setPendingOrders(prev => 
        prev.map(order => ({
          ...order,
          seconds_remaining: Math.max(0, Math.floor((order.cutoff_at.getTime() - Date.now()) / 1000))
        })).filter(order => order.seconds_remaining > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  // Close alert when no pending orders
  useEffect(() => {
    if (pendingOrders.length === 0) {
      setShowAlert(false);
    }
  }, [pendingOrders.length]);

  // Subscribe to real-time order updates for delivery staff
  useEffect(() => {
    if (!profile?.is_approved || !profile?.is_available) return;

    console.log('[DeliveryNotifications] Setting up realtime subscriptions for staff:', profile.id);

    // Subscribe to new orders that need delivery (status = confirmed or cook_status = ready)
    const channel = supabase
      .channel('delivery-orders-realtime')
      // Listen for orders becoming ready for pickup (cook finished)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Only process cloud_kitchen and homemade orders
          if (!['cloud_kitchen', 'homemade'].includes(order.service_type)) return;
          
          // Check if order just became ready for delivery (cook_status changed to ready)
          const justBecameReady = 
            order.cook_status === 'ready' && 
            oldOrder.cook_status !== 'ready';
          
          // Check if order is confirmed and pending delivery
          const pendingDelivery = 
            order.delivery_status === 'pending' &&
            !order.assigned_delivery_id;
          
          if (justBecameReady && pendingDelivery && orderMatchesLocation(order)) {
            console.log('[DeliveryNotifications] New order ready for delivery:', order.order_number);
            addPendingOrder(order);
          }
          
          // Handle order being taken by another staff member
          if (order.assigned_delivery_id && !oldOrder.assigned_delivery_id) {
            console.log('[DeliveryNotifications] Order taken:', order.order_number);
            
            // If we had this order in pending, remove it and show "taken" notification
            setPendingOrders(prev => {
              const hadOrder = prev.find(o => o.id === order.id);
              if (hadOrder) {
                // Show "order taken" notification
                setOrdersTaken(prevTaken => [
                  ...prevTaken,
                  { 
                    orderId: order.id, 
                    orderNumber: order.order_number,
                    takenBy: 'another driver'
                  }
                ]);
                // Auto-dismiss after 5 seconds
                setTimeout(() => clearOrderTaken(order.id), 5000);
              }
              return prev.filter(o => o.id !== order.id);
            });
            
            // Refresh queries
            queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
            queryClient.invalidateQueries({ queryKey: ['available-delivery-orders'] });
          }
        }
      )
      // Listen for new orders being placed (confirmed status)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as any;
          
          // For homemade orders, they might be ready immediately
          if (
            order.service_type === 'homemade' &&
            order.status === 'confirmed' &&
            order.cook_status === 'ready' &&
            !order.assigned_delivery_id &&
            orderMatchesLocation(order)
          ) {
            console.log('[DeliveryNotifications] New homemade order ready:', order.order_number);
            addPendingOrder(order);
          }
        }
      )
      .subscribe((status) => {
        console.log('[DeliveryNotifications] Subscription status:', status);
      });

    return () => {
      console.log('[DeliveryNotifications] Cleaning up subscriptions');
      supabase.removeChannel(channel);
    };
  }, [profile, orderMatchesLocation, addPendingOrder, clearOrderTaken, queryClient]);

  // Load existing pending orders on mount
  useEffect(() => {
    if (!profile?.is_approved || !profile?.is_available) return;

    const loadPendingOrders = async () => {
      console.log('[DeliveryNotifications] Loading existing pending orders');
      
      // Build query for orders matching location
      let query = supabase
        .from('orders')
        .select('*')
        .in('service_type', ['cloud_kitchen', 'homemade'])
        .eq('cook_status', 'ready')
        .eq('delivery_status', 'pending')
        .is('assigned_delivery_id', null)
        .order('created_at', { ascending: false });

      // Filter by panchayat
      const panchayatIds = [profile.panchayat_id, ...(profile.assigned_panchayat_ids || [])].filter(Boolean);
      if (panchayatIds.length > 0) {
        query = query.in('panchayat_id', panchayatIds);
      }

      const { data: orders, error } = await query;
      
      if (error) {
        console.error('[DeliveryNotifications] Error loading orders:', error);
        return;
      }

      // Filter by ward if applicable
      let filteredOrders = orders || [];
      if (profile.staff_type === 'registered_partner' && profile.assigned_wards && profile.assigned_wards.length > 0) {
        filteredOrders = filteredOrders.filter(order => 
          profile.assigned_wards!.includes(order.ward_number)
        );
      }

      // Add each order to pending
      for (const order of filteredOrders) {
        await addPendingOrder(order);
      }
    };

    loadPendingOrders();
  }, [profile?.id, profile?.is_approved, profile?.is_available]);

  return {
    pendingOrders,
    showAlert,
    dismissAlert,
    removeOrder,
    ordersTaken,
    clearOrderTaken,
    ORDER_ACCEPT_CUTOFF_SECONDS,
  };
}

// Hook for admin to get unaccepted orders notifications (real-time)
export function useAdminDeliveryAlerts() {
  const queryClient = useQueryClient();
  const [unacceptedOrders, setUnacceptedOrders] = useState<any[]>([]);
  const [showAdminAlert, setShowAdminAlert] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play alert sound for admin
  const playAdminAlertSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVkpgG/A6d2veUI0OYp7t+PVrGQyLl9Xg83e1q1IMAZAqdnNhFMmRodTvODTrGkjHGVTlMfY0K5KLghCpt3KhVQsToNRw+bZsnQyImNPlMfXxa5OLgdAt+XZoWApV4xRwuPVsnQuI2RSj8fXya9OMgpBu+bYom4nYIxRvN/Tr3UxIWFTlsjZybBPMwlCvebVpnElZ4xRvN/Tr3UxIWFTlsjZybBPMwlCvebVpnElZ4xRvN/Tr3YxIWFSlsjZybBPMwlCvebVp3AlZ41RvN/Tr3YxIWFSlsjZybBPMwlCvebVp3AlZ41RvN/UsHYxIWBSlsnZybBPMwlCvefVp3AlZ41RvODUsHYwIGBSlsnZyrBPMghCvufVp3AlZo1RvODUsHYwIGBSlsnZyrBPMghCvufVp3AlZo1SvODUsHYwIF9Slsraz7BOMQhDvefVp3AlZo1SvODUsHcwIF9Sl8vazrBOMQhDvefVp3EkZo1SvODUsHcwIF9Sl8vazrBOMQhDvefVp3EkZo5SvODUsHcwIF9Sl8vazrBOMQhDvefVp3EkZo5SvODUsHcwIF9Tl8vazrBOMQhDvefWp3EkZo5SvODUsXcwIF9Tl8vaz7BOMQhDvujWp3EkZo5SvODUsXcwH19Tl8vaz7BOMAhDvujWqHEkZo5SvODVsXcwH19Tl8vaz7BOMAhDvujWqHEkZo5TvODVsXcwH19Tl8va0LBOMAhDvujWqHEkZo5TveHVsXcwH19Tl8va0LBOMAhDvujWqHEkZo5TveHVsncwH19Tl8za0LBOLwhEvujWqHEkZo5TveHVsncwH19Umcza0bBOLwhEvunWqXEkZo5TveHVsncvH19UmczZ0bBNLwhEvunXqXEkZo9TveHVsncvH19UmczZ0bFNLwhEvunXqXEkZo9TveHVsncvH19UmczZ0bFNLwhEvunXqXEkZo9TvuHVs3cvH19UmczZ0bFNLwhEvunXqXEkZo9TvuHVs3cvH19UmczZ0bFNLwhEvunXqXEkZo9UvuHVs3cvH19Umcza0rFNLwhFvunXqXEjZo9UvuLWs3cvH19Umcza0rFNLwhFvunYqnEjZo9UvuLWs3cvHl9Umcza0rFNLghFvunYqnEjZo9UvuLWtHcvHl9Umcza0rJNLghFvurYqnEjZo9UvuLWtHcvHl5Vmcza0rJNLghFvurYqnEjZ5BUvuLWtHcvHl5Vmcza07JNLghFvurYqnEjZ5BUv+LWtHcvHl5Vmsze07JNLQhFvurYqnIjZ5BUv+LWtHguHl5Vmsze07JNLQhFvurYq3IjZ5BUv+LWtXguHl5Vmsze07JNLQhGvurZq3IjZ5BVv+LXtXguHl5Vmsze07JNLQhGvurZq3IjZ5BVv+LXtXguHl5Wmsze1LJNLQhGv+rZq3IjZ5BVv+LXtXguHl5Wmsze1LJMLQhGv+rZq3IiZ5BVv+LXtXguHl5Wmsze1LJMLQhGv+vZq3IiZ5BVv+PXtXguHl5Wmsze1LJMLQhGv+vZrHIiZ5BVwOPXtnguHV5Wmsze1bJMLAhGv+vZrHIiZpBVwOPXtnguHV5Wmsze1bJMLAhGv+vZrHIiZpBVwOPYtnguHV5Wms3e1bJMLAhGv+vZrHIiZpBVwOPYtnguHV5Wms3e1bJMLAhGv+vZrHIiZpBVwOPYtnguHV5Wms3f1bJMLAhHwOvZrHIiZpBVwOPYt3guHV5Wm83f1bJLLAhHwOvZrXIiZpBVwOPYt3guHV5Xm83f1bJLLAhHwOvZrXIiZpFVwOTYt3guHV5Xm83f1rJLLAhHwOzarXIiZpFVwOTYt3guHV5Xm83f1rJLLAhHwOzarXIiZpFVwOTYt3kuHV5Xm83f1rJLLAhHwOzarXMiZpFVwOTZt3kuHV5Xm83f1rJLLAhHwOzarXMiZpFWwOTZt3kuHV5Xm83f17JLKwhHwOzarXMiZpFWwOTZuHkuHV5Xm87f17JLKwhHwOzarXMiZpFWweXZuHkuHV5Xm87f17JLKwhHwOzbrXMhZpFWweXZuHkuHF5Xm87f17JLKwhHwezbrXMhZpFWweXZuHkuHF5Xm87f17JKKwhHwezbrXMhZpFWweXZuXkuHF5Xm87f17JKKwhHwezbrXMhZpJWweXauXkuHF5Xm87g2LJKKwhHwezbrnMhZpJWweXauXkuHF5Ync7g2LJKKwhHwezbrnMhZpJWweXauXkuHF5Ync7g2LJKKwhHwezbrnMhZpJWweXauXkuHF5Ync/g2LJKKwhHwezbrnMhZpJWwubauXktHF5Ync/g2LJKKwhIwezbrnQhZpJWwubaunotHF5Ync/g2LJJKghIwezbrnQhZpJXwubbunotHF5Ync/g2bJJKghIwu3brnQhZpJXwubbunotHF5Ync/g2bJJKghIwu3brnQhZpJXw+bbunotG15Ync/h2bJJKghIwu3brnQgZpJXw+fcunotG15Ync/h2bJJKQhIwu3cr3QgZpJXw+fcunotG15Ync/h2rJJKQhIwu3cr3QgZpJXw+fcu3otG15Zns/h2rJJKQhIwu3cr3QgZpNXw+fcu3otG15Zns/h2rJJKQhIw+3cr3QgZpNXw+fcu3otG15Zns/h2rJIKQhIw+3cr3QgZpNXw+jdu3otG15Zns/h27JIKQhIw+3cr3UgZpNXw+jdu3stG15Zns/h27JIKQhIw+7cr3UgZpNXw+jdu3stG15Zns/i27JIKQhIw+7cr3UgZpNYxOjdu3stG15Zns/i27JIKQhJw+7dr3UgZpNYxOjdu3stG15Zntfi27JIKQhJw+7dr4UgZpNYxOjdvHstG15ZntDi27JIKQhJw+7dr4UgZpNYxOjdvHstG15ZntDi3LJIKQhJw+7dr4UfZpNYxOndvHstG15ZntDi3LJIKQhJw+7dr4UfZpNYxendvHstG15ZntDi3LJHKQhJxO7dr4UfZpNYxendvXstG15antDi3LJHKQhJxO7dr4YfZpRYxendvXstG15antDi3LJHKQhJxO7er4YfZpRYxendvXstG15antDj3bJHKQhJxO7er4YfZpRYxendvXwtGl5antDj3bJHKAhJxO7er4YfZpRZxendvXwtGl5antHj3bJHKAhJxO/er4YfZpRZxu7evXwtGl5antHj3bJHKAhJxO/er4YfZpRZxu7evXwtGl5antHj3bJHKAhJxO/er4YeZpRZxu7evnwtGl5antHj3rJHKAhJxO/er4YeZpRZxu/evnwtGl5bntHj3rJGKAhJxe/er4YeZpRZxu/evnwtGl5bntHj3rJGKAhJxe/er4YeZpRZxu/fvnwtGl5bntHj37JGKAhJxe/er4YeZpRZxu/fvnwtGl5bntHk37JGKAhJxe/fr4YeZpRZx+/fvnwtGl5bntHk37JGJwhJxe/fr5YeZpRax+/fvnwtGl5bntHk37JGJwhJxe/fr5YeZpRax+/fv3wtGl5bntLk4LJGJwhJxe/fr5YeZpVax+/fv3wtGl5bntLk4LJGJwhJxe/fr5YeZpVax/DgwHwtGl5bntLk4LJGJwhKxe/fr5YdZpVax/DgwHwtGl5cntLk4LJFJwhKxe/fr5YdZpVax/DgwHwtGl5cntLk4bJFJwhKxu/fr5YdZpVax/DgwXwtGl5cntLk4bJFJwhKxu/fr5YdZpVax/DgwXwtGl5cntPk4bJFJwhKxu/gr5YdZpVax/DhwXwtGV5cntPk4bJFJwhKxu/gr5YdZpVax/DhwXwtGV5cntPk4bJFJwhKxu/gr5cdZpVax/DhwXwtGV5cntPl4rJFJwhKxu/gr5cdZpVax/DhwXwtGV5cntPl4rJFJghKxu/gr5cdZpVax/DhwXwsGV5cntPl4rJFJghKxu/gr5cdZpVax/DhwXwsGV5cntPl47JFJghKxu/gr5cdZpVayPDhwXwsGV5dntPl47JFJghKx+/hr5cdZpVayPDhwnwsGV5dntPl47JEJghKx+/hr5cdZpZayPDiwnsGV5dntPl47JEJghKx+/hr5cdZpZayPDiwnsGV5dntTl47JEJghKx+/hr5ccZpZayPDiwnsGV5dntTl47JEJghLx+/hr5ccZpZayPDiwnsGV5dn9Tl47JEJghLx+/hr5ccZpZayPHiwnsGV5dn9Tl47JEJghLx+/hr5ccZpZayPHiwnsGV5dn9Tl5LJEJghLx+/hr5ccZpZayPHiwnsMV5dn9Tl5LJEJghLx+/hr5ccZpZayPHiwnsNV5dn9Tl5LJEJQhLx+/ir5ccZpZayPHiwnsMV5dn9Tl5LJEJQhLx+/ir5ccZpZbyPHiwnsMV5dn9Tl5LJEJQhLx+/ir5ccZpZbyPLiwnsNV5dn9Xl5LJEJQhLx+/ir5ccZpZbyPLjwnsMV5dn9Xl5LJDJQhLx+/ir5bcZpZbyPLjwnsMV5do9Xl5LJDJQhLx+/ir5bcZpZbyPLjwnsNV5do9Xl5bJDJQhLx+/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5doNXl5bJDJQhLyO/ir6bcZpZbyfLjwnsNV5doNXl5bJDJQhLyO/ir6bcZpZbyf');
      }
      audioRef.current.play().catch(() => {});
    } catch (e) {}
  }, []);

  // Check for orders that have been waiting too long
  const checkUnacceptedOrder = useCallback((order: any) => {
    const cookReadyTime = new Date(order.updated_at).getTime();
    const now = Date.now();
    const waitingSeconds = (now - cookReadyTime) / 1000;
    
    // Alert if waiting more than 3 minutes
    return waitingSeconds > 180;
  }, []);

  useEffect(() => {
    console.log('[AdminDeliveryAlerts] Setting up realtime subscription');

    // Subscribe to orders that need admin attention
    const channel = supabase
      .channel('admin-delivery-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          const order = payload.new as any;
          
          if (!order) return;
          
          // Only handle cloud_kitchen and homemade orders
          if (!['cloud_kitchen', 'homemade'].includes(order.service_type)) return;
          
          // Remove from alerts if assigned
          if (order.assigned_delivery_id) {
            setUnacceptedOrders(prev => prev.filter(o => o.id !== order.id));
            return;
          }
          
          // Check if order is ready but not accepted
          if (
            order.cook_status === 'ready' &&
            order.delivery_status === 'pending' &&
            !order.assigned_delivery_id
          ) {
            if (checkUnacceptedOrder(order)) {
              setUnacceptedOrders(prev => {
                if (prev.find(o => o.id === order.id)) return prev;
                return [...prev, order];
              });
              setShowAdminAlert(true);
              playAdminAlertSound();
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[AdminDeliveryAlerts] Subscription status:', status);
      });

    // Also periodically check for stale orders
    const checkInterval = setInterval(async () => {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      
      const { data: staleOrders } = await supabase
        .from('orders')
        .select('*')
        .in('service_type', ['cloud_kitchen', 'homemade'])
        .eq('cook_status', 'ready')
        .eq('delivery_status', 'pending')
        .is('assigned_delivery_id', null)
        .lt('updated_at', threeMinutesAgo);

      if (staleOrders && staleOrders.length > 0) {
        setUnacceptedOrders(prev => {
          const newOrders = staleOrders.filter(
            o => !prev.find(p => p.id === o.id)
          );
          if (newOrders.length > 0) {
            setShowAdminAlert(true);
            playAdminAlertSound();
            return [...prev, ...newOrders];
          }
          return prev;
        });
      }
    }, 60000); // Check every minute

    return () => {
      supabase.removeChannel(channel);
      clearInterval(checkInterval);
    };
  }, [checkUnacceptedOrder, playAdminAlertSound]);

  const dismissAdminAlert = useCallback(() => {
    setShowAdminAlert(false);
  }, []);

  const removeAdminAlert = useCallback((orderId: string) => {
    setUnacceptedOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  return {
    unacceptedOrders,
    showAdminAlert,
    dismissAdminAlert,
    removeAdminAlert,
  };
}
