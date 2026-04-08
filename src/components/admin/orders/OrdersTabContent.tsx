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
import { Package, Clock, CheckCircle, XCircle, Truck, Search, AlertTriangle, ChevronDown, MapPin, User, UtensilsCrossed, Phone, MessageCircle, Navigation, Calculator, Save, Loader2, Timer, AlertCircle } from 'lucide-react';
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

const formatTimestamp = (ts: string | null | undefined) => {
  if (!ts) return null;
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const getMinutesDiff = (from: string | null | undefined, to: string | null | undefined): number | null => {
  if (!from || !to) return null;
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000);
};

const formatDuration = (minutes: number | null): string => {
  if (minutes === null) return '—';
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const isDelayed = (minutes: number | null, threshold: number): boolean => {
  return minutes !== null && minutes > threshold;
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

      // Fetch assigned cook - try order.assigned_cook_id first, fallback to order_assigned_cooks table
      let cook = null;
      let cookId = order.assigned_cook_id;
      if (!cookId) {
        // Fallback: look up from order_assigned_cooks table
        const { data: assignment } = await supabase
          .from('order_assigned_cooks')
          .select('cook_id')
          .eq('order_id', order.id)
          .in('cook_status', ['accepted', 'preparing', 'cooked', 'ready'])
          .limit(1)
          .maybeSingle();
        cookId = assignment?.cook_id || null;
      }
      if (cookId) {
        const { data: cookData } = await supabase
          .from('cooks')
          .select('kitchen_name, mobile_number, latitude, longitude')
          .eq('id', cookId)
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

  const handleCalculateDistance = (order: OrderWithProfile) => {
    const details = orderDetails[order.id];
    const cookLat = details?.cook?.latitude;
    const cookLng = details?.cook?.longitude;
    const custLat = (order as any).delivery_latitude;
    const custLng = (order as any).delivery_longitude;

    if (cookLat && cookLng && custLat && custLng) {
      const dist = calculateDistanceKm(cookLat, cookLng, custLat, custLng);
      setEditingDistance(prev => ({ ...prev, [order.id]: String(dist) }));
    } else {
      toast({ title: 'Missing Coordinates', description: 'Cook or customer location coordinates are not available', variant: 'destructive' });
    }
  };

  const handleSaveDistance = async (orderId: string) => {
    const distVal = parseFloat(editingDistance[orderId]);
    if (isNaN(distVal) || distVal < 0) {
      toast({ title: 'Invalid Distance', description: 'Please enter a valid distance', variant: 'destructive' });
      return;
    }
    setSavingDistance(prev => ({ ...prev, [orderId]: true }));
    try {
      const { error } = await supabase
        .from('orders')
        .update({ delivery_distance_km: distVal, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) throw error;
      toast({ title: 'Saved', description: `Distance updated to ${distVal} km` });
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, delivery_distance_km: distVal } : o));
      setEditingDistance(prev => { const n = { ...prev }; delete n[orderId]; return n; });
    } catch (error) {
      console.error('Error saving distance:', error);
      toast({ title: 'Error', description: 'Failed to save distance', variant: 'destructive' });
    } finally {
      setSavingDistance(prev => ({ ...prev, [orderId]: false }));
    }
  };

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
                          {' '}
                          <span className="text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        </span>
                      </div>
                      {/* Live delay indicator on card */}
                      {!['delivered', 'cancelled'].includes(order.status) && (() => {
                        const mins = getMinutesDiff(order.created_at, new Date().toISOString());
                        if (mins !== null && mins > 30) {
                          return (
                            <div className="col-span-2 flex items-center gap-1 text-xs text-destructive font-medium">
                              <AlertCircle className="h-3 w-3" />
                              {formatDuration(mins)} since placed
                            </div>
                          );
                        }
                        return null;
                      })()}
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

                            {/* Time Punch & Delay Tracker */}
                            <div className="rounded-md border p-3 space-y-2">
                              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                <Timer className="h-4 w-4 text-muted-foreground" />
                                Time Punch & Delays
                              </h4>
                              {(() => {
                                const o = order as any;
                                const orderPlaced = order.created_at;
                                const cookAssigned = o.cook_assigned_at;
                                const cookResponded = o.cook_responded_at;
                                const deliveredAt = o.delivered_at;
                                const updatedAt = order.updated_at;

                                // Calculate durations
                                const waitForCookAssign = getMinutesDiff(orderPlaced, cookAssigned);
                                const cookResponseTime = getMinutesDiff(cookAssigned, cookResponded);
                                const totalTime = deliveredAt ? getMinutesDiff(orderPlaced, deliveredAt) : null;
                                const pendingMinutes = order.status === 'pending' ? getMinutesDiff(orderPlaced, new Date().toISOString()) : null;

                                const timelineSteps = [
                                  { label: 'Order Placed', time: formatTimestamp(orderPlaced), raw: orderPlaced },
                                  { label: 'Cook Assigned', time: formatTimestamp(cookAssigned), raw: cookAssigned, duration: waitForCookAssign, durationLabel: 'Wait for assignment', threshold: 30 },
                                  { label: 'Cook Responded', time: formatTimestamp(cookResponded), raw: cookResponded, duration: cookResponseTime, durationLabel: 'Response time', threshold: 15 },
                                  ...(deliveredAt ? [{ label: 'Delivered', time: formatTimestamp(deliveredAt), raw: deliveredAt, duration: totalTime, durationLabel: 'Total time', threshold: 120 }] : []),
                                ];

                                return (
                                  <div className="space-y-1.5">
                                    {/* Active delay warning */}
                                    {pendingMinutes !== null && pendingMinutes > 15 && (
                                      <div className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive font-medium">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        Order pending for {formatDuration(pendingMinutes)} — needs attention!
                                      </div>
                                    )}
                                    {order.status !== 'cancelled' && order.status !== 'delivered' && order.status !== 'pending' && (() => {
                                      const activeMinutes = getMinutesDiff(orderPlaced, new Date().toISOString());
                                      if (activeMinutes !== null && activeMinutes > 60) {
                                        return (
                                          <div className="flex items-center gap-1.5 rounded-md bg-warning/20 px-2 py-1.5 text-xs text-warning-foreground font-medium">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            Order active for {formatDuration(activeMinutes)} (Status: {order.status})
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}

                                    {/* Timeline */}
                                    <div className="relative pl-4 space-y-2">
                                      {timelineSteps.map((step, idx) => (
                                        <div key={idx} className="relative">
                                          {/* Connector line */}
                                          {idx < timelineSteps.length - 1 && (
                                            <div className="absolute left-[-12px] top-4 w-px h-full bg-border" />
                                          )}
                                          {/* Dot */}
                                          <div className={`absolute left-[-16px] top-1 w-2 h-2 rounded-full ${step.raw ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                          <div className="flex flex-wrap items-center gap-x-2 text-xs">
                                            <span className="font-medium">{step.label}</span>
                                            {step.time ? (
                                              <span className="text-muted-foreground">{step.time}</span>
                                            ) : (
                                              <span className="text-muted-foreground italic">—</span>
                                            )}
                                            {step.duration !== undefined && step.duration !== null && (
                                              <Badge
                                                variant="outline"
                                                className={`text-[10px] px-1.5 py-0 ${isDelayed(step.duration, step.threshold || 30) ? 'border-destructive text-destructive' : 'border-border text-muted-foreground'}`}
                                              >
                                                {isDelayed(step.duration, step.threshold || 30) && '⚠ '}
                                                {step.durationLabel}: {formatDuration(step.duration)}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Summary */}
                                    {totalTime !== null && (
                                      <div className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium ${isDelayed(totalTime, 120) ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success-foreground'}`}>
                                        <Clock className="h-3.5 w-3.5" />
                                        Total Order Time: {formatDuration(totalTime)}
                                        {isDelayed(totalTime, 120) && ' — Delayed'}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Distance Calculator */}
                            <div className="rounded-md border p-3 space-y-2">
                              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                <Navigation className="h-4 w-4 text-muted-foreground" />
                                Delivery Distance
                                {(order as any).delivery_distance_km != null && (
                                  <Badge variant="outline" className="ml-auto text-xs">
                                    Saved: {(order as any).delivery_distance_km} km
                                  </Badge>
                                )}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Distance (km)"
                                  value={editingDistance[order.id] ?? ((order as any).delivery_distance_km != null ? String((order as any).delivery_distance_km) : '')}
                                  onChange={(e) => setEditingDistance(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  className="w-32 h-8 text-sm"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1"
                                  onClick={() => handleCalculateDistance(order)}
                                  title="Auto-calculate from cook & customer GPS"
                                >
                                  <Calculator className="h-3.5 w-3.5" />
                                  Calculate
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 gap-1"
                                  disabled={savingDistance[order.id]}
                                  onClick={() => handleSaveDistance(order.id)}
                                >
                                  {savingDistance[order.id] ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Save className="h-3.5 w-3.5" />
                                  )}
                                  Save
                                </Button>
                              </div>
                              {!details?.cook?.latitude && (
                                <p className="text-xs text-muted-foreground">⚠️ Cook location not set — enter distance manually</p>
                              )}
                              {!(order as any).delivery_latitude && (
                                <p className="text-xs text-muted-foreground">⚠️ Customer delivery coordinates not available</p>
                              )}
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
