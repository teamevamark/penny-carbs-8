import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { X, UserCheck } from 'lucide-react';
import type { OrderTakenInfo } from '@/hooks/useDeliveryNotifications';

interface OrderTakenToastProps {
  ordersTaken: OrderTakenInfo[];
  onDismiss: (orderId: string) => void;
}

const OrderTakenToast: React.FC<OrderTakenToastProps> = ({ ordersTaken, onDismiss }) => {
  if (ordersTaken.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 space-y-2 max-w-xs">
      {ordersTaken.map((info) => (
        <Card 
          key={info.orderId} 
          className="bg-amber-50 border-amber-200 shadow-lg animate-in slide-in-from-right duration-300"
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-900">Order Taken</p>
              <p className="text-xs text-amber-700 truncate">
                #{info.orderNumber} accepted by {info.takenBy}
              </p>
            </div>
            <button
              onClick={() => onDismiss(info.orderId)}
              className="p-1 hover:bg-amber-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-amber-600" />
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default OrderTakenToast;
