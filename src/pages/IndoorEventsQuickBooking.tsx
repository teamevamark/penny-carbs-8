import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarDays, Users, MapPin, Phone, Zap, Loader2, CheckCircle, UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import EventTypeSelector from '@/components/events/EventTypeSelector';
import QuickBookingFoodSelection from '@/components/indoor-events/QuickBookingFoodSelection';
import PlannerStepCard from '@/components/indoor-events/PlannerStepCard';
import StepDialog from '@/components/indoor-events/StepDialog';
import BottomNav from '@/components/customer/BottomNav';
import type { EventType } from '@/types/events';
import type { FoodItem } from '@/hooks/useIndoorEventItems';

interface SelectedItem {
  item: FoodItem;
  quantity: number;
}

type DialogStep = 'event-type' | 'food' | 'details' | 'venue' | null;

const IndoorEventsQuickBooking: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { selectedPanchayat, selectedWardNumber } = useLocation();

  // Load pre-selected event type and items from session storage
  const getInitialEventType = (): EventType | null => {
    const stored = sessionStorage.getItem('indoor_event_type');
    if (stored) {
      sessionStorage.removeItem('indoor_event_type');
      return JSON.parse(stored);
    }
    return null;
  };

  const getInitialItems = (): Map<string, SelectedItem> => {
    const stored = sessionStorage.getItem('indoor_event_items');
    if (stored) {
      sessionStorage.removeItem('indoor_event_items');
      const items = JSON.parse(stored) as Array<{ id: string; name: string; price: number; quantity: number }>;
      const map = new Map<string, SelectedItem>();
      items.forEach(item => {
        map.set(item.id, {
          item: { id: item.id, name: item.name, price: item.price } as FoodItem,
          quantity: item.quantity,
        });
      });
      return map;
    }
    return new Map();
  };

  const getInitialGuestCount = (): number => {
    const stored = sessionStorage.getItem('indoor_event_guest_count');
    if (stored) {
      sessionStorage.removeItem('indoor_event_guest_count');
      return parseInt(stored) || 50;
    }
    return 50;
  };

  const [activeDialog, setActiveDialog] = useState<DialogStep>(null);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(getInitialEventType);
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [eventTime, setEventTime] = useState('');
  const [guestCount, setGuestCount] = useState<number>(getInitialGuestCount);
  const [contactNumber, setContactNumber] = useState(profile?.mobile_number || '');
  const [eventDetails, setEventDetails] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(getInitialItems);
  const [referralMobile, setReferralMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const minDate = addDays(startOfDay(new Date()), 1);

  // Helper to get customer price (base + margin)
  const getCustomerPrice = (item: FoodItem): number => {
    const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
    const marginValue = item.platform_margin_value || 0;
    const margin = calculatePlatformMargin(item.price, marginType, marginValue);
    return item.price + margin;
  };

  // Calculate totals from selected items
  const totalItemsCount = Array.from(selectedItems.values()).reduce((sum, { quantity }) => sum + quantity, 0);
  const estimatedTotal = Array.from(selectedItems.values()).reduce(
    (sum, { item, quantity }) => sum + (getCustomerPrice(item) * quantity), 
    0
  );

  // Close dialog after completing a step instead of auto-opening next
  const closeDialog = () => {
    setActiveDialog(null);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to submit a booking request",
        variant: "destructive",
      });
      navigate('/customer-auth');
      return;
    }

    if (!selectedEventType) {
      toast({
        title: "Event Type Required",
        description: "Please select an event type",
        variant: "destructive",
      });
      return;
    }

    if (!eventDate) {
      toast({
        title: "Date Required",
        description: "Please select an event date",
        variant: "destructive",
      });
      return;
    }

    if (isBefore(eventDate, minDate)) {
      toast({
        title: "Invalid Date",
        description: "Event must be at least 1 day in advance",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPanchayat || !selectedWardNumber) {
      toast({
        title: "Location Required",
        description: "Please select your location from the home page",
        variant: "destructive",
      });
      return;
    }

    if (!contactNumber.trim()) {
      toast({
        title: "Contact Required",
        description: "Please provide a contact number",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        title: "Address Required",
        description: "Please provide the event venue address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate order number
      const orderNumber = `IE-${Date.now().toString(36).toUpperCase()}`;

      // Build selected items summary for event details
      const itemsSummary = totalItemsCount > 0 
        ? Array.from(selectedItems.values())
            .map(({ item, quantity }) => `${item.name} x${quantity}`)
            .join(', ')
        : 'No specific dishes selected';

      // Look up referrer user from mobile number (from input or session storage)
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
        // Clear the session storage after use
        sessionStorage.removeItem('indoor_event_referral');
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          service_type: 'indoor_events',
          event_type_id: selectedEventType.id,
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

      // Insert order items if any selected
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

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Error inserting order items:', itemsError);
        }
      }

      setIsSubmitted(true);
      toast({
        title: "Booking Request Submitted!",
        description: "We will contact you with a quotation soon.",
      });
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step completion checks
  const isEventTypeComplete = !!selectedEventType;
  const isFoodComplete = true; // Optional step
  const isDetailsComplete = !!eventDate && !!contactNumber;
  const isVenueComplete = !!deliveryAddress.trim();

  const canSubmit = isEventTypeComplete && isDetailsComplete && isVenueComplete;

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

      <main className="container px-4 py-6 space-y-4">
        {/* Step Cards */}
        <PlannerStepCard
          stepNumber={1}
          title="Event Type"
          description="Select occasion type"
          icon={<CalendarDays className="h-6 w-6" />}
          isCompleted={isEventTypeComplete}
          isActive={activeDialog === 'event-type'}
          summary={selectedEventType?.name}
          onClick={() => setActiveDialog('event-type')}
        />

        <PlannerStepCard
          stepNumber={2}
          title="Food Selection"
          description="Optional - select dishes"
          icon={<UtensilsCrossed className="h-6 w-6" />}
          isCompleted={totalItemsCount > 0}
          isActive={activeDialog === 'food'}
          summary={totalItemsCount > 0 ? `${totalItemsCount} items selected` : undefined}
          onClick={() => setActiveDialog('food')}
        />

        <PlannerStepCard
          stepNumber={3}
          title="Event Details"
          description="Date, guests, contact"
          icon={<Users className="h-6 w-6" />}
          isCompleted={isDetailsComplete}
          isActive={activeDialog === 'details'}
          summary={eventDate ? format(eventDate, 'MMM d, yyyy') : undefined}
          onClick={() => setActiveDialog('details')}
        />

        <PlannerStepCard
          stepNumber={4}
          title="Event Venue"
          description="Location address"
          icon={<MapPin className="h-6 w-6" />}
          isCompleted={isVenueComplete}
          isActive={activeDialog === 'venue'}
          summary={deliveryAddress ? deliveryAddress.substring(0, 30) + (deliveryAddress.length > 30 ? '...' : '') : undefined}
          onClick={() => setActiveDialog('venue')}
        />

        {/* Submit Button */}
        <Button
          className="w-full bg-indoor-events hover:bg-indoor-events/90 mt-6"
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
            'Submit Booking Request'
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Admin will review and send you a quotation
        </p>
      </main>

      {/* Event Type Dialog */}
      <StepDialog
        open={activeDialog === 'event-type'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Select Event Type"
      >
        <div className="space-y-4">
          <EventTypeSelector
            selectedEventType={selectedEventType}
            onSelect={setSelectedEventType}
          />
          <Button
            className="w-full bg-indoor-events hover:bg-indoor-events/90"
            onClick={closeDialog}
            disabled={!selectedEventType}
          >
            Done
          </Button>
        </div>
      </StepDialog>

      {/* Food Selection Dialog */}
      <StepDialog
        open={activeDialog === 'food'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Food Selection (Optional)"
      >
        <div className="space-y-4">
          <QuickBookingFoodSelection
            selectedItems={selectedItems}
            onItemsChange={setSelectedItems}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={closeDialog} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indoor-events hover:bg-indoor-events/90"
              onClick={closeDialog}
            >
              Done
            </Button>
          </div>
        </div>
      </StepDialog>

      {/* Event Details Dialog */}
      <StepDialog
        open={activeDialog === 'details'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Event Details"
      >
        <div className="space-y-4">
          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Event Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !eventDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {eventDate ? format(eventDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  onSelect={setEventDate}
                  disabled={(date) => isBefore(date, minDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Event Time */}
          <div className="space-y-2">
            <Label>Event Time (Optional)</Label>
            <Input
              type="time"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-2">
            <Label>Contact Number *</Label>
            <Input
              type="tel"
              placeholder="Your phone number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label>Special Instructions (Optional)</Label>
            <Textarea
              placeholder="Any special requirements..."
              value={eventDetails}
              onChange={(e) => setEventDetails(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={closeDialog} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indoor-events hover:bg-indoor-events/90"
              onClick={closeDialog}
              disabled={!isDetailsComplete}
            >
              Done
            </Button>
          </div>
        </div>
      </StepDialog>

      {/* Venue Dialog */}
      <StepDialog
        open={activeDialog === 'venue'}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        title="Event Venue"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Address *</Label>
            <Textarea
              placeholder="Enter complete venue address..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
            {selectedPanchayat && selectedWardNumber && (
              <p className="text-xs text-muted-foreground">
                📍 Ward {selectedWardNumber}, {selectedPanchayat.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reference Mobile (Optional)</Label>
            <Input
              type="tel"
              placeholder="Referrer's mobile number"
              value={referralMobile}
              onChange={(e) => setReferralMobile(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter if someone referred you
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={closeDialog} className="flex-1">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-indoor-events hover:bg-indoor-events/90"
              onClick={() => setActiveDialog(null)}
              disabled={!isVenueComplete}
            >
              Done
            </Button>
          </div>
        </div>
      </StepDialog>

      <BottomNav />
    </div>
  );
};

export default IndoorEventsQuickBooking;
