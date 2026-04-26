import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bike, Phone, Star, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import { useAvailableDeliveryStaff, useAssignDeliveryStaff } from '@/hooks/useCook';
import { toast } from '@/hooks/use-toast';
import type { CookOrder } from '@/types/cook';

interface AllocateDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CookOrder | null;
}

const AllocateDeliveryDialog: React.FC<AllocateDeliveryDialogProps> = ({ open, onOpenChange, order }) => {
  const { data: staff, isLoading } = useAvailableDeliveryStaff(order?.panchayat_id, order?.ward_number);
  const assignMutation = useAssignDeliveryStaff();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleAssign = async (deliveryUserId: string, staffId: string) => {
    if (!order) return;
    setSelectedId(staffId);
    try {
      await assignMutation.mutateAsync({ orderId: order.id, deliveryUserId });
      toast({
        title: 'Delivery Allocated',
        description: 'Delivery staff has been assigned to this order',
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Allocation Failed',
        description: e?.message || 'Could not assign delivery staff',
        variant: 'destructive',
      });
    } finally {
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bike className="h-5 w-5 text-primary" />
            Allocate Delivery Staff
          </DialogTitle>
          <DialogDescription>
            {order?.panchayat?.name ? (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {order.panchayat.name}
                {order.ward_number ? ` • Ward ${order.ward_number}` : ''}
              </span>
            ) : (
              'Select an available delivery partner for this order'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : !staff || staff.length === 0 ? (
            <Card className="p-6 text-center">
              <Truck className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">No delivery staff available</p>
              <p className="text-xs text-muted-foreground mt-1">
                No approved delivery partners found for this panchayat{order?.ward_number ? ' / ward' : ''}.
              </p>
            </Card>
          ) : (
            staff.map((s) => {
              const isAssigning = assignMutation.isPending && selectedId === s.id;
              const canAssign = !!s.user_id;
              return (
                <Card key={s.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{s.name}</p>
                        <Badge variant={s.is_available ? 'default' : 'secondary'} className="text-[10px]">
                          {s.is_available ? 'Online' : 'Offline'}
                        </Badge>
                        {s.staff_type === 'registered_partner' && (
                          <Badge variant="outline" className="text-[10px]">Partner</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {s.mobile_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {s.vehicle_type}
                          {s.vehicle_number ? ` • ${s.vehicle_number}` : ''}
                        </span>
                        {!!s.rating && s.rating > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {Number(s.rating).toFixed(1)}
                          </span>
                        )}
                        <span>Trips: {s.total_deliveries || 0}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!canAssign || isAssigning || assignMutation.isPending}
                      onClick={() => canAssign && handleAssign(s.user_id!, s.id)}
                    >
                      {isAssigning ? (
                        'Assigning...'
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Assign
                        </>
                      )}
                    </Button>
                  </div>
                  {!canAssign && (
                    <p className="text-[10px] text-destructive mt-1">Staff has no linked user account</p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AllocateDeliveryDialog;
