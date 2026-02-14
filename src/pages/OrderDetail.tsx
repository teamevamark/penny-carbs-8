import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Order, OrderStatus, OrderItem, FoodItem } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, Clock, CheckCircle, XCircle, Truck, MapPin, Phone } from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import OrderRating from '@/components/customer/OrderRating';

interface OrderItemWithFood extends OrderItem {
  food_item: FoodItem;
  assigned_cook_id: string | null;
}

// Get the customer-facing price (base + platform margin)
const getCustomerUnitPrice = (item: OrderItemWithFood): number => {
  const foodItem = item.food_item;
  if (!foodItem) return item.unit_price;
  const marginType = (foodItem.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = foodItem.platform_margin_value || 0;
  const margin = calculatePlatformMargin(foodItem.price, marginType, marginValue);
  return foodItem.price + margin;
};

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-warning text-warning-foreground', icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-primary text-primary-foreground', icon: <CheckCircle className="h-4 w-4" /> },
  preparing: { label: 'Preparing', color: 'bg-primary text-primary-foreground', icon: <Package className="h-4 w-4" /> },
  ready: { label: 'Ready', color: 'bg-success text-success-foreground', icon: <Package className="h-4 w-4" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-cloud-kitchen text-white', icon: <Truck className="h-4 w-4" /> },
  delivered: { label: 'Delivered', color: 'bg-success text-success-foreground', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-destructive text-destructive-foreground', icon: <XCircle className="h-4 w-4" /> },
};

const OrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemWithFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!user || !orderId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('customer_id', user.id)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData as Order);

        // Fetch order items with food item details
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            *,
            food_item:food_items(*)
          `)
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;
        setOrderItems(itemsData as OrderItemWithFood[]);
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [user, orderId]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 pb-20">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Login to view order</h2>
        <Button className="mt-6" onClick={() => navigate('/auth')}>
          Login / Sign Up
        </Button>
        <BottomNav />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-6 w-32" />
        </header>
        <main className="p-4 space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const deliveryStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: <Clock className="h-4 w-4" /> },
    assigned: { label: 'Assigned', color: 'bg-primary text-primary-foreground', icon: <Truck className="h-4 w-4" /> },
    picked_up: { label: 'Picked Up', color: 'bg-warning text-warning-foreground', icon: <Truck className="h-4 w-4" /> },
    delivered: { label: 'Delivered', color: 'bg-success text-success-foreground', icon: <CheckCircle className="h-4 w-4" /> },
  };

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 pb-20">
        <Package className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Order not found</h2>
        <p className="mt-2 text-center text-muted-foreground">
          This order doesn't exist or you don't have access to it
        </p>
        <Button className="mt-6" onClick={() => navigate('/orders')}>
          View All Orders
        </Button>
        <BottomNav />
      </div>
    );
  }

  const status = statusConfig[order.status];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">Order #{order.order_number}</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* Status Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order Status</p>
                <Badge className={`mt-1 gap-1 ${status.color}`}>
                  {status.icon}
                  {status.label}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Status */}
        {order.delivery_status && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Status</p>
                  {(() => {
                    // If order is delivered, override delivery status display
                    const effectiveDeliveryStatus = order.status === 'delivered' ? 'delivered' : order.delivery_status;
                    const ds = deliveryStatusConfig[effectiveDeliveryStatus] || { label: effectiveDeliveryStatus, color: 'bg-muted text-muted-foreground', icon: <Truck className="h-4 w-4" /> };
                    return (
                      <Badge className={`mt-1 gap-1 ${ds.color}`}>
                        {ds.icon}
                        {ds.label}
                      </Badge>
                    );
                  })()}
                </div>
                {order.delivery_eta && order.status !== 'delivered' && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">ETA</p>
                    <p className="font-medium">
                      {new Date(order.delivery_eta).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
                {order.delivered_at && order.status === 'delivered' && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Delivered At</p>
                    <p className="font-medium">
                      {new Date(order.delivered_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Items</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {orderItems.map((item) => {
                const customerPrice = getCustomerUnitPrice(item);
                const itemTotal = customerPrice * item.quantity;
                return (
                  <div key={item.id} className="flex justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{item.food_item?.name || 'Item'}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{customerPrice} × {item.quantity}
                      </p>
                      {item.special_instructions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: {item.special_instructions}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold">₹{itemTotal}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-between border-t pt-3">
              <p className="font-semibold">Total</p>
              <p className="font-semibold text-primary">
                ₹{orderItems.length > 0
                  ? orderItems.reduce((sum, item) => sum + getCustomerUnitPrice(item) * item.quantity, 0)
                  : order.total_amount}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        {order.delivery_address && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm">{order.delivery_address}</p>
              {order.delivery_instructions && (
                <p className="text-sm text-muted-foreground mt-2">
                  Instructions: {order.delivery_instructions}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event Details */}
        {order.event_date && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm">
                <span className="text-muted-foreground">Date: </span>
                {new Date(order.event_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {order.event_details && (
                <p className="text-sm mt-1">{order.event_details}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rating Section for Delivered Orders */}
        {order.status === 'delivered' && user && orderItems.length > 0 && (
          <OrderRating
            orderId={order.id}
            customerId={user.id}
            orderItems={orderItems.map(oi => ({
              id: oi.id,
              food_item_id: oi.food_item_id,
              assigned_cook_id: oi.assigned_cook_id,
              food_item: { name: oi.food_item?.name || 'Item' },
            }))}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default OrderDetail;
