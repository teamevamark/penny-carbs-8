import React, { useState } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Clock, MapPin, Phone, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import EventTypeSelector from '@/components/events/EventTypeSelector';
import type { EventType } from '@/types/events';
import type { FoodItem } from '@/hooks/useIndoorEventItems';

interface SelectedItem {
  item: FoodItem;
  quantity: number;
}

interface QuickBookingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: Map<string, SelectedItem>;
  estimatedTotal: number;
  onSuccess: () => void;
}

const QuickBookingFormDialog: React.FC<QuickBookingFormDialogProps> = ({
  open,
  onOpenChange,
  selectedItems,
  estimatedTotal,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { selectedPanchayat, selectedWardNumber } = useLocation();

  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [eventTime, setEventTime] = useState('');
  const [guestCount, setGuestCount] = useState<number>(50);
  const [contactNumber, setContactNumber] = useState(profile?.mobile_number || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [referralMobile, setReferralMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDate = addDays(startOfDay(new Date()), 1);

  const getCustomerPrice = (item: FoodItem): number => {
    const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
    const marginValue = item.platform_margin_value || 0;
    const margin = calculatePlatformMargin(item.price, marginType, marginValue);
    return item.price + margin;
  };

  const totalItemsCount = Array.from(selectedItems.values()).reduce((sum, { quantity }) => sum + quantity, 0);

  const canSubmit =
    !!eventDate &&
    !!contactNumber.trim() &&
    !!deliveryAddress.trim() &&
    !!selectedPanchayat &&
    !!selectedWardNumber &&
    totalItemsCount > 0;

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to submit a booking request',
        variant: 'destructive',
      });
      navigate('/customer-auth');
      return;
    }

    if (!eventDate) {
      toast({ title: 'Date Required', description: 'Please select an event date', variant: 'destructive' });
      return;
    }

    if (isBefore(eventDate, minDate)) {
      toast({ title: 'Invalid Date', description: 'Event must be at least 1 day in advance', variant: 'destructive' });
      return;
    }

    if (!selectedPanchayat || !selectedWardNumber) {
      toast({ title: 'Location Required', description: 'Please select your location from the home page', variant: 'destructive' });
      return;
    }

    if (!contactNumber.trim()) {
      toast({ title: 'Contact Required', description: 'Please provide a contact number', variant: 'destructive' });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({ title: 'Address Required', description: 'Please provide the event venue address', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNumber = `IE-${Date.now().toString(36).toUpperCase()}`;

      const itemsSummary = Array.from(selectedItems.values())
        .map(({ item, quantity }) => `${item.name} x${quantity}`)
        .join(', ');

      let referredBy: string | null = null;
      const referralMobileToUse = referralMobile.trim() || sessionStorage.getItem('indoor_event_referral');
      if (referralMobileToUse) {
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('mobile_number', referralMobileToUse)
          .single();
        if (referrerProfile) {
          referredBy = referrerProfile.user_id;
        }
        sessionStorage.removeItem('indoor_event_referral');
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          service_type: 'indoor_events',
          event_type_id: selectedEventType?.id || null,
          event_date: eventDate.toISOString(),
          guest_count: guestCount,
          event_details: `Quick Booking | Time: ${eventTime || 'Not specified'} | Contact: ${contactNumber} | Items: ${itemsSummary} | ${eventDetails}`,
          delivery_address: deliveryAddress,
          panchayat_id: selectedPanchayat.id,
          ward_number: selectedWardNumber,
          status: 'pending',
          order_type: 'food_only',
          total_amount: estimatedTotal || 0,
          referred_by: referredBy,
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      if (totalItemsCount > 0 && orderData) {
        const orderItems = Array.from(selectedItems.values()).map(({ item, quantity }) => {
          const customerPrice = getCustomerPrice(item);
          return {
            order_id: orderData.id,
            food_item_id: item.id,
            quantity,
            unit_price: customerPrice,
            total_price: customerPrice * quantity,
          };
        });

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        if (itemsError) console.error('Error inserting order items:', itemsError);
      }

      toast({
        title: 'Booking Request Submitted!',
        description: 'We will contact you with a quotation soon.',
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-indoor-events text-white p-4 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold">Complete Your Booking</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-5">
          {/* Order Summary */}
          <div className="bg-indoor-events/5 border border-indoor-events/20 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{totalItemsCount} items selected</span>
              <span className="text-lg font-bold text-indoor-events">₹{estimatedTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Event Type (Optional) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Event Type (Optional)</Label>
            <EventTypeSelector
              selectedEventType={selectedEventType}
              onSelect={setSelectedEventType}
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4" />
              Event Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !eventDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={setEventDate}
                  disabled={(date) => isBefore(date, minDate)}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              Event Time (Optional)
            </Label>
            <Input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>

          {/* Guest Count */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Expected Guests
            </Label>
            <Input
              type="number"
              min={1}
              value={guestCount}
              onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4" />
              Contact Number *
            </Label>
            <Input
              type="tel"
              placeholder="Your phone number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Event Venue Address *
            </Label>
            <Textarea
              placeholder="Enter complete venue address..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
            {selectedPanchayat && selectedWardNumber ? (
              <p className="text-xs text-muted-foreground">
                📍 Ward {selectedWardNumber}, {selectedPanchayat.name}
              </p>
            ) : (
              <p className="text-xs text-destructive">
                ⚠️ Please select location from home page
              </p>
            )}
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Special Instructions (Optional)</Label>
            <Textarea
              placeholder="Any special requirements, dietary restrictions..."
              value={eventDetails}
              onChange={(e) => setEventDetails(e.target.value)}
            />
          </div>

          {/* Referral */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Referral Mobile (Optional)</Label>
            <Input
              type="tel"
              placeholder="Referrer's mobile number"
              value={referralMobile}
              onChange={(e) => setReferralMobile(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full bg-indoor-events hover:bg-indoor-events/90"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              `Confirm Booking • ₹${estimatedTotal.toLocaleString()}`
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Admin will review and send you a quotation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickBookingFormDialog;
