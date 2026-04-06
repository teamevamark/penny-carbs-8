import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceModules, useToggleServiceModule } from '@/hooks/useServiceModules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ShoppingBag,
  Users,
  ChefHat,
  Truck,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  CalendarHeart,
  Home,
  Package,
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

function useAdminStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const last7Days = subDays(new Date(), 7).toISOString();

      const [
        ordersToday,
        ordersPending,
        ordersDelivered,
        totalOrders,
        totalCooks,
        totalDelivery,
        totalCustomers,
        revenueToday,
        revenueLast7,
        unassignedOrders,
      ] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'delivered'),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('cooks').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('delivery_staff').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total_amount').gte('created_at', today).eq('status', 'delivered'),
        supabase.from('orders').select('total_amount').gte('created_at', last7Days).eq('status', 'delivered'),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .is('assigned_cook_id', null)
          .in('service_type', ['cloud_kitchen', 'homemade']),
      ]);

      const todayRevenue = (revenueToday.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const weekRevenue = (revenueLast7.data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        ordersToday: ordersToday.count || 0,
        ordersPending: ordersPending.count || 0,
        ordersDelivered: ordersDelivered.count || 0,
        totalOrders: totalOrders.count || 0,
        totalCooks: totalCooks.count || 0,
        totalDelivery: totalDelivery.count || 0,
        totalCustomers: totalCustomers.count || 0,
        todayRevenue,
        weekRevenue,
        unassignedOrders: unassignedOrders.count || 0,
      };
    },
    refetchInterval: 60000,
  });
}

function useRecentOrders() {
  return useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, service_type, total_amount, status, delivery_status, cook_status, created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const serviceIcons: Record<string, React.ElementType> = {
  indoor_events: CalendarHeart,
  cloud_kitchen: ChefHat,
  homemade: Home,
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: recentOrders } = useRecentOrders();
  const { data: serviceModules } = useServiceModules();
  const toggleModule = useToggleServiceModule();

  const kpiCards = [
    { label: 'Orders Today', value: stats?.ordersToday ?? '-', icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pending Orders', value: stats?.ordersPending ?? '-', icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: "Today's Revenue", value: `₹${stats?.todayRevenue?.toLocaleString() ?? '0'}`, icon: IndianRupee, color: 'text-green-600 bg-green-50' },
    { label: 'Week Revenue', value: `₹${stats?.weekRevenue?.toLocaleString() ?? '0'}`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Delivered', value: stats?.ordersDelivered ?? '-', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { label: 'Unassigned', value: stats?.unassignedOrders ?? '-', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
    { label: 'Active Cooks', value: stats?.totalCooks ?? '-', icon: ChefHat, color: 'text-orange-600 bg-orange-50' },
    { label: 'Delivery Staff', value: stats?.totalDelivery ?? '-', icon: Truck, color: 'text-purple-600 bg-purple-50' },
  ];

  const modules = [
    { id: 'indoor-events', svc: 'indoor_events', title: 'Indoor Events', icon: CalendarHeart, path: '/admin/indoor-events', gradient: 'from-indoor-events to-indoor-events/70' },
    { id: 'cloud-kitchen', svc: 'cloud_kitchen', title: 'Cloud Kitchen', icon: ChefHat, path: '/admin/cloud-kitchen', gradient: 'from-cloud-kitchen to-cloud-kitchen/70' },
    { id: 'home-delivery', svc: 'homemade', title: 'Home Delivery', icon: Home, path: '/admin/home-delivery', gradient: 'from-homemade to-homemade/70' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your Penny Carbs operations</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-xl font-bold">{statsLoading ? '...' : kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operational Modules */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Operational Modules</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {modules.map((mod) => {
            const svcModule = serviceModules?.find((m) => m.service_type === mod.svc);
            const isActive = svcModule?.is_active ?? true;

            return (
              <Card
                key={mod.id}
                className={`transition-all hover:shadow-md cursor-pointer ${!isActive ? 'opacity-60' : ''}`}
                onClick={() => navigate(mod.path)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`rounded-xl bg-gradient-to-br ${mod.gradient} p-3 text-white`}>
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{mod.title}</h4>
                    <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs mt-1">
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {role === 'super_admin' && svcModule && (
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => {
                        toggleModule.mutate({ id: svcModule.id, is_active: checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(recentOrders || []).map((order) => {
                const SvcIcon = serviceIcons[order.service_type] || ShoppingBag;
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/order/${order.id}`)}
                  >
                    <SvcIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                      </p>
                    </div>
                    <span className="text-sm font-medium">₹{order.total_amount}</span>
                    <Badge className={`text-xs ${statusColors[order.status] || ''}`}>
                      {order.status}
                    </Badge>
                  </div>
                );
              })}
              {(!recentOrders || recentOrders.length === 0) && (
                <p className="p-4 text-center text-sm text-muted-foreground">No recent orders</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Orders (All Time)</span>
              <span className="font-semibold">{stats?.totalOrders ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Customers</span>
              <span className="font-semibold">{stats?.totalCustomers ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Cooks</span>
              <span className="font-semibold">{stats?.totalCooks ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Delivery Staff</span>
              <span className="font-semibold">{stats?.totalDelivery ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delivered Orders</span>
              <span className="font-semibold text-green-600">{stats?.ordersDelivered ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Orders</span>
              <span className="font-semibold text-yellow-600">{stats?.ordersPending ?? '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
