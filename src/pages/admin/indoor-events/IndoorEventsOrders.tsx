import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import IndoorEventsShell from './IndoorEventsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Eye, Search, Calendar, Users, MapPin, Phone, ChefHat, Loader2, RotateCcw, Truck, Package, CheckCircle2, Car } from 'lucide-react';
import VehicleSelectionDialog from '@/components/admin/indoor-events/VehicleSelectionDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  food_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  assigned_cook_id: string | null;
  food_item?: { id: string; name: string; price: number };
}

interface IndoorEventOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  guest_count: number | null;
  event_date: string | null;
  event_details: string | null;
  delivery_address: string | null;
  order_type: string | null;
  created_at: string;
  customer_id: string;
  panchayat_id: string;
  ward_number: number;
  assigned_cook_id: string | null;
  event_type: { id: string; name: string; icon: string } | null;
  panchayat: { name: string } | null;
  profile: { name: string; mobile_number: string } | null;
  assigned_cooks?: { cook_id: string; cook_status: string }[];
  order_items?: OrderItem[];
}

interface Cook {
  id: string;
  kitchen_name: string;
  mobile_number: string;
  is_available: boolean;
  panchayat?: { name: string };
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-orange-500',
  ready: 'bg-purple-500',
  out_for_delivery: 'bg-indigo-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-destructive',
};

