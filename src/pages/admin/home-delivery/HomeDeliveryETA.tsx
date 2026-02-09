import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';

interface HomeDeliveryETAProps {
  onBack: () => void;
}

const HomeDeliveryETA: React.FC<HomeDeliveryETAProps> = ({ onBack }) => {
  const queryClient = useQueryClient();

  // Fetch pending/active orders to manage ETA
  const { data: activeOrders, isLoading } = useQuery({
    queryKey: ['home-delivery-eta-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, estimated_delivery_minutes, delivery_eta, created_at, delivery_address')
        .eq('service_type', 'homemade')
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const updateETAMutation = useMutation({
    mutationFn: async ({ orderId, minutes }: { orderId: string; minutes: number }) => {
      const eta = new Date(Date.now() + minutes * 60000).toISOString();
      const { error } = await supabase
        .from('orders')
        .update({ estimated_delivery_minutes: minutes, delivery_eta: eta })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-delivery-eta-orders'] });
      toast.success('ETA updated successfully');
    },
    onError: () => toast.error('Failed to update ETA'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">ETA Management</h2>
      </div>

      {/* Default ETA Config */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Default ETA Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Default estimated delivery time is <strong>60 minutes</strong> for all new homemade orders. 
            You can override ETA for individual orders below.
          </p>
        </CardContent>
      </Card>

      {/* Active Orders ETA */}
      <h3 className="font-medium text-sm">Active Orders</h3>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-20" />
            </Card>
          ))}
        </div>
      ) : activeOrders?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No active orders to manage ETA
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeOrders?.map((order) => (
            <ETAOrderCard
              key={order.id}
              order={order}
              onUpdateETA={(minutes) => updateETAMutation.mutate({ orderId: order.id, minutes })}
              isUpdating={updateETAMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function ETAOrderCard({
  order,
  onUpdateETA,
  isUpdating,
}: {
  order: { id: string; order_number: string; status: string; estimated_delivery_minutes: number | null; delivery_address: string | null };
  onUpdateETA: (minutes: number) => void;
  isUpdating: boolean;
}) {
  const [minutes, setMinutes] = useState(order.estimated_delivery_minutes?.toString() || '60');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm">#{order.order_number}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {order.delivery_address || 'No address'}
            </p>
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded">
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex items-end gap-2 mt-3">
          <div className="flex-1">
            <Label className="text-xs">ETA (minutes)</Label>
            <Input
              type="number"
              min="5"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            size="sm"
            onClick={() => onUpdateETA(parseInt(minutes) || 60)}
            disabled={isUpdating}
            className="h-9"
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default HomeDeliveryETA;
