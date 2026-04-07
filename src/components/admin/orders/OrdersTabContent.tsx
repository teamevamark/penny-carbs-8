import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStatus, ServiceType } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, Clock, CheckCircle, XCircle, Truck, Search, AlertTriangle, ChevronDown, MapPin, User, UtensilsCrossed, Phone, MessageCircle, Navigation, Calculator, Save, Loader2 } from 'lucide-react';
import GoogleMapViewer from '@/components/google-maps/GoogleMapViewer';
import { useToast } from '@/hooks/use-toast';
import { calculateDistanceKm } from '@/lib/distanceUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OrderWithProfile extends Order {
  profiles?: {
    name: string;
    mobile_number: string;
  };
  service_charge_amount?: number | null;
  guest_count?: number | null;
}

interface OrderItemDetail {
  id: string;
  food_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string | null;
  food_item?: { name: string };
  assigned_cook?: { kitchen_name: string; mobile_number: string } | null;
}

interface OrderDetail {
  items: OrderItemDetail[];
  cook?: { kitchen_name: string; mobile_number: string; latitude?: number | null; longitude?: number | null } | null;
  delivery_staff?: { name: string; mobile_number: string; vehicle_type: string } | null;
  panchayat?: { name: string } | null;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-warning text-warning-foreground', icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-primary text-primary-foreground', icon: <CheckCircle className="h-4 w-4" /> },
  preparing: { label: 'Preparing', color: 'bg-primary text-primary-foreground', icon: <Package className="h-4 w-4" /> },
  ready: { label: 'Ready', color: 'bg-success text-success-foreground', icon: <Package className="h-4 w-4" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-cloud-kitchen text-white', icon: <Truck className="h-4 w-4" /> },
  delivered: { label: 'Delivered', color: 'bg-success text-success-foreground', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-destructive text-destructive-foreground', icon: <XCircle className="h-4 w-4" /> },
};

interface OrdersTabContentProps {
  serviceType?: ServiceType;
}

const OrdersTabContent: React.FC<OrdersTabContentProps> = ({ serviceType }) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<OrderWithProfile | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [editingDistance, setEditingDistance] = useState<Record<string, string>>({});
  const [savingDistance, setSavingDistance] = useState<Record<string, boolean>>({});
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (serviceType) {
        query = query.eq('service_type', serviceType);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch all unique customer profiles in one batch
      const customerIds = [...new Set((data || []).map(o => o.customer_id))];
      const profilesMap = new Map<string, { name: string; mobile_number: string }>();

      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, mobile_number')
          .in('user_id', customerIds);

        (profiles || []).forEach(p => {
          profilesMap.set(p.user_id, { name: p.name, mobile_number: p.mobile_number });
        });
      }

      const ordersWithProfiles = (data || []).map(order => ({
        ...order,
        profiles: profilesMap.get(order.customer_id) || undefined,
      })) as OrderWithProfile[];

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({ title: 'Error', description: 'Failed to fetch orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderDetails = async (order: OrderWithProfile) => {
    if (orderDetails[order.id]) return;
    setLoadingDetails(prev => ({ ...prev, [order.id]: true }));
    try {
      // Fetch order items with food item names
      const { data: items } = await supabase
        .from('order_items')
        .select('id, food_item_id, quantity, unit_price, total_price, special_instructions, assigned_cook_id')
        .eq('order_id', order.id);

      const enrichedItems: OrderItemDetail[] = await Promise.all(
        (items || []).map(async (item) => {
          const { data: foodItem } = await supabase
            .from('food_items')
            .select('name')
            .eq('id', item.food_item_id)
            .single();

          let assigned_cook = null;
          if (item.assigned_cook_id) {
            const { data: cookData } = await supabase
              .from('cooks')
              .select('kitchen_name, mobile_number')
              .eq('id', item.assigned_cook_id)
              .single();
            assigned_cook = cookData;
          }

          return {
            ...item,
            food_item: foodItem || undefined,
            assigned_cook,
          };
        })
      );

      // Fetch assigned cook
      let cook = null;
      if (order.assigned_cook_id) {
        const { data: cookData } = await supabase
          .from('cooks')
          .select('kitchen_name, mobile_number, latitude, longitude')
          .eq('id', order.assigned_cook_id)
          .single();
        cook = cookData;
      }

      // Fetch delivery staff
      let delivery_staff = null;
      if (order.assigned_delivery_id) {
        const { data: dsData } = await supabase
          .from('delivery_staff')
          .select('name, mobile_number, vehicle_type')
          .eq('id', order.assigned_delivery_id)
          .single();
        delivery_staff = dsData;
      }

      // Fetch panchayat
      let panchayat = null;
      const { data: pData } = await supabase
        .from('panchayats')
        .select('name')
        .eq('id', order.panchayat_id)
        .single();
      panchayat = pData;

      setOrderDetails(prev => ({
        ...prev,
        [order.id]: { items: enrichedItems, cook, delivery_staff, panchayat },
      }));
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [order.id]: false }));
    }
  };

  const handleToggleExpand = (order: OrderWithProfile) => {
    const isExpanding = expandedOrderId !== order.id;
    setExpandedOrderId(isExpanding ? order.id : null);
    if (isExpanding) {
      fetchOrderDetails(order);
    }
  };

  useEffect(() => {
    setSearchQuery('');
    setExpandedOrderId(null);
    fetchOrders();
  }, [statusFilter, serviceType]);



  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, reason?: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'cancelled' && reason) {
        updateData.cancellation_reason = reason;
      }
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Order status updated' });
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Error', description: 'Failed to update order status', variant: 'destructive' });
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.profiles?.name?.toLowerCase().includes(query) ||
      order.profiles?.mobile_number?.includes(query)
    );
  });

  return (
    <div className="space-y-4 mt-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Package className="h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">No orders found</h2>
          <p className="mt-2 text-center text-muted-foreground">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Orders will appear here when customers place them'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status];
            const isExpanded = expandedOrderId === order.id;
            const details = orderDetails[order.id];
            const isDetailsLoading = loadingDetails[order.id];

            return (
              <Collapsible key={order.id} open={isExpanded} onOpenChange={() => handleToggleExpand(order)}>
                <Card>
                  <CardContent className="p-4">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-start justify-between cursor-pointer">
                        <div>
                          <p className="font-semibold">#{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.profiles?.name || 'Unknown Customer'}
                          </p>
                          {order.profiles?.mobile_number && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs text-muted-foreground">{order.profiles.mobile_number}</span>
                              <a
                                href={`tel:${order.profiles.mobile_number}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                              <a
                                href={`https://wa.me/91${order.profiles.mobile_number.replace(/\D/g, '').slice(-10)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-600 text-white hover:bg-green-700"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={`gap-1 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                          {!serviceType && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {order.service_type.replace('_', ' ')}
                            </span>
                          )}
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-semibold">₹{order.total_amount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date: </span>
                        <span>
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Order Details */}
                    <CollapsibleContent>
                      <div className="mt-4 pt-3 border-t space-y-4">
                        {/* Cancellation Reason */}
                        {order.status === 'cancelled' && order.cancellation_reason && (
                          <div className="rounded-md bg-destructive/10 p-3 text-sm">
                            <p className="font-semibold text-destructive text-xs mb-1">Cancellation Reason:</p>
                            <p className="text-foreground">{order.cancellation_reason}</p>
                          </div>
                        )}
                        {isDetailsLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        ) : details ? (
                          <>
                            {/* Order Items */}
                            <div>
                              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                                <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                                Items ({details.items.length})
                              </h4>
                              <div className="rounded-md border overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Item</TableHead>
                                      <TableHead className="text-xs text-center">Qty</TableHead>
                                      <TableHead className="text-xs text-right">Price</TableHead>
                                      <TableHead className="text-xs text-right">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {details.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="py-2 text-xs">
                                          <p>{item.food_item?.name || 'Unknown Item'}</p>
                                          {item.special_instructions && (
                                            <p className="text-muted-foreground italic mt-0.5">
                                              "{item.special_instructions}"
                                            </p>
                                          )}
                                          {item.assigned_cook && (
                                            <p className="text-muted-foreground mt-0.5">
                                              Cook: {item.assigned_cook.kitchen_name}
                                            </p>
                                          )}
                                        </TableCell>
                                        <TableCell className="py-2 text-xs text-center">{item.quantity}</TableCell>
                                        <TableCell className="py-2 text-xs text-right">₹{item.unit_price}</TableCell>
                                        <TableCell className="py-2 text-xs text-right font-medium">₹{item.total_price}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Amount Breakdown */}
                            <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Items Total</span>
                                <span>₹{details.items.reduce((s, i) => s + i.total_price, 0)}</span>
                              </div>
                              {(order.delivery_amount ?? 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Delivery</span>
                                  <span>₹{order.delivery_amount}</span>
                                </div>
                              )}
                              {(order.service_charge_amount ?? 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Service Charge</span>
                                  <span>₹{order.service_charge_amount}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                                <span>Total</span>
                                <span>₹{order.total_amount}</span>
                              </div>
                            </div>

                            {/* Location & Delivery Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  Location
                                </h4>
                                <div className="text-xs space-y-0.5">
                                  <p>{details.panchayat?.name || 'Unknown'}, Ward {order.ward_number}</p>
                                  {order.delivery_address && (
                                    <p className="text-muted-foreground">{order.delivery_address}</p>
                                  )}
                                  {order.delivery_instructions && (
                                    <p className="text-muted-foreground italic">Note: {order.delivery_instructions}</p>
                                  )}
                                </div>
                                {/* Google Map Location */}
                                {(order as any).delivery_latitude && (order as any).delivery_longitude && (
                                  <GoogleMapViewer
                                    latitude={(order as any).delivery_latitude}
                                    longitude={(order as any).delivery_longitude}
                                    height="150px"
                                    label="Delivery Pin"
                                  />
                                )}
                              </div>

                              {/* Cook Info */}
                              {details.cook && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    Cook
                                  </h4>
                                  <div className="text-xs space-y-0.5">
                                    <p>{details.cook.kitchen_name}</p>
                                    <p className="flex items-center gap-1.5 text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {details.cook.mobile_number}
                                      <a href={`tel:${details.cook.mobile_number}`} className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground"><Phone className="h-2.5 w-2.5" /></a>
                                      <a href={`https://wa.me/91${details.cook.mobile_number.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-600 text-white"><MessageCircle className="h-2.5 w-2.5" /></a>
                                    </p>
                                    {order.cook_status && (
                                      <Badge variant="outline" className="text-xs capitalize mt-1">
                                        {order.cook_status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Delivery Staff Info */}
                              {details.delivery_staff && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                    Delivery
                                  </h4>
                                  <div className="text-xs space-y-0.5">
                                    <p>{details.delivery_staff.name}</p>
                                    <p className="flex items-center gap-1.5 text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {details.delivery_staff.mobile_number}
                                      <a href={`tel:${details.delivery_staff.mobile_number}`} className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground"><Phone className="h-2.5 w-2.5" /></a>
                                      <a href={`https://wa.me/91${details.delivery_staff.mobile_number.replace(/\D/g, '').slice(-10)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-600 text-white"><MessageCircle className="h-2.5 w-2.5" /></a>
                                    </p>
                                    <p className="text-muted-foreground capitalize">{details.delivery_staff.vehicle_type}</p>
                                    {order.delivery_status && (
                                      <Badge variant="outline" className="text-xs capitalize mt-1">
                                        {order.delivery_status}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Event Details (for indoor events) */}
                              {order.event_date && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Event</h4>
                                  <div className="text-xs space-y-0.5">
                                    <p>Date: {new Date(order.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    {order.guest_count && <p>Guests: {order.guest_count}</p>}
                                    {order.event_details && <p className="text-muted-foreground">{order.event_details}</p>}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </CollapsibleContent>

                    {/* Status Update Actions */}
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Update Status:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => updateOrderStatus(order.id, 'confirmed')}>
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setOrderToCancel(order);
                                setCancellationReason('');
                                setCancelDialogOpen(true);
                              }}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                            Start Preparing
                          </Button>
                        )}
                        {order.status === 'preparing' && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'ready')}>
                            Mark Ready
                          </Button>
                        )}
                        {order.status === 'ready' && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}>
                            Out for Delivery
                          </Button>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, 'delivered')}>
                            Mark Delivered
                          </Button>
                        )}
                        {['delivered', 'cancelled'].includes(order.status) && (
                          <span className="text-sm text-muted-foreground italic">Order completed</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setOrderToCancel(null);
          setCancellationReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Order
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Are you sure you want to cancel order{' '}
                  <span className="font-mono font-semibold">#{orderToCancel?.order_number}</span>?
                </p>
                <Textarea
                  placeholder="Enter cancellation reason (required)..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="min-h-[80px]"
                />
                <p className="text-destructive font-medium text-xs">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!cancellationReason.trim()}
              onClick={() => {
                if (orderToCancel && cancellationReason.trim()) {
                  updateOrderStatus(orderToCancel.id, 'cancelled', cancellationReason.trim());
                  setCancelDialogOpen(false);
                  setOrderToCancel(null);
                  setCancellationReason('');
                }
              }}
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersTabContent;
