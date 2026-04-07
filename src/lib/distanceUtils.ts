/**
 * Calculate the distance between two points using the Haversine formula
 * @returns distance in kilometers
 */
export const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

/**
 * Calculate delivery charge based on distance and delivery rule
 */
export const calculateDeliveryCharge = (
  distanceKm: number,
  rule: {
    min_delivery_charge: number;
    per_km_charge: number | null;
    max_delivery_charge: number | null;
    base_distance_km: number;
    free_delivery_above: number | null;
  },
  orderAmount?: number
): number => {
  // Check if order qualifies for free delivery
  if (rule.free_delivery_above && orderAmount && orderAmount >= rule.free_delivery_above) {
    return 0;
  }

  // If distance is within base distance, charge minimum
  if (distanceKm <= rule.base_distance_km) {
    return rule.min_delivery_charge;
  }

  // Calculate extra distance charge
  const extraKm = distanceKm - rule.base_distance_km;
  const perKmCharge = rule.per_km_charge || 0;
  let charge = rule.min_delivery_charge + (extraKm * perKmCharge);

  // Apply max cap if set
  if (rule.max_delivery_charge && charge > rule.max_delivery_charge) {
    charge = rule.max_delivery_charge;
  }

  return Math.round(charge);
};
