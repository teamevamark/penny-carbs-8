import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistanceKm, calculateDeliveryCharge } from '@/lib/distanceUtils';

interface DeliveryChargeResult {
  charge: number;
  distanceKm: number | null;
  ruleName: string | null;
  isLoading: boolean;
}

/**
 * Calculate delivery charge based on cook location → customer location distance
 * and active delivery rules for the given service type.
 */
export const useDeliveryChargeCalculator = (
  serviceType: string,
  cookId: string | null,
  customerLat: number | null,
  customerLng: number | null,
  orderAmount?: number
): DeliveryChargeResult => {
  // Fetch active delivery rule for this service type
  const { data: rule, isLoading: ruleLoading } = useQuery({
    queryKey: ['delivery-rule-active', serviceType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_rules')
        .select('*')
        .eq('service_type', serviceType)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch cook location
  const { data: cookData, isLoading: cookLoading } = useQuery({
    queryKey: ['cook-location', cookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooks')
        .select('latitude, longitude')
        .eq('id', cookId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!cookId,
  });

  const isLoading = ruleLoading || cookLoading;

  if (!rule) {
    return { charge: 0, distanceKm: null, ruleName: null, isLoading };
  }

  // Calculate distance if both locations available
  let distanceKm: number | null = null;
  if (cookData?.latitude && cookData?.longitude && customerLat && customerLng) {
    distanceKm = calculateDistanceKm(
      cookData.latitude,
      cookData.longitude,
      customerLat,
      customerLng
    );
  }

  // If we can't calculate distance, use minimum charge
  const charge = distanceKm !== null
    ? calculateDeliveryCharge(distanceKm, {
        min_delivery_charge: rule.min_delivery_charge,
        per_km_charge: rule.per_km_charge,
        max_delivery_charge: rule.max_delivery_charge,
        base_distance_km: (rule as any).base_distance_km ?? 5,
        free_delivery_above: rule.free_delivery_above,
      }, orderAmount)
    : rule.min_delivery_charge;

  return {
    charge,
    distanceKm,
    ruleName: rule.rule_name,
    isLoading,
  };
};
