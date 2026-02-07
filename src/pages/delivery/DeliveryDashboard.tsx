import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useDeliveryProfile, 
  useDeliveryWallet, 
  useDeliveryOrders, 
  useDeliveryOrderHistory,
  useAvailableDeliveryOrders,
  useUpdateDeliveryStatus,
  useAcceptDelivery,
  useUpdateDeliveryAvailability
} from '@/hooks/useDeliveryStaff';
import { useDeliveryNotifications } from '@/hooks/useDeliveryNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import NewOrderAlert from '@/components/delivery/NewOrderAlert';
import OrderTakenToast from '@/components/delivery/OrderTakenToast';
import { format } from 'date-fns';
import { 
  Truck, 
  LogOut, 
  Wallet, 
  Package,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  Bell,
  RefreshCw,
  CalendarIcon,
  History
} from 'lucide-react';
import type { DeliveryStatus } from '@/types/delivery';

const statusConfig: Record<DeliveryStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
  picked_up: { label: 'Picked Up', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
};

const DeliveryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  const { data: profile, isLoading: profileLoading } = useDeliveryProfile();
  const { data: wallet } = useDeliveryWallet();
  const { data: myOrders, isLoading: ordersLoading } = useDeliveryOrders();
  const { data: orderHistory, isLoading: historyLoading } = useDeliveryOrderHistory(dateRange.from, dateRange.to);
  const { data: availableOrders } = useAvailableDeliveryOrders();
  const updateStatus = useUpdateDeliveryStatus();
  const acceptDelivery = useAcceptDelivery();
  const updateAvailability = useUpdateDeliveryAvailability();
  
  // Real-time notifications
  const { 
    pendingOrders, 
    showAlert, 
    dismissAlert, 
    removeOrder,
    ordersTaken,
    clearOrderTaken,
    ORDER_ACCEPT_CUTOFF_SECONDS 
  } = useDeliveryNotifications();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleStatusUpdate = async (orderId: string, newStatus: DeliveryStatus, orderAmount?: number, deliveryCharge?: number) => {
    try {
      await updateStatus.mutateAsync({ 
        orderId, 
        status: newStatus,
        orderAmount,
        deliveryCharge 
      });
      toast({
        title: "Status Updated",
        description: newStatus === 'delivered' 
          ? `Delivery completed! ₹${orderAmount || 0} added to Wallet, ₹${deliveryCharge || 0} to Earnings`
          : `Delivery status changed to ${statusConfig[newStatus].label}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await acceptDelivery.mutateAsync(orderId);
      removeOrder(orderId);
      toast({
        title: "Order Accepted",
        description: "You've been assigned to this delivery",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept order. It may have been taken by another driver.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['available-delivery-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['delivery-profile'] }),
      queryClient.invalidateQueries({ queryKey: ['delivery-wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['delivery-order-history'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleAvailabilityChange = async (checked: boolean) => {
    try {
      await updateAvailability.mutateAsync(checked);
      toast({
        title: checked ? "You're Online" : "You're Offline",
        description: checked ? "You can now accept deliveries" : "You won't receive new orders",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  // Get active orders (assigned + picked_up) and delivered from history
  const activeOrders = myOrders || [];
  const deliveredOrders = (orderHistory || []).filter(o => o.delivery_status === 'delivered');
  const pickedUpOrders = (orderHistory || []).filter(o => o.delivery_status === 'picked_up');

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-32 mb-4" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6">
          <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Not Registered</h2>
          <p className="text-muted-foreground mb-4">
            You're not registered as a delivery partner.
          </p>
          <Button onClick={() => navigate('/delivery/apply')}>Apply Now</Button>
        </Card>
      </div>
    );
  }

  if (!profile.is_approved) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-6">
          <Clock className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <h2 className="text-lg font-semibold mb-2">Pending Approval</h2>
          <p className="text-muted-foreground mb-4">
            Your application is under review. We'll notify you once approved.
          </p>
          <Button variant="outline" onClick={handleLogout}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* New Order Alert Dialog */}
      <NewOrderAlert
        open={showAlert}
        orders={pendingOrders}
        onAccept={handleAcceptOrder}
        onDismiss={dismissAlert}
        isAccepting={acceptDelivery.isPending}
        cutoffSeconds={ORDER_ACCEPT_CUTOFF_SECONDS}
      />

      {/* Order Taken Toast Notifications */}
      <OrderTakenToast
        ordersTaken={ordersTaken}
        onDismiss={clearOrderTaken}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <span className="font-semibold">{profile.name}</span>
            {pendingOrders.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                <Bell className="h-3 w-3 mr-1" />
                {pendingOrders.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-4">
        {/* Availability Toggle */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">Availability Status</p>
              <p className="text-sm text-muted-foreground">
                {profile.is_available ? "You're accepting deliveries" : "You're not accepting deliveries"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={profile.is_available ? "default" : "secondary"}>
                {profile.is_available ? "Online" : "Offline"}
              </Badge>
              <Switch
                checked={profile.is_available}
                onCheckedChange={handleAvailabilityChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Wallet Summary */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold">Wallet Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Wallet Balance</p>
                <p className="text-xl font-bold text-blue-600">₹{wallet?.collected_amount || 0}</p>
                <p className="text-[10px] text-muted-foreground">Collected from orders</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Earnings</p>
                <p className="text-xl font-bold text-green-600">₹{wallet?.job_earnings || 0}</p>
                <p className="text-[10px] text-muted-foreground">Delivery charges</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Settled</p>
                <p className="text-xl font-bold text-gray-600">₹{wallet?.total_settled || 0}</p>
                <p className="text-[10px] text-muted-foreground">Cleared amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{activeOrders.length}</p>
            <p className="text-xs text-muted-foreground">Active Deliveries</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{profile.total_deliveries}</p>
            <p className="text-xs text-muted-foreground">Total Deliveries</p>
          </Card>
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="my-orders" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="my-orders">My Orders</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-orders" className="space-y-3">
            {ordersLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)
            ) : activeOrders.length > 0 ? (
              activeOrders.map((order) => {
                const status = statusConfig[order.delivery_status as DeliveryStatus] || statusConfig.pending;

                return (
                  <Card key={order.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">#{order.order_number}</CardTitle>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Customer Info */}
                      {order.customer && (
                        <div className="p-2 rounded bg-muted text-sm">
                          <p className="font-medium">{order.customer.name}</p>
                          <a href={`tel:${order.customer.mobile_number}`} className="flex items-center gap-1 text-primary">
                            <Phone className="h-3 w-3" />
                            {order.customer.mobile_number}
                          </a>
                        </div>
                      )}

                      {/* Address */}
                      {order.delivery_address && (
                        <div className="flex items-start gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{order.delivery_address}</span>
                        </div>
                      )}

                      {/* Amount & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <span className="font-semibold">₹{order.total_amount}</span>
                          {order.delivery_amount && order.delivery_amount > 0 && (
                            <span className="text-xs text-green-600 ml-2">(+₹{order.delivery_amount} delivery)</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {order.delivery_status === 'assigned' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(order.id, 'picked_up')}
                            >
                              <Navigation className="h-4 w-4 mr-1" />
                              Picked Up
                            </Button>
                          )}
                          {order.delivery_status === 'picked_up' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(
                                order.id, 
                                'delivered',
                                order.total_amount,
                                order.delivery_amount || 0
                              )}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Delivered
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="p-6 text-center">
                <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No active deliveries</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-3">
            {profile.staff_type === 'fixed_salary' ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  Fixed salary staff receive orders automatically
                </p>
              </Card>
            ) : availableOrders && availableOrders.length > 0 ? (
              availableOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">#{order.order_number}</span>
                      <Badge variant="secondary" className="capitalize">
                        {order.service_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    {order.delivery_address && (
                      <div className="flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{order.delivery_address}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="font-semibold">₹{order.total_amount}</p>
                        <p className="text-xs text-muted-foreground">Ward {order.ward_number}</p>
                        {order.delivery_amount && order.delivery_amount > 0 && (
                          <p className="text-xs text-green-600">Delivery: ₹{order.delivery_amount}</p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => handleAcceptOrder(order.id)}>
                        Accept Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center">
                <Package className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No orders available in your area</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {/* Date Filter */}
            <Card>
              <CardContent className="p-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {dateRange.from ? format(dateRange.from, 'dd MMM') : 'From'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        <CalendarIcon className="h-3 w-3 mr-1" />
                        {dateRange.to ? format(dateRange.to, 'dd MMM') : 'To'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {(dateRange.from || dateRange.to) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDateRange({})}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {historyLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : orderHistory && orderHistory.length > 0 ? (
              orderHistory.map((order) => {
                const status = statusConfig[order.delivery_status as DeliveryStatus] || statusConfig.pending;

                return (
                  <Card key={order.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">#{order.order_number}</span>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <p>Ordered: {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                        {order.delivered_at && (
                          <p>Delivered: {format(new Date(order.delivered_at), 'dd MMM yyyy, hh:mm a')}</p>
                        )}
                      </div>

                      {order.delivery_address && (
                        <div className="flex items-start gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{order.delivery_address}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Order</p>
                            <p className="font-semibold">₹{order.total_amount}</p>
                          </div>
                          {order.delivery_amount && order.delivery_amount > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground">Delivery</p>
                              <p className="font-semibold text-green-600">₹{order.delivery_amount}</p>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {order.service_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="p-6 text-center">
                <History className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No order history found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting the date filter</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DeliveryDashboard;
