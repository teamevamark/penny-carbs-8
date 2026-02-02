import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCookProfile } from './useCook';
import type { CookDish, CookDishRequest, DishRequestFormData } from '@/types/cook-dishes';

// Hook for cooks to view their allocated dishes
export function useCookAllocatedDishes() {
  const { data: profile } = useCookProfile();

  return useQuery({
    queryKey: ['cook-allocated-dishes', profile?.id],
    queryFn: async (): Promise<CookDish[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('cook_dishes')
        .select(`
          id, cook_id, food_item_id, allocated_at, allocated_by, created_at, updated_at,
          food_item:food_items(id, name, price, category_id, is_vegetarian, category:food_categories(name))
        `)
        .eq('cook_id', profile.id)
        .order('allocated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as CookDish[];
    },
    enabled: !!profile?.id,
  });
}

// Hook for cooks to view their dish requests
export function useCookDishRequests() {
  const { data: profile } = useCookProfile();

  return useQuery({
    queryKey: ['cook-dish-requests', profile?.id],
    queryFn: async (): Promise<CookDishRequest[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('cook_dish_requests')
        .select(`
          *,
          food_item:food_items(id, name, price, is_vegetarian),
          dish_category:food_categories(id, name)
        `)
        .eq('cook_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as CookDishRequest[];
    },
    enabled: !!profile?.id,
  });
}

// Hook for cooks to submit a dish request
export function useSubmitDishRequest() {
  const queryClient = useQueryClient();
  const { data: profile } = useCookProfile();

  return useMutation({
    mutationFn: async (formData: DishRequestFormData) => {
      if (!profile?.id) throw new Error('Not authenticated as cook');

      const { error } = await supabase
        .from('cook_dish_requests')
        .insert({
          cook_id: profile.id,
          food_item_id: formData.food_item_id || null,
          dish_name: formData.dish_name || null,
          dish_description: formData.dish_description || null,
          dish_price: formData.dish_price || null,
          dish_preparation_time_minutes: formData.dish_preparation_time_minutes || null,
          dish_is_vegetarian: formData.dish_is_vegetarian ?? false,
          dish_category_id: formData.dish_category_id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cook-dish-requests'] });
    },
  });
}

// Admin hooks

// Fetch all dish requests for admin
export function useAdminDishRequests() {
  return useQuery({
    queryKey: ['admin-dish-requests'],
    queryFn: async (): Promise<CookDishRequest[]> => {
      const { data, error } = await supabase
        .from('cook_dish_requests')
        .select(`
          *,
          cook:cooks(id, kitchen_name, mobile_number, panchayat:panchayats(name)),
          food_item:food_items(id, name, price, is_vegetarian),
          dish_category:food_categories(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as CookDishRequest[];
    },
  });
}

// Fetch allocated dishes for a specific cook (admin view)
export function useAdminCookDishes(cookId: string | null) {
  return useQuery({
    queryKey: ['admin-cook-dishes', cookId],
    queryFn: async (): Promise<CookDish[]> => {
      if (!cookId) return [];

      const { data, error } = await supabase
        .from('cook_dishes')
        .select(`
          id, cook_id, food_item_id, allocated_at, allocated_by, created_at, updated_at,
          food_item:food_items(id, name, price, category_id, is_vegetarian, category:food_categories(name))
        `)
        .eq('cook_id', cookId)
        .order('allocated_at', { ascending: false });

      if (error) throw error;
      return data as unknown as CookDish[];
    },
    enabled: !!cookId,
  });
}

// Allocate dishes to a cook (admin)
export function useAllocateDishes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cookId, foodItemIds, userId }: { cookId: string; foodItemIds: string[]; userId: string }) => {
      // Insert multiple dishes at once
      const inserts = foodItemIds.map(foodItemId => ({
        cook_id: cookId,
        food_item_id: foodItemId,
        allocated_by: userId,
      }));

      const { error } = await supabase
        .from('cook_dishes')
        .upsert(inserts, { onConflict: 'cook_id,food_item_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cook-dishes'] });
    },
  });
}

// Remove dish allocation (admin)
export function useRemoveDishAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cook_dishes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cook-dishes'] });
    },
  });
}

// Approve/Reject dish request (admin)
export function useReviewDishRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      adminNotes,
      userId,
      createFoodItem,
      allocateToCook,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
      adminNotes?: string;
      userId: string;
      createFoodItem?: boolean;
      allocateToCook?: boolean;
    }) => {
      // Get the request details first
      const { data: request, error: fetchError } = await supabase
        .from('cook_dish_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      let createdFoodItemId: string | null = null;
      let foodItemIdToAllocate: string | null = request.food_item_id;

      // If approving a new dish request and admin wants to create it
      if (status === 'approved' && !request.food_item_id && createFoodItem && request.dish_name) {
        const { data: newItem, error: insertError } = await supabase
          .from('food_items')
          .insert({
            name: request.dish_name,
            description: request.dish_description,
            price: request.dish_price || 0,
            preparation_time_minutes: request.dish_preparation_time_minutes,
            is_vegetarian: request.dish_is_vegetarian || false,
            category_id: request.dish_category_id,
            service_type: 'indoor_events', // Default, admin can change later
            is_available: true,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        createdFoodItemId = newItem.id;
        foodItemIdToAllocate = newItem.id;
      }

      // Update the request status
      const { error: updateError } = await supabase
        .from('cook_dish_requests')
        .update({
          status,
          admin_notes: adminNotes || null,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          created_food_item_id: createdFoodItemId,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Allocate the dish to the cook if approved
      if (status === 'approved' && allocateToCook && foodItemIdToAllocate) {
        const { error: allocateError } = await supabase
          .from('cook_dishes')
          .upsert({
            cook_id: request.cook_id,
            food_item_id: foodItemIdToAllocate,
            allocated_by: userId,
          }, { onConflict: 'cook_id,food_item_id' });

        if (allocateError) throw allocateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dish-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-cook-dishes'] });
    },
  });
}

// Fetch cooks filtered by dishes they can make (for order assignment)
export function useCooksForDishes(foodItemIds: string[]) {
  return useQuery({
    queryKey: ['cooks-for-dishes', foodItemIds],
    queryFn: async () => {
      if (!foodItemIds.length) return [];

      // Get all cooks who have ALL the required dishes allocated
      const { data: allocations, error } = await supabase
        .from('cook_dishes')
        .select(`
          cook_id,
          food_item_id,
          cook:cooks(id, kitchen_name, mobile_number, is_available, rating, panchayat:panchayats(name))
        `)
        .in('food_item_id', foodItemIds);

      if (error) throw error;

      // Group by cook and check if they have all required dishes
      const cookDishMap = new Map<string, { cook: any; dishes: Set<string> }>();
      
      allocations?.forEach((alloc: any) => {
        if (!alloc.cook) return;
        
        if (!cookDishMap.has(alloc.cook_id)) {
          cookDishMap.set(alloc.cook_id, { cook: alloc.cook, dishes: new Set() });
        }
        cookDishMap.get(alloc.cook_id)!.dishes.add(alloc.food_item_id);
      });

      // Filter cooks who have ALL required dishes
      const qualifiedCooks = Array.from(cookDishMap.values())
        .filter(({ dishes }) => foodItemIds.every(id => dishes.has(id)))
        .map(({ cook }) => cook);

      return qualifiedCooks;
    },
    enabled: foodItemIds.length > 0,
  });
}
