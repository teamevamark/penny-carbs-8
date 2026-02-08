import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import IndoorEventsShell from './IndoorEventsShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, Users, Calendar, MapPin, Phone, Search, Edit, 
  Check, X, Loader2, IndianRupee, ChefHat
} from 'lucide-react';
import { calculatePlatformMargin } from '@/lib/priceUtils';
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
  food_item?: {
    id: string;
    name: string;
    price: number;
    platform_margin_type: string | null;
    platform_margin_value: number | null;
  };
}

// Calculate customer price for an order item (base price + platform margin)
const getItemCustomerPrice = (item: OrderItem): number => {
  if (!item.food_item) return item.unit_price;
  const basePrice = item.food_item.price;
  const marginType = (item.food_item.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = item.food_item.platform_margin_value || 0;
  const margin = calculatePlatformMargin(basePrice, marginType, marginValue);
  return basePrice + margin;
};

const getOrderCustomerTotal = (orderItems?: OrderItem[]): number => {
  if (!orderItems || orderItems.length === 0) return 0;
  return orderItems.reduce((sum, item) => sum + getItemCustomerPrice(item) * item.quantity, 0);
};

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
  event_type: { id: string; name: string; icon: string } | null;
  panchayat: { name: string } | null;
  profile: { name: string; mobile_number: string } | null;
  order_items?: OrderItem[];
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

const IndoorEventsPlanning: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<IndoorEventOrder | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    guest_count: 0,
    total_amount: 0,
    event_date: '',
    delivery_address: '',
    event_details: '',
  });
  const [editingItems, setEditingItems] = useState<Map<string, { quantity: number; unit_price: number }>>(new Map());
  
  const queryClient = useQueryClient();

  // Fetch all indoor_events orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['indoor-events-planning-all', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, status, total_amount, guest_count, event_date, 
          event_details, delivery_address, order_type, created_at, customer_id,
          panchayat_id, ward_number,
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

      // Fetch order items
      const orderIds = ordersData?.map((o: any) => o.id) || [];
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, order_id, food_item_id, quantity, unit_price, total_price, food_item:food_items(id, name, price, platform_margin_type, platform_margin_value)')
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
        order_items: orderItemsMap.get(order.id) || [],
      })) as IndoorEventOrder[];
    },
  });

  const filteredOrders = orders?.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      o.profile?.name?.toLowerCase().includes(s) ||
      o.profile?.mobile_number?.includes(s)
    );
  });

  const openEditMode = (order: IndoorEventOrder) => {
    setEditForm({
      guest_count: order.guest_count || 0,
      total_amount: order.total_amount || 0,
      event_date: order.event_date ? order.event_date.split('T')[0] : '',
      delivery_address: order.delivery_address || '',
      event_details: order.event_details || '',
    });
    
    // Initialize item editing state
    const itemsMap = new Map<string, { quantity: number; unit_price: number }>();
    order.order_items?.forEach(item => {
      itemsMap.set(item.id, { quantity: item.quantity, unit_price: item.unit_price });
    });
    setEditingItems(itemsMap);
    setEditMode(true);
  };

  const calculateItemsTotal = () => {
    let total = 0;
    editingItems.forEach((item) => {
      total += item.quantity * item.unit_price;
    });
    return total;
  };

  const updateOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Update order details
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          guest_count: editForm.guest_count,
          total_amount: editForm.total_amount,
          event_date: editForm.event_date ? new Date(editForm.event_date).toISOString() : null,
          delivery_address: editForm.delivery_address,
          event_details: editForm.event_details,
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update order items
      for (const [itemId, itemData] of editingItems) {
        const { error: itemError } = await supabase
          .from('order_items')
          .update({
            quantity: itemData.quantity,
            unit_price: itemData.unit_price,
            total_price: itemData.quantity * itemData.unit_price,
          })
          .eq('id', itemId);

        if (itemError) throw itemError;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Order Updated',
        description: 'Order details have been saved successfully.',
      });
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ['indoor-events-planning-all'] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Status Updated',
        description: `Order status changed to ${variables.status}`,
      });
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['indoor-events-planning-all'] });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const handleSaveOrder = () => {
    if (selectedOrder) {
      updateOrderMutation.mutate(selectedOrder.id);
    }
  };

  const handleUpdateStatus = (status: OrderStatus) => {
    if (selectedOrder) {
      updateStatusMutation.mutate({ orderId: selectedOrder.id, status });
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const newMap = new Map(editingItems);
    const item = newMap.get(itemId);
    if (item) {
      newMap.set(itemId, { ...item, quantity: Math.max(0, quantity) });
      setEditingItems(newMap);
    }
  };

  const updateItemPrice = (itemId: string, price: number) => {
    const newMap = new Map(editingItems);
    const item = newMap.get(itemId);
    if (item) {
      newMap.set(itemId, { ...item, unit_price: Math.max(0, price) });
      setEditingItems(newMap);
    }
  };

  return (
    <IndoorEventsShell title="Event Planning">
      {/* Info Card */}
      <Card className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200">
          <strong>Planning Hub:</strong> Review all indoor event orders, edit details (guest count, amount, items) before confirming, and manage order lifecycle.
        </CardContent>
      </Card>

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
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            No event orders found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders?.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-indoor-events/50"
              onClick={() => {
                setSelectedOrder(order);
                setEditMode(false);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-sm font-medium">{order.order_number}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${statusColors[order.status]}`} />
                        {order.status}
                      </Badge>
                      {order.order_items && order.order_items.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {order.order_items.length} items
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm">{order.profile?.name || 'Unknown'}</p>
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
                        <Phone className="h-3 w-3" />
                        {order.profile?.mobile_number}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-indoor-events">₹{(getOrderCustomerTotal(order.order_items) || order.total_amount)?.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground">{order.event_type?.icon} {order.event_type?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {order.order_type === 'full_event' ? 'Full Planning' : 'Quick Booking'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail / Edit Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => { setSelectedOrder(null); setEditMode(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                {/* Customer Info (Read-Only) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{selectedOrder.profile?.name}</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" /> {selectedOrder.profile?.mobile_number}
                    </p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" /> Ward {selectedOrder.ward_number}, {selectedOrder.panchayat?.name}
                    </p>
                  </CardContent>
                </Card>

                {/* Edit Mode Toggle */}
                {!editMode && (selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                  <Button variant="outline" className="w-full" onClick={() => openEditMode(selectedOrder)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Order Details
                  </Button>
                )}

                {/* Editable Fields */}
                {editMode ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="guest_count">Guest Count</Label>
                          <Input
                            id="guest_count"
                            type="number"
                            value={editForm.guest_count}
                            onChange={(e) => setEditForm({ ...editForm, guest_count: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="total_amount">Total Amount (₹)</Label>
                          <Input
                            id="total_amount"
                            type="number"
                            value={editForm.total_amount}
                            onChange={(e) => setEditForm({ ...editForm, total_amount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="event_date">Event Date</Label>
                        <Input
                          id="event_date"
                          type="date"
                          value={editForm.event_date}
                          onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="delivery_address">Venue Address</Label>
                        <Textarea
                          id="delivery_address"
                          value={editForm.delivery_address}
                          onChange={(e) => setEditForm({ ...editForm, delivery_address: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="event_details">Event Details / Notes</Label>
                        <Textarea
                          id="event_details"
                          value={editForm.event_details}
                          onChange={(e) => setEditForm({ ...editForm, event_details: e.target.value })}
                          rows={3}
                        />
                      </div>

                      {/* Order Items Editing */}
                      {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                        <div>
                          <Label className="mb-2 block">Order Items</Label>
                          <div className="space-y-2">
                            {selectedOrder.order_items.map((item) => {
                              const editingItem = editingItems.get(item.id);
                              return (
                                <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.food_item?.name}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      className="w-16 h-8 text-center"
                                      value={editingItem?.quantity || 0}
                                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                                    />
                                    <span className="text-xs text-muted-foreground">×</span>
                                    <Input
                                      type="number"
                                      className="w-20 h-8"
                                      value={editingItem?.unit_price || 0}
                                      onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            <p className="text-sm text-right text-muted-foreground">
                              Items Total: <strong className="text-foreground">₹{calculateItemsTotal().toLocaleString()}</strong>
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setEditMode(false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleSaveOrder}
                          disabled={updateOrderMutation.isPending}
                        >
                          {updateOrderMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* View Mode - Event Details */}
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
                          <p className="text-xs text-muted-foreground">Venue Address</p>
                          <p>{selectedOrder.delivery_address || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Order Items */}
                    {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Order Items ({selectedOrder.order_items.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          {selectedOrder.order_items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                              <div className="flex-1">
                                <p className="font-medium">{item.food_item?.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.quantity} × ₹{getItemCustomerPrice(item)}
                                </p>
                              </div>
                              <p className="font-medium">₹{(getItemCustomerPrice(item) * item.quantity).toLocaleString()}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Planning Notes */}
                    {selectedOrder.event_details && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Planning Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded-lg overflow-x-auto">
                            {selectedOrder.event_details}
                          </pre>
                        </CardContent>
                      </Card>
                    )}

                    {/* Amount Card */}
                    <Card className="bg-indoor-events/5 border-indoor-events/20">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Customer Total</span>
                          <span className="text-xl font-bold text-indoor-events">
                            ₹{(getOrderCustomerTotal(selectedOrder.order_items) || selectedOrder.total_amount)?.toLocaleString() || 0}
                          </span>
                        </div>
                        {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">Cook's Share</span>
                            <span className="text-sm text-muted-foreground">
                              ₹{selectedOrder.order_items.reduce((sum, item) => sum + (item.food_item?.price || item.unit_price) * item.quantity, 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {/* Status Actions */}
                {!editMode && (
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.status === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus('confirmed')}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Confirm Order
                      </Button>
                    )}
                    {selectedOrder.status === 'confirmed' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus('preparing')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <ChefHat className="h-4 w-4 mr-1" />
                        Start Preparing
                      </Button>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus('delivered')}
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark Delivered
                      </Button>
                    )}
                    {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleUpdateStatus('cancelled')}
                        disabled={updateStatusMutation.isPending}
                      >
                        Cancel Order
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </IndoorEventsShell>
  );
};

export default IndoorEventsPlanning;
