import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ChefHat,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import type { PendingCookOrder } from '@/hooks/useCookNotifications';

interface NewCookOrderAlertProps {
  open: boolean;
  orders: PendingCookOrder[];
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onDismiss: () => void;
  isUpdating: boolean;
  cutoffSeconds: number;
}

const NewCookOrderAlert: React.FC<NewCookOrderAlertProps> = ({
  open,
  orders,
  onAccept,
  onReject,
  onDismiss,
  isUpdating,
  cutoffSeconds,
}) => {
  if (orders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-primary/30">
        <DialogHeader className="bg-gradient-to-r from-primary/10 to-primary/5 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center animate-pulse">
              <ChefHat className="h-4 w-4 text-primary-foreground" />
            </div>
            New Order Assignment!
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base">#{order.order_number}</span>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {order.service_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="font-bold text-lg text-primary">₹{order.total_amount}</span>
                  </div>

                  {order.guest_count && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{order.guest_count} guests</span>
                    </div>
                  )}

                  {/* Order Items */}
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <UtensilsCrossed className="h-3 w-3" />
                        Dishes to Prepare
                      </p>
                      <div className="space-y-1">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.food_item?.name || 'Unknown'}</span>
                            <span className="text-muted-foreground">Qty: {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Countdown */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Time to respond
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
                        Respond quickly before time runs out!
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => onReject(order.id)}
                      disabled={isUpdating}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => onAccept(order.id)}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewCookOrderAlert;
