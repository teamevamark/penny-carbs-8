import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Phone, MapPin, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HomeDeliveryOrdersProps {
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  ready: 'bg-purple-100 text-purple-800 border-purple-200',
  out_for_delivery: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const HomeDeliveryOrders: React.FC<HomeDeliveryOrdersProps> = ({ onBack }) => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['home-delivery-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, cook_status, delivery_status, 
          total_amount, delivery_amount, delivery_address, delivery_instructions,
          estimated_delivery_minutes, delivery_eta, created_at, delivered_at,
          customer_id, panchayat_id, ward_number
        `)
        .eq('service_type', 'homemade')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: status as any })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-delivery-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const getNextStatus = (current: string) => {
    const flow: Record<string, string> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered',
    };
    return flow[current];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">Live Orders</h2>
        <Badge variant="secondary">{orders?.length || 0}</Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : orders?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No home delivery orders yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders?.map((order) => {
            const nextStatus = getNextStatus(order.status);
            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                    <Badge className={statusColors[order.status] || ''} variant="outline">
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{order.delivery_address || 'No address'}</span>
                    </div>
                    {order.estimated_delivery_minutes && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>ETA: {order.estimated_delivery_minutes} mins</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-bold text-primary">₹{order.total_amount?.toLocaleString()}</p>
                    {nextStatus && order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: nextStatus })}
                        disabled={updateStatusMutation.isPending}
                      >
                        Mark {nextStatus.replace(/_/g, ' ')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomeDeliveryOrders;
