import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns a Set of food_item_ids that are allocated to at least one active & available cook.
 * Used to filter customer-facing item lists so only orderable items appear.
 */
export function useCookAllocatedItemIds() {
  return useQuery({
    queryKey: ['cook-allocated-item-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cook_dishes')
        .select(`
          food_item_id,
          cooks!inner(is_active, is_available)
        `);

      if (error) throw error;

      // Filter to only active+available cooks, collect unique item IDs
      const ids = new Set<string>();
      (data || []).forEach((cd: any) => {
        if (cd.cooks?.is_active && cd.cooks?.is_available) {
          ids.add(cd.food_item_id);
        }
      });
      return ids;
    },
    staleTime: 60000,
  });
}
