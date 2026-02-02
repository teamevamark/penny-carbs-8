import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import IndoorEventsShell from './IndoorEventsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ChefHat, Calendar, Users, MapPin, Check, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';

interface OrderWithItems {
  id: string;
  order_number: string;
  status: string;
  guest_count: number | null;
  event_date: string | null;
  delivery_address: string | null;
  panchayat_id: string;
  ward_number: number;
  assigned_cook_id: string | null;
  event_type?: { name: string; icon: string };
  panchayat?: { name: string };
  profile?: { name: string };
  order_items?: { food_item_id: string; food_item?: { name: string } }[];
}

interface CookWithDishes {
  id: string;
  kitchen_name: string;
  mobile_number: string;
  panchayat_id: string | null;
  is_available: boolean;
  rating: number | null;
  panchayat?: { name: string };
  allocated_dishes: Set<string>;
}

const IndoorEventsCooks: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCooks, setSelectedCooks] = useState<Record<string, string>>({});

  // Get confirmed orders without cook assigned - include order items
  const { data: ordersNeedingCook, isLoading: ordersLoading } = useQuery({
    queryKey: ['indoor-events-cook-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, guest_count, event_date, 
          delivery_address, panchayat_id, ward_number, assigned_cook_id,
          event_type:event_types(name, icon),
          panchayat:panchayats(name),
          profile:profiles!orders_customer_id_fkey(name),
          order_items(food_item_id, food_item:food_items(name))
        `)
        .eq('service_type', 'indoor_events')
        .in('status', ['confirmed', 'preparing'])
        .is('assigned_cook_id', null)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as unknown as OrderWithItems[];
    },
  });

  // Get available cooks for indoor events with their allocated dishes
  const { data: cooksWithDishes, isLoading: cooksLoading } = useQuery({
    queryKey: ['indoor-events-cooks-with-dishes'],
    queryFn: async () => {
      // Get cooks
      const { data: cooksData, error: cooksError } = await supabase
        .from('cooks')
        .select(`
          id, kitchen_name, mobile_number, panchayat_id, is_available, rating,
          panchayat:panchayats(name)
        `)
        .eq('is_active', true)
        .contains('allowed_order_types', ['indoor_events'])
        .order('rating', { ascending: false });

      if (cooksError) throw cooksError;

      // Get all dish allocations for these cooks
      const cookIds = cooksData?.map(c => c.id) || [];
      const { data: allocations, error: allocError } = await supabase
        .from('cook_dishes')
        .select('cook_id, food_item_id')
        .in('cook_id', cookIds);

      if (allocError) throw allocError;

      // Build a map of cook_id -> Set of food_item_ids
      const dishMap = new Map<string, Set<string>>();
      allocations?.forEach(a => {
        if (!dishMap.has(a.cook_id)) {
          dishMap.set(a.cook_id, new Set());
        }
        dishMap.get(a.cook_id)!.add(a.food_item_id);
      });

      // Attach allocated dishes to cooks
      return cooksData?.map(cook => ({
        ...cook,
        allocated_dishes: dishMap.get(cook.id) || new Set(),
      })) as CookWithDishes[];
    },
  });

  // Filter cooks for a specific order based on dishes
  const getQualifiedCooks = (order: OrderWithItems) => {
    if (!cooksWithDishes) return [];

    const requiredDishIds = order.order_items?.map(item => item.food_item_id) || [];
    
    // If no items in order, show all available cooks
    if (requiredDishIds.length === 0) {
      return cooksWithDishes.filter(c => c.is_available);
    }

    // Filter cooks who have ALL required dishes allocated
    return cooksWithDishes.filter(cook => {
      if (!cook.is_available) return false;
      return requiredDishIds.every(dishId => cook.allocated_dishes.has(dishId));
    });
  };

  const assignCookMutation = useMutation({
    mutationFn: async ({ orderId, cookId }: { orderId: string; cookId: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          assigned_cook_id: cookId,
          cook_assigned_at: new Date().toISOString(),
          cook_assignment_status: 'pending'
        })
        .eq('id', orderId);
      if (error) throw error;

      // Also create an entry in order_assigned_cooks
      const { error: assignError } = await supabase
        .from('order_assigned_cooks')
        .insert({
          order_id: orderId,
          cook_id: cookId,
          cook_status: 'pending',
        });
      if (assignError) throw assignError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['indoor-events-cook-assignment'] });
      toast({ title: 'Cook assigned successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to assign cook', description: err.message, variant: 'destructive' });
    },
  });

  const handleAssign = (orderId: string) => {
    const cookId = selectedCooks[orderId];
    if (!cookId) {
      toast({ title: 'Select a cook first', variant: 'destructive' });
      return;
    }
    assignCookMutation.mutate({ orderId, cookId });
  };

  const isLoading = ordersLoading || cooksLoading;

  return (
    <IndoorEventsShell title="Cook Assignment">
      {/* Available Cooks Summary */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Available Cooks ({cooksWithDishes?.filter(c => c.is_available).length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {cooksWithDishes?.filter(c => c.is_available).slice(0, 5).map((cook) => (
              <Badge key={cook.id} variant="outline" className="text-xs">
                {cook.kitchen_name} ({cook.panchayat?.name || 'N/A'}) • {cook.allocated_dishes.size} dishes
              </Badge>
            ))}
            {(cooksWithDishes?.filter(c => c.is_available).length || 0) > 5 && (
              <Badge variant="secondary" className="text-xs">+{cooksWithDishes!.filter(c => c.is_available).length - 5} more</Badge>
            )}
            {cooksWithDishes?.filter(c => c.is_available).length === 0 && (
              <span className="text-sm text-muted-foreground">No available cooks</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders needing cook */}
      <h3 className="text-sm font-medium mb-3">Orders Needing Cook Assignment</h3>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : ordersNeedingCook?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
            All confirmed orders have cooks assigned
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordersNeedingCook?.map((order) => {
            const qualifiedCooks = getQualifiedCooks(order);
            const orderDishes = order.order_items?.map(item => item.food_item?.name).filter(Boolean) || [];
            const hasNoCooks = qualifiedCooks.length === 0 && orderDishes.length > 0;

            return (
              <Card key={order.id} className={hasNoCooks ? 'border-orange-300 bg-orange-50/50' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-sm font-medium">{order.order_number}</p>
                      <p className="text-sm">{order.profile?.name}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{order.status}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {order.event_date ? format(new Date(order.event_date), 'dd MMM yyyy') : 'No date'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {order.guest_count || '?'} guests
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Ward {order.ward_number}, {order.panchayat?.name}
                    </span>
                  </div>

                  {/* Order Dishes */}
                  {orderDishes.length > 0 && (
                    <div className="flex items-start gap-2 text-xs">
                      <UtensilsCrossed className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {orderDishes.map((dish, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {dish}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warning if no qualified cooks */}
                  {hasNoCooks && (
                    <div className="flex items-center gap-2 p-2 rounded bg-orange-100 text-orange-700 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>No cooks have all required dishes allocated. Allocate dishes first in Admin → Cooks → Dishes tab.</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select
                      value={selectedCooks[order.id] || ''}
                      onValueChange={(v) => setSelectedCooks(prev => ({ ...prev, [order.id]: v }))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={hasNoCooks ? "No qualified cooks" : "Select cook..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {qualifiedCooks.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">No cooks available</div>
                        ) : (
                          qualifiedCooks.map((cook) => (
                            <SelectItem key={cook.id} value={cook.id}>
                              {cook.kitchen_name} • ⭐{cook.rating || 0} • {cook.panchayat?.name || 'N/A'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleAssign(order.id)}
                      disabled={!selectedCooks[order.id] || assignCookMutation.isPending}
                    >
                      Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </IndoorEventsShell>
  );
};

export default IndoorEventsCooks;