const IndoorEventsOrders: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<IndoorEventOrder | null>(null);
  const [cookSelectionOpen, setCookSelectionOpen] = useState(false);
  const [selectedCooks, setSelectedCooks] = useState<string[]>([]);
  const [dishCookAssignments, setDishCookAssignments] = useState<Map<string, string>>(new Map());
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [vehicleDialogOrder, setVehicleDialogOrder] = useState<IndoorEventOrder | null>(null);
  const queryClient = useQueryClient();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['indoor-events-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, status, total_amount, guest_count, event_date, 
          event_details, delivery_address, order_type, created_at, customer_id,
          panchayat_id, ward_number, assigned_cook_id,
          event_type:event_types(id, name, icon),
          panchayat:panchayats(name)
        `)
        .eq('service_type', 'indoor_events')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as OrderStatus);
      }

      const { data: ordersData, error } = await query;
      if (error) throw error;

      // Fetch profiles for customer_ids
      const customerIds = ordersData?.map((o: any) => o.customer_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      // Fetch assigned cooks for orders
      const orderIds = ordersData?.map((o: any) => o.id) || [];
      const { data: assignedCooks } = await supabase
        .from('order_assigned_cooks')
        .select('order_id, cook_id, cook_status')
        .in('order_id', orderIds);

      const assignedCooksMap = new Map<string, { cook_id: string; cook_status: string }[]>();
      assignedCooks?.forEach((ac: any) => {
        if (!assignedCooksMap.has(ac.order_id)) {
          assignedCooksMap.set(ac.order_id, []);
        }
        assignedCooksMap.get(ac.order_id)!.push({ cook_id: ac.cook_id, cook_status: ac.cook_status });
      });

      // Fetch order items with assigned cooks
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, order_id, food_item_id, quantity, unit_price, total_price, assigned_cook_id, food_item:food_items(id, name, price)')
        .in('order_id', orderIds);

      const orderItemsMap = new Map<string, OrderItem[]>();
      orderItems?.forEach((item: any) => {
        if (!orderItemsMap.has(item.order_id)) {
          orderItemsMap.set(item.order_id, []);
        }
        orderItemsMap.get(item.order_id)!.push(item);
      });

      return ordersData?.map((order: any) => ({
        ...order,
        profile: profileMap.get(order.customer_id) || null,
        assigned_cooks: assignedCooksMap.get(order.id) || [],
        order_items: orderItemsMap.get(order.id) || [],
      })) as IndoorEventOrder[];
    },
  });

  // Fetch available cooks
  const { data: cooks } = useQuery({
    queryKey: ['available-cooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooks')
        .select('id, kitchen_name, mobile_number, is_available, panchayat:panchayats(name)')
        .eq('is_active', true)
        .order('kitchen_name');
      if (error) throw error;
      return data as Cook[];
    },
  });

  // Fetch cook dish allocations to filter cooks per dish
  const { data: cookDishAllocations } = useQuery({
    queryKey: ['cook-dish-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cook_dishes')
        .select('cook_id, food_item_id');
      if (error) throw error;
      return data as { cook_id: string; food_item_id: string }[];
    },
  });

  // Helper to get cooks who can make a specific dish
  const getCooksForDish = (foodItemId: string): Cook[] => {
    if (!cooks || !cookDishAllocations) return [];
    const allocatedCookIds = cookDishAllocations
      .filter(a => a.food_item_id === foodItemId)
      .map(a => a.cook_id);
    return cooks.filter(c => allocatedCookIds.includes(c.id));
  };

  const filteredOrders = orders?.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      o.profile?.name?.toLowerCase().includes(s) ||
      o.profile?.mobile_number?.includes(s)
    );
  });

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      refetch();
      setSelectedOrder(null);
      toast({
        title: 'Status Updated',
        description: `Order status changed to ${newStatus.replace('_', ' ')}`,
      });
    }
  };

  // Mark order as delivered and create settlements for cooks
  const markDeliveredMutation = useMutation({
    mutationFn: async (order: IndoorEventOrder) => {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Get assigned cooks and their order items totals
      const cookTotals = new Map<string, number>();
      order.order_items?.forEach(item => {
        if (item.assigned_cook_id) {
          const current = cookTotals.get(item.assigned_cook_id) || 0;
          cookTotals.set(item.assigned_cook_id, current + item.total_price);
        }
      });

      // Get cook user_ids
      const cookIds = [...cookTotals.keys()];
      if (cookIds.length === 0) return;

      const { data: cooks } = await supabase
        .from('cooks')
        .select('id, user_id')
        .in('id', cookIds);

      // Create settlements for each cook
      const settlements = cooks?.filter(c => c.user_id).map(cook => ({
        user_id: cook.user_id!,
        order_id: order.id,
        amount: cookTotals.get(cook.id) || 0,
        status: 'pending',
        panchayat_id: order.panchayat_id,
        ward_number: order.ward_number,
      })) || [];

      if (settlements.length > 0) {
        const { error: settleError } = await supabase
          .from('settlements')
          .insert(settlements);

        if (settleError) throw settleError;
      }

      // Update cook assignment status to ready
      await supabase
        .from('order_assigned_cooks')
        .update({ cook_status: 'ready' })
        .eq('order_id', order.id);
    },
    onSuccess: () => {
      toast({
        title: 'Order Delivered',
        description: 'Settlements created for cooks',
      });
      refetch();
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['cook-settlements-admin'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete delivery',
        variant: 'destructive',
      });
    },
  });

  const openCookSelection = (order: IndoorEventOrder) => {
    setSelectedOrder(order);
    // Pre-populate dish-cook assignments from existing data
    const assignments = new Map<string, string>();
    order.order_items?.forEach(item => {
      if (item.assigned_cook_id) {
        assignments.set(item.id, item.assigned_cook_id);
      }
    });
    setDishCookAssignments(assignments);
    // Legacy: keep selectedCooks for order_assigned_cooks table
    setSelectedCooks(order.assigned_cooks?.map(ac => ac.cook_id) || []);
    setCookSelectionOpen(true);
  };

  const assignCooksMutation = useMutation({
    mutationFn: async ({ orderId, dishAssignments }: { orderId: string; dishAssignments: Map<string, string> }) => {
      // Update each order_item with its assigned cook
      for (const [itemId, cookId] of dishAssignments) {
        const { error } = await supabase
          .from('order_items')
          .update({ assigned_cook_id: cookId })
          .eq('id', itemId);
        if (error) throw error;
      }

      // Get unique cook IDs for the order_assigned_cooks table
      const uniqueCookIds = [...new Set(dishAssignments.values())];

      // Remove existing order-level assignments
      await supabase
        .from('order_assigned_cooks')
        .delete()
        .eq('order_id', orderId);

      // Insert new assignments
      if (uniqueCookIds.length > 0) {
        const assignments = uniqueCookIds.map(cookId => ({
          order_id: orderId,
          cook_id: cookId,
          cook_status: 'pending',
        }));

        const { error } = await supabase
          .from('order_assigned_cooks')
          .insert(assignments);

        if (error) throw error;
      }

      // Update order status to preparing
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'preparing' })
        .eq('id', orderId);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      const assignedCount = dishCookAssignments.size;
      toast({
        title: 'Cooks Assigned',
        description: `Cooks assigned to ${assignedCount} dish(es) and order marked as preparing`,
      });
      setCookSelectionOpen(false);
      setDishCookAssignments(new Map());
      setSelectedCooks([]);
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['indoor-events-orders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign cooks',
        variant: 'destructive',
      });
    },
  });

  const handleAssignCooksAndPrepare = () => {
    if (!selectedOrder) return;
    
    // Check if at least one dish has a cook assigned
    if (dishCookAssignments.size === 0) {
      toast({
        title: 'Assign Cooks',
        description: 'Please assign at least one cook to a dish',
        variant: 'destructive',
      });
      return;
    }

    assignCooksMutation.mutate({ orderId: selectedOrder.id, dishAssignments: dishCookAssignments });
  };

  const handleDishCookChange = (itemId: string, cookId: string) => {
    const newAssignments = new Map(dishCookAssignments);
    if (cookId === 'none') {
      newAssignments.delete(itemId);
    } else {
      newAssignments.set(itemId, cookId);
    }
    setDishCookAssignments(newAssignments);
  };

  const toggleCookSelection = (cookId: string) => {
    setSelectedCooks(prev =>
      prev.includes(cookId)
        ? prev.filter(id => id !== cookId)
        : [...prev, cookId]
    );
  };

  return (
    <IndoorEventsShell title="All Event Bookings">
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, name, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="out_for_delivery">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredOrders?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No event bookings found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders?.map((order) => (
            <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${statusColors[order.status]}`} />
                        {order.status}
                      </Badge>
                      {order.assigned_cooks && order.assigned_cooks.length > 0 && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            order.assigned_cooks.every(ac => ac.cook_status === 'ready' || ac.cook_status === 'cooked') 
                              ? 'bg-green-100 text-green-700' 
                              : order.assigned_cooks.some(ac => ac.cook_status === 'preparing')
                              ? 'bg-orange-100 text-orange-700'
                              : order.assigned_cooks.some(ac => ac.cook_status === 'accepted')
                              ? 'bg-blue-100 text-blue-700'
                              : ''
                          }`}
                        >
                          <ChefHat className="h-3 w-3 mr-1" />
                          {order.assigned_cooks.every(ac => ac.cook_status === 'ready' || ac.cook_status === 'cooked') 
                            ? 'Cooked' 
                            : order.assigned_cooks.some(ac => ac.cook_status === 'preparing')
                            ? 'Cooking'
                            : order.assigned_cooks.some(ac => ac.cook_status === 'accepted')
                            ? 'Accepted'
                            : `${order.assigned_cooks.length} cook(s)`
                          }
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{order.profile?.name || 'Unknown'}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
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
                        Ward {order.ward_number}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-indoor-events">₹{order.total_amount?.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground">{order.event_type?.icon} {order.event_type?.name || 'Event'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder && !cookSelectionOpen} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{selectedOrder.order_number}</span>
                  <Badge variant="outline" className="capitalize">
                    <span className={`mr-1.5 h-2 w-2 rounded-full ${statusColors[selectedOrder.status]}`} />
                    {selectedOrder.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder.event_type?.icon} {selectedOrder.event_type?.name || 'Event'} • {selectedOrder.order_type === 'full_event' ? 'Full Planning' : 'Quick Booking'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{selectedOrder.profile?.name}</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {selectedOrder.profile?.mobile_number}
                    </p>
                  </CardContent>
                </Card>

                {/* Event Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p>{selectedOrder.event_date ? format(new Date(selectedOrder.event_date), 'PPP') : 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Guests</p>
                        <p>{selectedOrder.guest_count || '-'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p>Ward {selectedOrder.ward_number}, {selectedOrder.panchayat?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Venue Address</p>
                      <p>{selectedOrder.delivery_address || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items with Assigned Cooks */}
                {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ChefHat className="h-4 w-4" />
                        Dishes & Cook Assignments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="space-y-2">
                        {selectedOrder.order_items.map((item) => {
                          const cook = cooks?.find(c => c.id === item.assigned_cook_id);
                          return (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted">
                              <div className="flex-1">
                                <p className="font-medium">{item.food_item?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  Qty: {item.quantity} × ₹{item.unit_price}
                                </p>
                              </div>
                              <div className="text-right">
                                {cook ? (
                                  <Badge variant="secondary" className="text-xs">
                                    <ChefHat className="h-3 w-3 mr-1" />
                                    {cook.kitchen_name}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">No cook</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Details / Planning Info */}
                {selectedOrder.event_details && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Planning Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-lg overflow-x-auto">
                        {selectedOrder.event_details}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Amount */}
                <Card className="bg-indoor-events/5 border-indoor-events/20">
                  <CardContent className="py-4 flex items-center justify-between">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-xl font-bold text-indoor-events">
                      ₹{selectedOrder.total_amount?.toLocaleString() || 0}
                    </span>
                  </CardContent>
                </Card>

                {/* Status Actions - Complete workflow */}
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === 'pending' && (
                    <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirm Order
                    </Button>
                  )}
                  {selectedOrder.status === 'confirmed' && (
                    <Button size="sm" onClick={() => openCookSelection(selectedOrder)}>
                      <ChefHat className="h-4 w-4 mr-1" />
                      Assign Cooks & Start Preparing
                    </Button>
                  )}
                  {selectedOrder.status === 'preparing' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openCookSelection(selectedOrder)}>
                        <ChefHat className="h-4 w-4 mr-1" />
                        Re-assign Cooks
                      </Button>
                      <Button size="sm" onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}>
                        <Package className="h-4 w-4 mr-1" />
                        Mark Ready
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === 'ready' && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setVehicleDialogOrder(selectedOrder);
                        setVehicleDialogOpen(true);
                      }}
                    >
                      <Car className="h-4 w-4 mr-1" />
                      Shipped (Out for Delivery)
                    </Button>
                  )}
                  {selectedOrder.status === 'out_for_delivery' && (
                    <Button 
                      size="sm" 
                      onClick={() => markDeliveredMutation.mutate(selectedOrder)}
                      disabled={markDeliveredMutation.isPending}
                    >
                      {markDeliveredMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark Delivered
                    </Button>
                  )}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}>
                      Cancel
                    </Button>
                  )}
                  {selectedOrder.status === 'cancelled' && (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(selectedOrder.id, 'pending')}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore Order
                    </Button>
                  )}
                  {selectedOrder.status === 'delivered' && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Order Completed
                    </Badge>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cook Selection Dialog - Per Dish Assignment */}
      <Dialog open={cookSelectionOpen} onOpenChange={setCookSelectionOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Assign Cooks to Dishes
            </DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.order_number} - Assign a cook to each dish
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Show message if no order items */}
            {(!selectedOrder?.order_items || selectedOrder.order_items.length === 0) ? (
              <div className="text-center py-6 text-muted-foreground">
                <ChefHat className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No dishes in this order</p>
                <p className="text-xs mt-1">Add dishes to the order before assigning cooks</p>
              </div>
            ) : (
              <>
                {/* Dishes with cook selector */}
                <div className="space-y-3">
                {selectedOrder.order_items.map((item) => {
                    const assignedCookId = dishCookAssignments.get(item.id) || item.assigned_cook_id || '';
                    const assignedCook = cooks?.find(c => c.id === assignedCookId);
                    const eligibleCooks = getCooksForDish(item.food_item_id);
                    
                    return (
                      <div key={item.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.food_item?.name || 'Unknown Dish'}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} × ₹{item.unit_price} = ₹{item.total_price}
                            </p>
                          </div>
                          {eligibleCooks.length === 0 && (
                            <Badge variant="destructive" className="text-xs">
                              No cooks allocated
                            </Badge>
                          )}
                        </div>
                        
                        <Select
                          value={dishCookAssignments.get(item.id) || 'none'}
                          onValueChange={(value) => handleDishCookChange(item.id, value)}
                          disabled={eligibleCooks.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select cook for this dish">
                              {assignedCook ? (
                                <span className="flex items-center gap-2">
                                  <ChefHat className="h-3 w-3" />
                                  {assignedCook.kitchen_name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {eligibleCooks.length === 0 ? 'No cooks available for this dish' : 'Select cook...'}
                                </span>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <span className="text-muted-foreground">No cook assigned</span>
                            </SelectItem>
                            {eligibleCooks.map((cook) => (
                              <SelectItem key={cook.id} value={cook.id}>
                                <div className="flex items-center gap-2">
                                  <span>{cook.kitchen_name}</span>
                                  {!cook.is_available && (
                                    <Badge variant="secondary" className="text-xs">Offline</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Dishes with cooks assigned:</span>
                    <span className="font-medium">
                      {dishCookAssignments.size} / {selectedOrder.order_items.length}
                    </span>
                  </div>
                  {dishCookAssignments.size > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Assigned cooks:</p>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(dishCookAssignments.values())].map(cookId => {
                          const cook = cooks?.find(c => c.id === cookId);
                          return cook ? (
                            <Badge key={cookId} variant="secondary" className="text-xs">
                              <ChefHat className="h-3 w-3 mr-1" />
                              {cook.kitchen_name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCookSelectionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignCooksAndPrepare}
              disabled={dishCookAssignments.size === 0 || assignCooksMutation.isPending}
            >
              {assignCooksMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign & Start Preparing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Selection Dialog */}
      {vehicleDialogOrder && (
        <VehicleSelectionDialog
          open={vehicleDialogOpen}
          onOpenChange={setVehicleDialogOpen}
          orderId={vehicleDialogOrder.id}
          orderNumber={vehicleDialogOrder.order_number}
          onSuccess={() => {
            setSelectedOrder(null);
            setVehicleDialogOrder(null);
            refetch();
          }}
        />
      )}
    </IndoorEventsShell>
  );
};

export default IndoorEventsOrders;