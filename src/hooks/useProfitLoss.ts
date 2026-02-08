import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReportFilters } from '@/types/reports';
import { calculatePlatformMargin } from '@/lib/priceUtils';

export interface ProfitLossData {
  totalRevenue: number;
  platformMarginRevenue: number;
  cookPayouts: number;
  deliveryPayouts: number;
  referralCommissions: number;
  netProfit: number;
  orderCount: number;
  deliveredOrderCount: number;
}

export interface ProfitLossByService {
  service_type: string;
  total_revenue: number;
  platform_margin: number;
  cook_payouts: number;
  order_count: number;
}

export interface ProfitLossByDate {
  date: string;
  total_revenue: number;
  platform_margin: number;
  net_profit: number;
  order_count: number;
}

export const useProfitLossReport = (filters: ReportFilters) => {
  return useQuery({
    queryKey: ['profit-loss-report', filters],
    queryFn: async () => {
      // Fetch delivered orders with their items and food item details
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          service_type,
          delivery_earnings,
          created_at,
          order_items(
            id,
            quantity,
            unit_price,
            total_price,
            food_item_id,
            food_items(
              id,
              price,
              platform_margin_type,
              platform_margin_value
            )
          )
        `)
        .eq('status', 'delivered');

      if (filters.startDate) {
        ordersQuery = ordersQuery.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        ordersQuery = ordersQuery.lte('created_at', filters.endDate.toISOString());
      }
      if (filters.serviceType && filters.serviceType !== 'all') {
        ordersQuery = ordersQuery.eq('service_type', filters.serviceType as 'indoor_events' | 'cloud_kitchen' | 'homemade');
      }
      if (filters.panchayatId && filters.panchayatId !== 'all') {
        ordersQuery = ordersQuery.eq('panchayat_id', filters.panchayatId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Fetch indoor event vehicle rents for delivered orders
      const deliveredOrderIds = orders?.map(o => o.id) || [];
      let vehicleRentTotal = 0;
      if (deliveredOrderIds.length > 0) {
        const { data: vehicles, error: vehiclesError } = await supabase
          .from('indoor_event_vehicles')
          .select('order_id, rent_amount')
          .in('order_id', deliveredOrderIds);
        if (!vehiclesError && vehicles) {
          vehicleRentTotal = vehicles.reduce((sum, v) => sum + (v.rent_amount || 0), 0);
        }
      }

      // Fetch referral commissions for the period
      let referralsQuery = supabase
        .from('referrals')
        .select('commission_amount, status');

      const { data: referrals, error: referralsError } = await referralsQuery;
      if (referralsError) throw referralsError;

      // Calculate totals
      let totalRevenue = 0;
      let platformMarginRevenue = 0;
      let cookPayouts = 0;
      let deliveryPayouts = 0;

      const byService: Record<string, ProfitLossByService> = {};
      const byDate: Record<string, ProfitLossByDate> = {};

      orders?.forEach(order => {
        const orderTotal = order.total_amount || 0;
        totalRevenue += orderTotal;
        deliveryPayouts += order.delivery_earnings || 0;

        // Calculate platform margin from order items
        let orderMargin = 0;
        let orderCookPayout = 0;

        order.order_items?.forEach((item: any) => {
          const foodItem = item.food_items;
          if (foodItem) {
            const marginType = (foodItem.platform_margin_type || 'percent') as 'percent' | 'fixed';
            const marginValue = foodItem.platform_margin_value || 0;
            const basePrice = foodItem.price || item.unit_price;
            
            const marginPerItem = calculatePlatformMargin(basePrice, marginType, marginValue);
            orderMargin += marginPerItem * item.quantity;
            orderCookPayout += basePrice * item.quantity;
          } else {
            // Fallback: if no food item details, assume all goes to cook
            orderCookPayout += item.total_price;
          }
        });

        platformMarginRevenue += orderMargin;
        cookPayouts += orderCookPayout;

        // Group by service type
        const st = order.service_type;
        if (!byService[st]) {
          byService[st] = {
            service_type: st,
            total_revenue: 0,
            platform_margin: 0,
            cook_payouts: 0,
            order_count: 0,
          };
        }
        byService[st].total_revenue += orderTotal;
        byService[st].platform_margin += orderMargin;
        byService[st].cook_payouts += orderCookPayout;
        byService[st].order_count++;

        // Group by date
        const dateKey = new Date(order.created_at).toISOString().split('T')[0];
        if (!byDate[dateKey]) {
          byDate[dateKey] = {
            date: dateKey,
            total_revenue: 0,
            platform_margin: 0,
            net_profit: 0,
            order_count: 0,
          };
        }
        byDate[dateKey].total_revenue += orderTotal;
        byDate[dateKey].platform_margin += orderMargin;
        byDate[dateKey].order_count++;
      });

      // Add vehicle rents to delivery payouts
      deliveryPayouts += vehicleRentTotal;

      // Calculate referral commissions
      const referralCommissions = referrals
        ?.filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

      // Calculate net profit for each date
      Object.values(byDate).forEach(d => {
        d.net_profit = d.platform_margin; // Simplified: platform margin is our profit
      });

      const netProfit = platformMarginRevenue - deliveryPayouts - referralCommissions;

      return {
        summary: {
          totalRevenue,
          platformMarginRevenue,
          cookPayouts,
          deliveryPayouts,
          referralCommissions,
          netProfit,
          orderCount: orders?.length || 0,
          deliveredOrderCount: orders?.length || 0,
        } as ProfitLossData,
        byService: Object.values(byService),
        byDate: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
      };
    },
  });
};
