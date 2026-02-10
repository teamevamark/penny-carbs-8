import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Zap, CheckCircle } from 'lucide-react';
import { useIndoorEventItems } from '@/hooks/useIndoorEventItems';
import QuickBookingFormDialog from '@/components/indoor-events/QuickBookingFormDialog';
import BottomNav from '@/components/customer/BottomNav';
import type { FoodItem } from '@/hooks/useIndoorEventItems';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import type { EventType } from '@/types/events';

interface SelectedItem {
  item: FoodItem;
  quantity: number;
}

const getCustomerPrice = (item: FoodItem): number => {
  const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = item.platform_margin_value || 0;
  const margin = calculatePlatformMargin(item.price, marginType, marginValue);
  return item.price + margin;
};

const IndoorEventsQuickBooking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: items } = useIndoorEventItems();

  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [guestCount, setGuestCount] = useState<number>(50);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load pre-selected data from sessionStorage (set by IndoorEvents page)
  useEffect(() => {
    // Load guest count
    const storedGuestCount = sessionStorage.getItem('indoor_event_guest_count');
    if (storedGuestCount) {
      setGuestCount(parseInt(storedGuestCount) || 50);
    }

    // Load event type
    const storedEventType = sessionStorage.getItem('indoor_event_type');
    if (storedEventType) {
      try {
        setSelectedEventType(JSON.parse(storedEventType));
      } catch (e) {
        console.error('Failed to parse event type:', e);
      }
    }

    setDataLoaded(true);
  }, []);

  // Load pre-selected food items once items data is available
  useEffect(() => {
    if (!items || !dataLoaded) return;

    const storedItems = sessionStorage.getItem('indoor_event_items');
    if (storedItems) {
      try {
        const parsedItems: { id: string; name: string; price: number; quantity: number }[] = JSON.parse(storedItems);
        const newMap = new Map<string, SelectedItem>();
        parsedItems.forEach((stored) => {
          const fullItem = items.find((i) => i.id === stored.id);
          if (fullItem) {
            newMap.set(stored.id, { item: fullItem, quantity: stored.quantity });
          }
        });
        if (newMap.size > 0) {
          setSelectedItems(newMap);
        }
      } catch (e) {
        console.error('Failed to parse stored items:', e);
      }
    }
  }, [items, dataLoaded]);

  // Auto-open booking dialog once data is loaded
  useEffect(() => {
    if (dataLoaded && !isSubmitted) {
      setShowBookingDialog(true);
    }
  }, [dataLoaded, isSubmitted]);

  const totalItemsCount = Array.from(selectedItems.values()).reduce((sum, { quantity }) => sum + quantity, 0);
  const estimatedTotal = Array.from(selectedItems.values()).reduce(
    (sum, { item, quantity }) => sum + getCustomerPrice(item) * quantity,
    0
  );

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 w-full border-b bg-indoor-events text-white">
          <div className="container flex h-14 items-center gap-4 px-4">
            <Zap className="h-6 w-6" />
            <h1 className="text-lg font-semibold">Quick Booking</h1>
          </div>
        </header>
        <main className="container px-4 py-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-display font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              Your event booking request has been submitted. Our team will review and contact you with a quotation.
            </p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => navigate('/orders')}>
                View My Bookings
              </Button>
              <Button onClick={() => navigate('/')} className="bg-indoor-events hover:bg-indoor-events/90">
                Back to Home
              </Button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-indoor-events text-white">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/indoor-events')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Zap className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Quick Booking</h1>
        </div>
      </header>

      <main className="container px-4 py-12 text-center">
        <p className="text-muted-foreground">Loading booking form...</p>
      </main>

      {/* Booking Form Dialog */}
      <QuickBookingFormDialog
        open={showBookingDialog}
        onOpenChange={(open) => {
          setShowBookingDialog(open);
          if (!open && !isSubmitted) {
            navigate('/indoor-events');
          }
        }}
        selectedItems={selectedItems}
        estimatedTotal={estimatedTotal}
        guestCount={guestCount}
        selectedEventType={selectedEventType}
        onSuccess={() => {
          setShowBookingDialog(false);
          setIsSubmitted(true);
        }}
      />

      <BottomNav />
    </div>
  );
};

export default IndoorEventsQuickBooking;
