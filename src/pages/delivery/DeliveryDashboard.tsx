import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useDeliveryProfile, 
  useDeliveryWallet, 
  useDeliveryOrders, 
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
import { toast } from '@/hooks/use-toast';
import NewOrderAlert from '@/components/delivery/NewOrderAlert';
import OrderTakenToast from '@/components/delivery/OrderTakenToast';
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
  Bell
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
  const { signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useDeliveryProfile();
  const { data: wallet } = useDeliveryWallet();
  const { data: myOrders, isLoading: ordersLoading } = useDeliveryOrders();
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

  const handleStatusUpdate = async (orderId: string, newStatus: DeliveryStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      toast({
        title: "Status Updated",
        description: `Delivery status changed to ${statusConfig[newStatus].label}`,
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
      removeOrder(orderId); // Remove from pending alerts
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
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
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
              <span className="font-semibold">Wallet Balance</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Collected Amount</p>
                <p className="text-xl font-bold">₹{wallet?.collected_amount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Earnings</p>
                <p className="text-xl font-bold text-green-600">₹{wallet?.job_earnings || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{myOrders?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active Deliveries</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{profile.total_deliveries}</p>
            <p className="text-xs text-muted-foreground">Total Deliveries</p>
          </Card>
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="my-orders" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-orders">My Orders</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
          </TabsList>

          <TabsContent value="my-orders" className="space-y-3">
            {ordersLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)
            ) : myOrders && myOrders.length > 0 ? (
              myOrders.map((order) => {
                const status = statusConfig[order.delivery_status as DeliveryStatus] || statusConfig.pending;

                return (
                  <Card key={order.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">#{order.order_number}</CardTitle>
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>
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
                        <span className="font-semibold">₹{order.total_amount}</span>
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
                              onClick={() => handleStatusUpdate(order.id, 'delivered')}
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
        </Tabs>
      </main>
    </div>
  );
};

export default DeliveryDashboard;
