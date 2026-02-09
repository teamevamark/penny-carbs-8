import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Home,
  ShoppingBag,
  ChefHat,
  Truck,
  Wallet,
  Clock,
  BarChart3,
  Settings,
  UtensilsCrossed,
} from 'lucide-react';
import HomeDeliveryItems from './HomeDeliveryItems';
import HomeDeliveryDelivery from './HomeDeliveryDelivery';
import HomeDeliveryOrders from './HomeDeliveryOrders';
import HomeDeliveryETA from './HomeDeliveryETA';
import HomeDeliverySettlements from './HomeDeliverySettlements';

type SubPage = 'dashboard' | 'items' | 'delivery' | 'orders' | 'eta' | 'settlements';

const HomeDeliveryModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = useAuth();

  // Derive sub-page from URL path
  const getSubPageFromPath = (): SubPage => {
    const path = location.pathname;
    if (path.includes('/orders')) return 'orders';
    if (path.includes('/eta')) return 'eta';
    if (path.includes('/settlements')) return 'settlements';
    return 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState<SubPage>(getSubPageFromPath());

  useEffect(() => {
    setCurrentPage(getSubPageFromPath());
  }, [location.pathname]);

  const isAdmin = role === 'super_admin' || role === 'admin';

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['home-delivery-stats'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, cook_status, delivery_status, total_amount, delivery_amount, created_at')
        .eq('service_type', 'homemade');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders?.filter(o => o.created_at.startsWith(today)) || [];

      const newOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const outForDelivery = orders?.filter(o => o.status === 'out_for_delivery').length || 0;
      const todayDelivered = todayOrders.filter(o => o.status === 'delivered').length;
      const todayRevenue = todayOrders.filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const pendingCollection = orders?.filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.delivery_amount || 0), 0) || 0;

      return { newOrders, outForDelivery, todayDelivered, todayRevenue, pendingCollection };
    },
    enabled: isAdmin
  });

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Settings className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <Button className="mt-6" onClick={() => navigate('/admin')}>
          Go Back
        </Button>
      </div>
    );
  }

  const goToDashboard = () => navigate('/admin/home-delivery');

  // Sub-page rendering
  const subPageContent: Record<string, React.ReactNode> = {
    items: <HomeDeliveryItems onBack={goToDashboard} />,
    delivery: <HomeDeliveryDelivery onBack={goToDashboard} />,
    orders: <HomeDeliveryOrders onBack={goToDashboard} />,
    eta: <HomeDeliveryETA onBack={goToDashboard} />,
    settlements: <HomeDeliverySettlements onBack={goToDashboard} />,
  };

  if (currentPage !== 'dashboard' && subPageContent[currentPage]) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-homemade text-white">
          <div className="flex h-14 items-center px-4">
            <Home className="h-6 w-6 mr-2" />
            <h1 className="font-display text-lg font-semibold">Home Food Delivery</h1>
          </div>
        </header>
        <main className="p-4 pb-20">
          {subPageContent[currentPage]}
        </main>
      </div>
    );
  }

  const menuItems = [
    {
      icon: UtensilsCrossed,
      label: 'Manage Items',
      action: () => setCurrentPage('items'),
      description: 'View & toggle homemade food items',
    },
    { 
      icon: ShoppingBag, 
      label: 'Live Orders', 
      action: () => navigate('/admin/home-delivery/orders'),
      description: 'Instant orders & ETA tracking',
      badge: stats?.newOrders,
      badgeVariant: 'destructive' as const
    },
    { 
      icon: ChefHat, 
      label: 'Cook Assignment', 
      action: () => navigate('/admin/home-delivery/cooks'),
      description: 'Assign cooks to orders'
    },
    { 
      icon: Truck, 
      label: 'Delivery Staff', 
      action: () => setCurrentPage('delivery'),
      description: 'View delivery staff & status',
      badge: stats?.outForDelivery
    },
    { 
      icon: Clock, 
      label: 'ETA Management', 
      action: () => navigate('/admin/home-delivery/eta'),
      description: 'Auto ETA configuration'
    },
    { 
      icon: Wallet, 
      label: 'Cash Settlement', 
      action: () => navigate('/admin/home-delivery/settlements'),
      description: 'Collection & settlement approval'
    },
    { 
      icon: BarChart3, 
      label: 'Delivery Reports', 
      action: () => navigate('/admin/home-delivery/reports'),
      description: 'Ward-wise performance reports'
    },
  ];

  const statusFlow = [
    { label: 'New', color: 'bg-yellow-500' },
    { label: 'Accepted', color: 'bg-blue-500' },
    { label: 'Cooking', color: 'bg-orange-500' },
    { label: 'Out for Delivery', color: 'bg-indigo-500' },
    { label: 'Delivered', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-homemade text-white">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Home className="h-6 w-6" />
            <h1 className="font-display text-lg font-semibold">Home Food Delivery</h1>
          </div>
        </div>
      </header>

      <main className="p-4 pb-20">
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats?.newOrders || 0}</p>
              <p className="text-xs text-muted-foreground">New Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{stats?.outForDelivery || 0}</p>
              <p className="text-xs text-muted-foreground">Out for Delivery</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats?.todayDelivered || 0}</p>
              <p className="text-xs text-muted-foreground">Today Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">₹{stats?.todayRevenue?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Today's Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Collection Alert */}
        {stats?.pendingCollection && stats.pendingCollection > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-4 p-4">
              <Wallet className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Pending Cash Collection
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  ₹{stats.pendingCollection.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Status Flow */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Order Status Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {statusFlow.map((status, index) => (
                <div key={status.label} className="flex items-center gap-1">
                  <span className={`h-3 w-3 rounded-full ${status.color}`} />
                  <span className="text-xs">{status.label}</span>
                  {index < statusFlow.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Menu Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item, idx) => (
            <Card 
              key={idx}
              className="cursor-pointer transition-all hover:shadow-md hover:border-homemade/50"
              onClick={item.action}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-xl bg-homemade/10 p-3 text-homemade">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.label}</h4>
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge variant={item.badgeVariant || 'secondary'} className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instant Order Note */}
        <Card className="mt-6 border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>✓ Instant Orders:</strong> Home delivery supports real-time ordering with automatic ETA calculation. 
              Orders are executed immediately upon placement.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default HomeDeliveryModule;
