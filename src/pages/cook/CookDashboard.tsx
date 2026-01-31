import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCookProfile, useCookOrders, useUpdateCookStatus, useUpdateCookAvailability } from '@/hooks/useCook';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  ChefHat, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  UtensilsCrossed,
  Phone,
  MapPin,
  Users
} from 'lucide-react';
import type { CookStatus } from '@/types/cook';

const statusConfig: Record<CookStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'New Order', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" /> },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-4 w-4" /> },
  preparing: { label: 'Preparing', color: 'bg-orange-100 text-orange-800', icon: <Flame className="h-4 w-4" /> },
  cooked: { label: 'Cooked', color: 'bg-purple-100 text-purple-800', icon: <UtensilsCrossed className="h-4 w-4" /> },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-4 w-4" /> },
};

const CookDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCookProfile();
  const { data: orders, isLoading: ordersLoading } = useCookOrders();
  const updateStatus = useUpdateCookStatus();
  const updateAvailability = useUpdateCookAvailability();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleStatusUpdate = async (orderId: string, newStatus: CookStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      toast({
        title: "Status Updated",
        description: `Order status changed to ${statusConfig[newStatus].label}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleAvailabilityChange = async (checked: boolean) => {
    try {
      await updateAvailability.mutateAsync(checked);
      toast({
        title: checked ? "You're Online" : "You're Offline",
        description: checked ? "You can now receive orders" : "You won't receive new orders",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  const getNextStatus = (currentStatus: CookStatus): CookStatus | null => {
    const flow: Record<CookStatus, CookStatus | null> = {
      pending: 'accepted',
      accepted: 'preparing',
      preparing: 'cooked',
      cooked: 'ready',
      ready: null,
    };
    return flow[currentStatus];
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
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Not a Cook</h2>
          <p className="text-muted-foreground mb-4">
            You don't have cook privileges. Please contact admin.
          </p>
          <Button onClick={handleLogout}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-semibold">{profile.kitchen_name}</span>
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
                {profile.is_available ? "You're receiving orders" : "You're not receiving orders"}
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{orders?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Active Orders</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{profile.total_orders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </Card>
        </div>

        {/* Orders Section */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Active Orders</h2>

          {ordersLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)
          ) : orders && orders.length > 0 ? (
            orders.map((order) => {
              const status = statusConfig[order.cook_status as CookStatus] || statusConfig.pending;
              const nextStatus = getNextStatus(order.cook_status as CookStatus);

              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">#{order.order_number}</CardTitle>
                      <Badge className={status.color}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Order Info */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <UtensilsCrossed className="h-3 w-3" />
                        <span className="capitalize">{order.service_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                      </div>
                      {order.guest_count && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{order.guest_count} guests</span>
                        </div>
                      )}
                    </div>

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

                    {/* Delivery Address */}
                    {order.delivery_address && (
                      <div className="flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{order.delivery_address}</span>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold">₹{order.total_amount}</span>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {order.cook_status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusUpdate(order.id, 'ready')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(order.id, 'accepted')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          </>
                        )}
                        {nextStatus && order.cook_status !== 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(order.id, nextStatus)}
                          >
                            Mark as {statusConfig[nextStatus].label}
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
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No active orders</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CookDashboard;
