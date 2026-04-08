import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReportFilters } from '@/types/reports';
import { calculateDistanceKm, calculateDeliveryCharge } from '@/lib/distanceUtils';

export interface DeliveryDistanceOrderData {
  order_id: string;
  order_number: string;
  service_type: string;
  total_amount: number;
  delivery_amount: number | null;
  delivery_distance_km: number | null;
  calculated_distance_km: number | null;
  cook_name: string;
  cook_lat: number | null;
  cook_lng: number | null;
  customer_lat: number | null;
  customer_lng: number | null;
  delivery_address: string | null;
  panchayat_name: string;
  created_at: string;
  status: string;
  calculated_charge: number | null;
  rule_name: string | null;
}

export interface DeliveryRuleSummary {
  id: string;
  rule_name: string;
  service_type: string;
  is_active: boolean;
  base_distance_km: number;
  min_delivery_charge: number;
  per_km_charge: number | null;
  max_delivery_charge: number | null;
  free_delivery_above: number | null;
}

export interface DistanceRangeBreakdown {
  range: string;
  count: number;
  total_delivery_charge: number;
  avg_distance: number;
}

export const useDeliveryDistanceReport = (filters: ReportFilters) => {
  return useQuery({
    queryKey: ['delivery-distance-report', filters],
    queryFn: async () => {
      // Fetch orders with delivery info
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, service_type, total_amount, delivery_amount,
          delivery_distance_km, delivery_latitude, delivery_longitude,
          delivery_address, status, created_at,
          panchayat_id, panchayats!orders_panchayat_id_fkey(name)
        `)
        .in('service_type', ['cloud_kitchen', 'homemade'])
        .in('status', ['delivered', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters.serviceType && filters.serviceType !== 'all') {
        query = query.eq('service_type', filters.serviceType as any);
      }
      if (filters.panchayatId && filters.panchayatId !== 'all') {
        query = query.eq('panchayat_id', filters.panchayatId);
      }

      const { data: orders, error: ordersError } = await query.order('created_at', { ascending: false }).limit(200);
      if (ordersError) throw ordersError;

      // Fetch delivery rules
      const { data: rules, error: rulesError } = await supabase
        .from('delivery_rules')
        .select('*')
        .order('service_type');
      if (rulesError) throw rulesError;

      // Get cook assignments for these orders
      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length === 0) return { orders: [], rules: rules || [], distanceBreakdown: [] };

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('order_id, assigned_cook_id')
        .in('order_id', orderIds)
        .not('assigned_cook_id', 'is', null);

      // Get unique cook ids
      const cookIds = [...new Set((orderItems || []).map(oi => oi.assigned_cook_id).filter(Boolean))] as string[];

      // Fetch cooks with locations
      let cooksMap: Record<string, { kitchen_name: string; latitude: number | null; longitude: number | null }> = {};
      if (cookIds.length > 0) {
        const { data: cooks } = await supabase
          .from('cooks')
          .select('id, kitchen_name, latitude, longitude')
          .in('id', cookIds);
        cooks?.forEach(c => { cooksMap[c.id] = c; });
      }

      // Map order → cook
      const orderCookMap: Record<string, string> = {};
      orderItems?.forEach(oi => {
        if (oi.assigned_cook_id && !orderCookMap[oi.order_id]) {
          orderCookMap[oi.order_id] = oi.assigned_cook_id;
        }
      });

      // Active rules by service type
      const activeRules: Record<string, any> = {};
      rules?.forEach(r => {
        if (r.is_active) activeRules[r.service_type] = r;
      });

      // Build result
      const resultOrders: DeliveryDistanceOrderData[] = (orders || []).map(order => {
        const cookId = orderCookMap[order.id];
        const cook = cookId ? cooksMap[cookId] : null;
        const panchayat = order.panchayats as { name: string } | null;

        let calculatedDistance: number | null = null;
        if (cook?.latitude && cook?.longitude && order.delivery_latitude && order.delivery_longitude) {
          calculatedDistance = calculateDistanceKm(cook.latitude, cook.longitude, order.delivery_latitude, order.delivery_longitude);
        }

        const rule = activeRules[order.service_type];
        let calculatedCharge: number | null = null;
        if (calculatedDistance !== null && rule) {
          calculatedCharge = calculateDeliveryCharge(calculatedDistance, {
            min_delivery_charge: rule.min_delivery_charge,
            per_km_charge: rule.per_km_charge,
            max_delivery_charge: rule.max_delivery_charge,
            base_distance_km: rule.base_distance_km ?? 5,
            free_delivery_above: rule.free_delivery_above,
          }, order.total_amount);
        }

        return {
          order_id: order.id,
          order_number: order.order_number,
          service_type: order.service_type,
          total_amount: order.total_amount,
          delivery_amount: order.delivery_amount,
          delivery_distance_km: order.delivery_distance_km,
          calculated_distance_km: calculatedDistance,
          cook_name: cook?.kitchen_name || 'N/A',
          cook_lat: cook?.latitude || null,
          cook_lng: cook?.longitude || null,
          customer_lat: order.delivery_latitude,
          customer_lng: order.delivery_longitude,
          delivery_address: order.delivery_address,
          panchayat_name: panchayat?.name || 'Unknown',
          created_at: order.created_at,
          status: order.status,
          calculated_charge: calculatedCharge,
          rule_name: rule?.rule_name || null,
        };
      });

      // Distance range breakdown
      const ranges = [
        { label: '0-2 km', min: 0, max: 2 },
        { label: '2-5 km', min: 2, max: 5 },
        { label: '5-10 km', min: 5, max: 10 },
        { label: '10-20 km', min: 10, max: 20 },
        { label: '20+ km', min: 20, max: Infinity },
      ];

      const distanceBreakdown: DistanceRangeBreakdown[] = ranges.map(r => {
        const matching = resultOrders.filter(o => {
          const d = o.calculated_distance_km;
          return d !== null && d >= r.min && d < r.max;
        });
        return {
          range: r.label,
          count: matching.length,
          total_delivery_charge: matching.reduce((s, o) => s + (o.calculated_charge || 0), 0),
          avg_distance: matching.length > 0
            ? Math.round(matching.reduce((s, o) => s + (o.calculated_distance_km || 0), 0) / matching.length * 10) / 10
            : 0,
        };
      });

      return { orders: resultOrders, rules: rules || [], distanceBreakdown };
    },
  });
};
