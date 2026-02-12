import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CookInfo {
  id: string;
  kitchen_name: string;
  rating: number | null;
}

export interface CustomerCloudKitchenItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_vegetarian: boolean;
  set_size: number;
  min_order_sets: number;
  cloud_kitchen_slot_id: string | null;
  platform_margin_type: string | null;
  platform_margin_value: number | null;
  images: {
    id: string;
    image_url: string;
    is_primary: boolean;
  }[];
  // Cook info for this specific dish-cook combination (null if no cook allocated)
  cook: CookInfo | null;
  // Unique key combining food item and cook
  unique_key: string;
  // Whether this item can be ordered (has an active cook)
  is_orderable: boolean;
}

export interface ActiveDivision {
  id: string;
  name: string;
  slot_type: string;
  start_time: string;
  end_time: string;
  cutoff_hours_before: number;
  delivery_charge: number;
  is_ordering_open: boolean;
  time_until_cutoff: { hours: number; minutes: number } | null;
  status_label: 'open' | 'closing_soon' | 'closed';
}

function checkIfOrderingOpen(slot: {
  start_time: string;
  end_time: string;
  cutoff_hours_before: number;
}): { 
  isOpen: boolean; 
  timeRemaining: { hours: number; minutes: number } | null;
  statusLabel: 'open' | 'closing_soon' | 'closed';
} {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Parse slot times
  const [startHours, startMins] = slot.start_time.split(':').map(Number);
  const slotStartMinutes = startHours * 60 + startMins;
  
  const [endHours, endMins] = slot.end_time.split(':').map(Number);
  const slotEndMinutes = endHours * 60 + endMins;

  // Calculate cutoff time (when ordering closes)
  let cutoffMinutes = slotStartMinutes - (slot.cutoff_hours_before * 60);
  
  // Handle negative cutoff (wraps to previous day logic)
  if (cutoffMinutes < 0) {
    cutoffMinutes = 24 * 60 + cutoffMinutes; // wrap around
  }

  // Check if slot has already ended today (past the end time)
  const hasSlotEndedToday = slotEndMinutes > slotStartMinutes 
    ? currentMinutes >= slotEndMinutes  // Normal slot: ended if past end time
    : (currentMinutes >= slotEndMinutes && currentMinutes < slotStartMinutes); // Overnight slot

  if (hasSlotEndedToday) {
    return { isOpen: false, timeRemaining: null, statusLabel: 'closed' };
  }

  // Check if ordering is still open (before cutoff)
  // Cutoff is when orders stop being accepted, before the slot starts
  let isBeforeCutoff: boolean;
  
  if (cutoffMinutes < 0 || cutoffMinutes > slotStartMinutes) {
    // Cutoff wraps to previous day (e.g., slot at 06:00 with 8h cutoff = 22:00 previous day)
    // If cutoff wrapped, check if we're in the valid ordering window
    const wrappedCutoff = cutoffMinutes < 0 ? 24 * 60 + cutoffMinutes : cutoffMinutes;
    isBeforeCutoff = currentMinutes < slotStartMinutes && 
      (currentMinutes < wrappedCutoff || currentMinutes >= slotStartMinutes);
  } else {
    // Normal case: cutoff is before slot start on same day
    isBeforeCutoff = currentMinutes < cutoffMinutes;
  }

  if (!isBeforeCutoff) {
    return { isOpen: false, timeRemaining: null, statusLabel: 'closed' };
  }

  // Calculate remaining time until cutoff
  let remainingMinutes = cutoffMinutes - currentMinutes;
  if (remainingMinutes < 0) {
    remainingMinutes = 24 * 60 + remainingMinutes;
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  // Determine status label
  let statusLabel: 'open' | 'closing_soon' | 'closed' = 'open';
  if (remainingMinutes <= 60) {
    statusLabel = 'closing_soon'; // Less than 1 hour remaining
  }

  return {
    isOpen: true,
    timeRemaining: { hours, minutes },
    statusLabel,
  };
}

export function useCustomerDivisions() {
  return useQuery({
    queryKey: ['customer-cloud-kitchen-divisions'],
    queryFn: async () => {
      const { data: slots, error } = await supabase
        .from('cloud_kitchen_slots')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return (slots || []).map((slot) => {
        const { isOpen, timeRemaining, statusLabel } = checkIfOrderingOpen(slot);
        return {
          id: slot.id,
          name: slot.name,
          slot_type: slot.slot_type,
          start_time: slot.start_time,
          end_time: slot.end_time,
          cutoff_hours_before: slot.cutoff_hours_before,
          delivery_charge: slot.delivery_charge || 0,
          is_ordering_open: isOpen,
          time_until_cutoff: timeRemaining,
          status_label: statusLabel,
        } as ActiveDivision;
      });
    },
    refetchInterval: 60000, // Refresh every minute to update time remaining
  });
}

export function useCustomerDivisionItems(divisionId: string | null) {
  return useQuery({
    queryKey: ['customer-division-items-with-cooks', divisionId],
    queryFn: async () => {
      if (!divisionId) return [];

      // Fetch all available food items for this division
      const { data: foodItems, error: foodItemsError } = await supabase
        .from('food_items')
        .select(`
          id,
          name,
          description,
          price,
          is_vegetarian,
          set_size,
          min_order_sets,
          cloud_kitchen_slot_id,
          platform_margin_type,
          platform_margin_value,
          food_item_images(id, image_url, is_primary)
        `)
        .eq('cloud_kitchen_slot_id', divisionId)
        .eq('is_available', true);

      if (foodItemsError) throw foodItemsError;

      // Fetch cook allocations for these items
      const { data: cookDishes, error: cookDishesError } = await supabase
        .from('cook_dishes')
        .select(`
          id,
          cook_id,
          food_item_id,
          custom_price,
          cooks!inner(
            id,
            kitchen_name,
            rating,
            is_active,
            is_available
          )
        `);

      if (cookDishesError) throw cookDishesError;

      // Filter to only active and available cooks
      const activeCookDishes = (cookDishes || []).filter((cd: any) => 
        cd.cooks?.is_active === true && cd.cooks?.is_available === true
      );

      // Build a map of food_item_id -> cook allocations
      const cookAllocationMap = new Map<string, any[]>();
      activeCookDishes.forEach((cd: any) => {
        const existing = cookAllocationMap.get(cd.food_item_id) || [];
        existing.push(cd);
        cookAllocationMap.set(cd.food_item_id, existing);
      });

      // Transform food items into customer items
      const result: CustomerCloudKitchenItem[] = [];

      (foodItems || []).forEach((item: any) => {
        const cookAllocations = cookAllocationMap.get(item.id) || [];

        if (cookAllocations.length > 0) {
          // Create an entry for each cook that offers this dish
          cookAllocations.forEach((cd: any) => {
            // Use cook's custom price if set, otherwise fall back to base price
            const effectivePrice = cd.custom_price != null ? cd.custom_price : item.price;
            result.push({
              id: item.id,
              name: item.name,
              description: item.description,
              price: effectivePrice,
              is_vegetarian: item.is_vegetarian,
              set_size: item.set_size || 1,
              min_order_sets: item.min_order_sets || 1,
              cloud_kitchen_slot_id: item.cloud_kitchen_slot_id,
              platform_margin_type: item.platform_margin_type,
              platform_margin_value: item.platform_margin_value,
              images: item.food_item_images || [],
              cook: {
                id: cd.cooks.id,
                kitchen_name: cd.cooks.kitchen_name,
                rating: cd.cooks.rating,
              },
              unique_key: `${item.id}_${cd.cooks.id}`,
              is_orderable: true,
            });
          });
        } else {
          // No cook allocated - show as display only
          result.push({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            is_vegetarian: item.is_vegetarian,
            set_size: item.set_size || 1,
            min_order_sets: item.min_order_sets || 1,
            cloud_kitchen_slot_id: item.cloud_kitchen_slot_id,
            platform_margin_type: item.platform_margin_type,
            platform_margin_value: item.platform_margin_value,
            images: item.food_item_images || [],
            cook: null,
            unique_key: `${item.id}_no_cook`,
            is_orderable: false,
          });
        }
      });

      // Sort: orderable items first, then by name, then by cook name
      return result.sort((a, b) => {
        // Orderable items come first
        if (a.is_orderable !== b.is_orderable) {
          return a.is_orderable ? -1 : 1;
        }
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        // Sort by cook name if both have cooks
        if (a.cook && b.cook) {
          return a.cook.kitchen_name.localeCompare(b.cook.kitchen_name);
        }
        return 0;
      });
    },
    enabled: !!divisionId,
  });
}
