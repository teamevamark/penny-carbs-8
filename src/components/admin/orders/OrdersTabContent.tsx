import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderStatus, ServiceType } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Package, Clock, CheckCircle, XCircle, Truck, Search, AlertTriangle, MessageCircle, Phone, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface OrderWithProfile extends Order {
  profiles?: {
    name: string;
    mobile_number: string;
  };
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
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<OrderWithProfile | null>(null);
  const [cancelReason, setCancelReason] = useState('');
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

  useEffect(() => {
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

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">#{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.profiles?.name || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.profiles?.mobile_number}
                      </p>
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
                    </div>
                  </div>

                  {/* Quick Actions: WhatsApp, Call, View Detail */}
                  <div className="mt-2 flex items-center gap-2">
                    {order.profiles?.mobile_number && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const phone = order.profiles!.mobile_number.replace(/\D/g, '');
                            const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
                            window.open(`https://wa.me/${fullPhone}?text=Hi%20${encodeURIComponent(order.profiles!.name)}%2C%20regarding%20your%20order%20%23${order.order_number}`, '_blank');
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`tel:${order.profiles!.mobile_number}`, '_self');
                          }}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/order/${order.id}`);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Button>
                  </div>

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
            );
          })}
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) { setOrderToCancel(null); setCancelReason(''); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Order
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Are you sure you want to cancel order{' '}
                  <span className="font-mono font-semibold">#{orderToCancel?.order_number}</span>?
                </p>
                <p className="text-destructive font-medium mt-1">This action cannot be undone.</p>
                <div className="mt-3">
                  <label className="text-sm font-medium text-foreground">Cancellation Reason *</label>
                  <Textarea
                    placeholder="Enter reason for cancellation..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!cancelReason.trim()}
              onClick={() => {
                if (orderToCancel && cancelReason.trim()) {
                  updateOrderStatus(orderToCancel.id, 'cancelled', cancelReason.trim());
                  setCancelDialogOpen(false);
                  setOrderToCancel(null);
                  setCancelReason('');
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
