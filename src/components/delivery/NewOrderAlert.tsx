import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  MapPin, 
  Phone, 
  Clock, 
  AlertTriangle,
  Bike
} from 'lucide-react';
import type { PendingDeliveryOrder } from '@/hooks/useDeliveryNotifications';

interface NewOrderAlertProps {
  open: boolean;
  orders: PendingDeliveryOrder[];
  onAccept: (orderId: string) => void;
  onDismiss: () => void;
  isAccepting: boolean;
  cutoffSeconds: number;
}

const NewOrderAlert: React.FC<NewOrderAlertProps> = ({
  open,
  orders,
  onAccept,
  onDismiss,
  isAccepting,
  cutoffSeconds,
}) => {
  if (orders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-primary/30">
        <DialogHeader className="bg-gradient-to-r from-primary/10 to-primary/5 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center animate-pulse">
              <Package className="h-4 w-4 text-primary-foreground" />
            </div>
            New Delivery Orders!
            <Badge className="ml-auto bg-primary text-primary-foreground">
              {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {orders.map((order) => {
            const progressPercent = (order.seconds_remaining / cutoffSeconds) * 100;
            const isUrgent = order.seconds_remaining < 30;

            return (
              <Card 
                key={order.id} 
                className={`border-2 transition-colors ${
                  isUrgent ? 'border-destructive bg-destructive/5' : 'border-primary/20'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">#{order.order_number}</span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {order.service_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="font-bold text-lg text-primary">₹{order.total_amount}</span>
                  </div>

                  {/* Customer Info */}
                  {order.customer && (
                    <div className="p-2 rounded-md bg-muted">
                      <p className="font-medium text-sm">{order.customer.name}</p>
                      <a 
                        href={`tel:${order.customer.mobile_number}`} 
                        className="flex items-center gap-1 text-xs text-primary"
                      >
                        <Phone className="h-3 w-3" />
                        {order.customer.mobile_number}
                      </a>
                    </div>
                  )}

                  {/* Address */}
                  {order.delivery_address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span className="line-clamp-2">{order.delivery_address}</span>
                    </div>
                  )}

                  {/* Countdown Timer */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Time to accept
                      </span>
                      <span className={`font-mono font-bold ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
                        {Math.floor(order.seconds_remaining / 60)}:{(order.seconds_remaining % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <Progress 
                      value={progressPercent} 
                      className={`h-2 ${isUrgent ? '[&>div]:bg-destructive' : ''}`}
                    />
                    {isUrgent && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Accept quickly before time runs out!
                      </p>
                    )}
                  </div>

                  {/* Accept Button */}
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => onAccept(order.id)}
                    disabled={isAccepting}
                  >
                    <Bike className="h-4 w-4 mr-2" />
                    Accept Delivery
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewOrderAlert;
