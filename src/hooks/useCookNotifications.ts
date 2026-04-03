import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCookProfile } from '@/hooks/useCook';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import type { CookOrder, CookOrderItem } from '@/types/cook';

const ORDER_ACCEPT_CUTOFF_SECONDS = 120;

export interface PendingCookOrder extends CookOrder {
  cutoff_at: Date;
  seconds_remaining: number;
}

export function useCookNotifications() {
  const queryClient = useQueryClient();
  const { data: profile } = useCookProfile();
  const { notifyNewOrder, permission } = useBrowserNotifications();
  const [pendingOrders, setPendingOrders] = useState<PendingCookOrder[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Show browser notification for new order
  const showBrowserNotification = useCallback((order: PendingCookOrder) => {
    if (permission === 'granted') {
      notifyNewOrder(order.order_number, order.service_type, () => {
        window.focus();
        setShowAlert(true);
      });
    }
  }, [permission, notifyNewOrder]);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,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2LJKKwhIwezbrnQhZpJWwubaunotHF5Ync/g2LJJKghIwezbrnQhZpJXwubbunotHF5Ync/g2bJJKghIwu3brnQhZpJXwubbunotHF5Ync/g2bJJKghIwu3brnQhZpJXw+bbunotG15Ync/h2bJJKghIwu3brnQgZpJXw+fcunotG15Ync/h2bJJKQhIwu3cr3QgZpJXw+fcunotG15Ync/h2rJJKQhIwu3cr3QgZpJXw+fcu3otG15Zns/h2rJJKQhIwu3cr3QgZpNXw+fcu3otG15Zns/h2rJJKQhIw+3cr3QgZpNXw+fcu3otG15Zns/h2rJIKQhIw+3cr3QgZpNXw+jdu3otG15Zns/h27JIKQhIw+3cr3UgZpNXw+jdu3stG15Zns/h27JIKQhIw+7cr3UgZpNXw+jdu3stG15Zns/i27JIKQhIw+7cr3UgZpNYxOjdu3stG15Zns/i27JIKQhJw+7dr3UgZpNYxOjdu3stG15Zntfi27JIKQhJw+7dr4UgZpNYxOjdvHstG15ZntDi27JIKQhJw+7dr4UgZpNYxOjdvHstG15ZntDi3LJIKQhJw+7dr4UfZpNYxOndvHstG15ZntDi3LJIKQhJw+7dr4UfZpNYxendvHstG15ZntDi3LJHKQhJxO7dr4UfZpNYxendvXstG15antDi3LJHKQhJxO7dr4YfZpRYxendvXstG15antDi3LJHKQhJxO7er4YfZpRYxendvXstG15antDj3bJHKQhJxO7er4YfZpRYxendvXwtGl5antDj3bJHKAhJxO7er4YfZpRZxendvXwtGl5antHj3bJHKAhJxO/er4YfZpRZxu7evXwtGl5antHj3bJHKAhJxO/er4YfZpRZxu7evXwtGl5antHj3bJHKAhJxO/er4YeZpRZxu7evnwtGl5antHj3rJHKAhJxO/er4YeZpRZxu/evnwtGl5bntHj3rJGKAhJxe/er4YeZpRZxu/evnwtGl5bntHj3rJGKAhJxe/er4YeZpRZxu/fvnwtGl5bntHj37JGKAhJxe/er4YeZpRZxu/fvnwtGl5bntHk37JGKAhJxe/fr4YeZpRZx+/fvnwtGl5bntHk37JGJwhJxe/fr5YeZpRax+/fvnwtGl5bntHk37JGJwhJxe/fr5YeZpRax+/fv3wtGl5bntLk4LJGJwhJxe/fr5YeZpVax+/fv3wtGl5bntLk4LJGJwhJxe/fr5YeZpVax/DgwHwtGl5bntLk4LJFJwhKxe/fr5YdZpVax/DgwHwtGl5cntLk4LJFJwhKxe/fr5YdZpVax/DgwHwtGl5cntLk4bJFJwhKxu/fr5YdZpVax/DgwXwtGl5cntLk4bJFJwhKxu/fr5YdZpVax/DgwXwtGl5cntPk4bJFJwhKxu/gr5YdZpVax/DhwXwtGV5cntPk4bJFJwhKxu/gr5YdZpVax/DhwXwtGV5cntPk4bJFJwhKxu/gr5cdZpVax/DhwXwtGV5cntPl4rJFJwhKxu/gr5cdZpVax/DhwXwtGV5cntPl4rJFJghKxu/gr5cdZpVax/DhwXwsGV5cntPl4rJFJghKxu/gr5cdZpVax/DhwXwsGV5cntPl47JFJghKxu/gr5cdZpVayPDhwXwsGV5dntPl47JFJghKx+/hr5cdZpVayPDhwnwsGV5dntPl47JEJghKx+/hr5cdZpZayPDiwnsGV5dntPl47JEJghKx+/hr5cdZpZayPDiwnsGV5dntTl47JEJghKx+/hr5ccZpZayPDiwnsGV5dntTl47JEJghLx+/hr5ccZpZayPDiwnsGV5dn9Tl47JEJghLx+/hr5ccZpZayPHiwnsGV5dn9Tl47JEJghLx+/hr5ccZpZayPHiwnsGV5dn9Tl5LJEJghLx+/hr5ccZpZayPHiwnsMV5dn9Tl5LJEJghLx+/hr5ccZpZayPHiwnsNV5dn9Tl5LJEJQhLx+/ir5ccZpZayPHiwnsMV5dn9Tl5LJEJQhLx+/ir5ccZpZbyPHiwnsMV5dn9Tl5LJEJQhLx+/ir5ccZpZbyPLiwnsNV5dn9Xl5LJEJQhLx+/ir5ccZpZbyPLjwnsMV5dn9Xl5LJDJQhLx+/ir5bcZpZbyPLjwnsMV5do9Xl5LJDJQhLx+/ir5bcZpZbyPLjwnsNV5do9Xl5bJDJQhLx+/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5do9Xl5bJDJQhLyO/ir6bcZpZbyPLjwnsNV5doNXl5bJDJQhLyO/ir6bcZpZbyfLjwnsNV5doNXl5bJDJQhLyO/ir6bcZpZbyf');
      }
      audioRef.current.play().catch(() => {});
    } catch (e) {}
  }, []);

  const dismissAlert = useCallback(() => {
    setShowAlert(false);
  }, []);

  // Fetch full order details for a new assignment
  const fetchOrderDetails = useCallback(async (orderId: string): Promise<PendingCookOrder | null> => {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, status, service_type, total_amount, event_date, event_details, delivery_address, guest_count, created_at, customer_id')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) return null;

    // Skip cancelled orders
    if (order.status === 'cancelled') return null;

    // Get customer info
    const { data: customer } = await supabase
      .from('profiles')
      .select('name, mobile_number')
      .eq('user_id', order.customer_id)
      .maybeSingle();

    // Get order items
    const { data: items } = await supabase
      .from('order_items')
      .select('id, food_item_id, quantity, unit_price, total_price, food_item:food_items(id, name)')
      .eq('order_id', orderId);

    return {
      id: order.id,
      order_number: order.order_number,
      service_type: order.service_type,
      total_amount: order.total_amount,
      cook_status: 'pending',
      event_date: order.event_date,
      event_details: order.event_details,
      delivery_address: order.delivery_address,
      guest_count: order.guest_count,
      created_at: order.created_at,
      customer: customer || undefined,
      order_items: (items as CookOrderItem[]) || [],
      cutoff_at: new Date(Date.now() + ORDER_ACCEPT_CUTOFF_SECONDS * 1000),
      seconds_remaining: ORDER_ACCEPT_CUTOFF_SECONDS,
    };
  }, []);

  // Subscribe to real-time assignment changes
  useEffect(() => {
    if (!profile?.id) return;

    console.log('[CookNotifications] Setting up realtime for cook:', profile.id);

    const channel = supabase
      .channel('cook-assignments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_assigned_cooks',
          filter: `cook_id=eq.${profile.id}`,
        },
        async (payload) => {
          const assignment = payload.new as any;
          console.log('[CookNotifications] New assignment:', assignment.order_id);

          const orderDetails = await fetchOrderDetails(assignment.order_id);
          if (orderDetails) {
            setPendingOrders(prev => {
              if (prev.find(o => o.id === orderDetails.id)) return prev;
              return [...prev, orderDetails];
            });
            setShowAlert(true);
            playNotificationSound();
            showBrowserNotification(orderDetails); // Trigger browser notification
            queryClient.invalidateQueries({ queryKey: ['cook-orders'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('[CookNotifications] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchOrderDetails, playNotificationSound, queryClient]);

  // Load existing pending assignments on mount
  useEffect(() => {
    if (!profile?.id) return;

    const loadPending = async () => {
      const { data: assignments } = await supabase
        .from('order_assigned_cooks')
        .select('order_id')
        .eq('cook_id', profile.id)
        .eq('cook_status', 'pending');

      if (!assignments || assignments.length === 0) return;

      for (const a of assignments) {
        const orderDetails = await fetchOrderDetails(a.order_id);
        if (orderDetails) {
          setPendingOrders(prev => {
            if (prev.find(o => o.id === orderDetails.id)) return prev;
            return [...prev, orderDetails];
          });
        }
      }

      if (assignments.length > 0) {
        setShowAlert(true);
        playNotificationSound();
      }
    };

    loadPending();
  }, [profile?.id, fetchOrderDetails, playNotificationSound]);

  // Countdown timer
  useEffect(() => {
    if (pendingOrders.length === 0) return;

    const interval = setInterval(() => {
      setPendingOrders(prev =>
        prev.map(order => ({
          ...order,
          seconds_remaining: Math.max(0, Math.floor((order.cutoff_at.getTime() - Date.now()) / 1000)),
        })).filter(order => order.seconds_remaining > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingOrders.length]);

  // Close alert when no pending orders
  useEffect(() => {
    if (pendingOrders.length === 0) setShowAlert(false);
  }, [pendingOrders.length]);

  const removeOrder = useCallback((orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  return {
    pendingOrders,
    showAlert,
    dismissAlert,
    removeOrder,
    ORDER_ACCEPT_CUTOFF_SECONDS,
  };
}
