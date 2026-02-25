import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CloudKitchenItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_vegetarian: boolean;
  is_available: boolean;
  is_coming_soon: boolean;
  set_size: number;
  min_order_sets: number;
  cloud_kitchen_slot_id: string | null;
  images: {
    id: string;
    image_url: string;
    is_primary: boolean;
  }[];
}

export function useCloudKitchenItems(slotId: string | null) {
  return useQuery({
    queryKey: ['cloud-kitchen-items', slotId],
    queryFn: async () => {
      if (!slotId) return [];

      const { data, error } = await supabase
        .from('food_items')
        .select(`
          id,
          name,
          description,
          price,
          is_vegetarian,
          is_available,
          is_coming_soon,
          set_size,
          min_order_sets,
          cloud_kitchen_slot_id,
          images:food_item_images(id, image_url, is_primary)
        `)
        .eq('cloud_kitchen_slot_id', slotId)
        .order('name');

      if (error) throw error;
      return (data || []) as CloudKitchenItem[];
    },
    enabled: !!slotId,
  });
}

export function useAvailableItems() {
  return useQuery({
    queryKey: ['available-cloud-kitchen-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select(`
          id,
          name,
          description,
          price,
          is_vegetarian,
          is_available,
          is_coming_soon,
          set_size,
          min_order_sets,
          cloud_kitchen_slot_id,
          service_types,
          images:food_item_images(id, image_url, is_primary)
        `)
        .eq('is_available', true)
        .or('service_types.cs.{cloud_kitchen},service_type.eq.cloud_kitchen')
        .order('name');

      if (error) throw error;
      return (data || []) as (CloudKitchenItem & { service_types: string[] | null })[];
    },
  });
}

export function useAssignItemToDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      slotId,
      setSize,
      minOrderSets,
    }: {
      itemId: string;
      slotId: string;
      setSize: number;
      minOrderSets: number;
    }) => {
      const { error } = await supabase
        .from('food_items')
        .update({
          cloud_kitchen_slot_id: slotId,
          set_size: setSize,
          min_order_sets: minOrderSets,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-kitchen-items'] });
      queryClient.invalidateQueries({ queryKey: ['available-cloud-kitchen-items'] });
      queryClient.invalidateQueries({ queryKey: ['cloud-kitchen-divisions'] });
      toast({ title: 'Item assigned successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to assign item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateItemSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      setSize,
      minOrderSets,
    }: {
      itemId: string;
      setSize: number;
      minOrderSets: number;
    }) => {
      const { error } = await supabase
        .from('food_items')
        .update({
          set_size: setSize,
          min_order_sets: minOrderSets,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-kitchen-items'] });
      toast({ title: 'Item updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleItemComingSoon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, isComingSoon }: { itemId: string; isComingSoon: boolean }) => {
      const { error } = await supabase
        .from('food_items')
        .update({ is_coming_soon: isComingSoon })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-kitchen-items'] });
      queryClient.invalidateQueries({ queryKey: ['customer-division-items-with-cooks'] });
      toast({ title: 'Item updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveItemFromDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('food_items')
        .update({
          cloud_kitchen_slot_id: null,
          set_size: 1,
          min_order_sets: 1,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud-kitchen-items'] });
      queryClient.invalidateQueries({ queryKey: ['available-cloud-kitchen-items'] });
      queryClient.invalidateQueries({ queryKey: ['cloud-kitchen-divisions'] });
      toast({ title: 'Item removed from division' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove item',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
