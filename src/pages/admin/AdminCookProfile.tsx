import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  ChefHat, 
  Phone, 
  MapPin, 
  Wallet,
  IndianRupee,
  TrendingUp,
  Calendar,
  Users,
  UtensilsCrossed,
  Clock,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import type { Cook } from '@/types/cook';

interface OrderAssignment {
  id: string;
  order_id: string;
  cook_status: string;
  assigned_at: string;
  responded_at: string | null;
  order: {
    order_number: string;
    status: string;
    total_amount: number;
    guest_count: number | null;
    event_date: string | null;
    service_type: string;
    created_at: string;
    customer_id: string;
  };
  customer?: {
    name: string;
    mobile_number: string;
  };
}

interface OrderItem {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  food_item: {
    id: string;
    name: string;
  };
}

interface Settlement {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  order_id: string | null;
}

const AdminCookProfile: React.FC = () => {
  const { cookId } = useParams<{ cookId: string }>();
  const navigate = useNavigate();

  // Fetch cook profile
  const { data: cook, isLoading: cookLoading } = useQuery({
    queryKey: ['admin-cook-profile', cookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cooks')
        .select(`
          *,
          panchayat:panchayats(id, name)
        `)
        .eq('id', cookId)
        .single();
      if (error) throw error;
      return data as Cook;
    },
    enabled: !!cookId,
  });

  // Fetch order history (all assignments)
  const { data: orderHistory, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-cook-orders', cookId],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('order_assigned_cooks')
        .select(`
          id, order_id, cook_status, assigned_at, responded_at,
          order:orders(order_number, status, total_amount, guest_count, event_date, service_type, created_at, customer_id)
        `)
        .eq('cook_id', cookId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch customer profiles
      const customerIds = [...new Set(assignments?.map((a: any) => a.order?.customer_id).filter(Boolean) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, mobile_number')
        .in('user_id', customerIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      return assignments?.map((a: any) => ({
        ...a,
        customer: a.order?.customer_id ? profileMap.get(a.order.customer_id) : null,
      })) as OrderAssignment[];
    },
    enabled: !!cookId,
  });

  // Fetch dishes assigned to this cook
  const { data: assignedDishes, isLoading: dishesLoading } = useQuery({
    queryKey: ['admin-cook-dishes', cookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          quantity,
          unit_price,
          total_price,
          food_item:food_items(id, name)
        `)
        .eq('assigned_cook_id', cookId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!cookId,
  });

  // Fetch wallet / settlements
  const { data: settlements, isLoading: walletLoading } = useQuery({
    queryKey: ['admin-cook-wallet', cook?.user_id],
    queryFn: async () => {
      if (!cook?.user_id) return [];
      const { data, error } = await supabase
        .from('settlements')
        .select('id, amount, status, created_at, approved_at, order_id')
        .eq('user_id', cook.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Settlement[];
    },
    enabled: !!cook?.user_id,
  });

  // Calculate earnings summary
  const earningsSummary = React.useMemo(() => {
    if (!settlements) return { total: 0, pending: 0, paid: 0 };
    return {
      total: settlements.reduce((sum, s) => sum + Number(s.amount), 0),
      pending: settlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + Number(s.amount), 0),
      paid: settlements.filter(s => s.status === 'approved' || s.status === 'paid').reduce((sum, s) => sum + Number(s.amount), 0),
    };
  }, [settlements]);

  // Group dishes by food item for summary
  const dishSummary = React.useMemo(() => {
    if (!assignedDishes) return [];
    const map = new Map<string, { name: string; totalQty: number; totalAmount: number }>();
    assignedDishes.forEach(item => {
      const name = item.food_item?.name || 'Unknown';
      const existing = map.get(name);
      if (existing) {
        existing.totalQty += item.quantity;
        existing.totalAmount += item.total_price;
      } else {
        map.set(name, { name, totalQty: item.quantity, totalAmount: item.total_price });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalQty - a.totalQty);
  }, [assignedDishes]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      preparing: 'bg-orange-100 text-orange-800',
      cooked: 'bg-purple-100 text-purple-800',
      ready: 'bg-green-100 text-green-800',
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
  };

  if (cookLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-40 mb-4" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!cook) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Cook Not Found</h2>
          <Button onClick={() => navigate('/admin/cooks')}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background pb-6">
      {/* Header */}
      <div className="border-b bg-card px-4 py-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/cooks')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ChefHat className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">{cook.kitchen_name}</h1>
        </div>
      </div>

      <main className="container px-4 py-4 space-y-4">
        {/* Cook Profile Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <ChefHat className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{cook.kitchen_name}</h2>
                <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {cook.mobile_number}
                  </span>
                  {cook.panchayat && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {cook.panchayat.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {cook.allowed_order_types.map(type => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <Badge variant={cook.is_active ? 'default' : 'secondary'}>
                  {cook.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  ⭐ {cook.rating?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{cook.total_orders || 0}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{orderHistory?.filter(o => o.cook_status === 'ready').length || 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{orderHistory?.filter(o => !['ready'].includes(o.cook_status)).length || 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Summary */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {walletLoading ? (
              <Skeleton className="h-16" />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-primary">
                    <IndianRupee className="h-4 w-4" />
                    {earningsSummary.total.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-orange-600">
                    <IndianRupee className="h-4 w-4" />
                    {earningsSummary.pending.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-background/50">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    {earningsSummary.paid.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="orders" className="gap-1">
              <History className="h-4 w-4" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="dishes" className="gap-1">
              <UtensilsCrossed className="h-4 w-4" />
              Dishes
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-1">
              <Wallet className="h-4 w-4" />
              Wallet
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-3 mt-4">
            {ordersLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : orderHistory && orderHistory.length > 0 ? (
              orderHistory.map(assignment => (
                <Card key={assignment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{assignment.order?.order_number}</span>
                          {getStatusBadge(assignment.cook_status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Customer: {assignment.customer?.name || 'Unknown'}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          {assignment.order?.event_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(assignment.order.event_date), 'dd MMM yyyy')}
                            </span>
                          )}
                          {assignment.order?.guest_count && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {assignment.order.guest_count} guests
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(assignment.assigned_at), 'dd MMM, HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₹{assignment.order?.total_amount?.toLocaleString() || 0}</p>
                        <p className="text-xs text-muted-foreground capitalize">{assignment.order?.service_type?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center">
                <History className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No order history</p>
              </Card>
            )}
          </TabsContent>

          {/* Dishes Tab */}
          <TabsContent value="dishes" className="mt-4">
            {dishesLoading ? (
              <Skeleton className="h-48" />
            ) : dishSummary.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Dish Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dish Name</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dishSummary.map((dish, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{dish.name}</TableCell>
                          <TableCell className="text-right">{dish.totalQty}</TableCell>
                          <TableCell className="text-right">₹{dish.totalAmount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <UtensilsCrossed className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No dishes assigned yet</p>
              </Card>
            )}
          </TabsContent>

          {/* Wallet Tab */}
          <TabsContent value="wallet" className="mt-4">
            {walletLoading ? (
              <Skeleton className="h-48" />
            ) : settlements && settlements.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Settlement History</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map(settlement => (
                        <TableRow key={settlement.id}>
                          <TableCell>{format(new Date(settlement.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-medium">₹{Number(settlement.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={settlement.status === 'approved' || settlement.status === 'paid' ? 'default' : 'secondary'}>
                              {settlement.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="p-6 text-center">
                <Wallet className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No settlements yet</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminCookProfile;
