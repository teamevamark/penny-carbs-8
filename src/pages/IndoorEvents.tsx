import React, { useState } from 'react';
import { useServiceModuleGuard } from '@/hooks/useServiceModuleGuard';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Zap, Calculator, CalendarHeart, UserPlus, X, Users } from 'lucide-react';
import BottomNav from '@/components/customer/BottomNav';
import EventTypeSelector from '@/components/events/EventTypeSelector';
import StepDialog from '@/components/indoor-events/StepDialog';
import QuickBookingFoodSelection from '@/components/indoor-events/QuickBookingFoodSelection';
import { useEventTypes } from '@/hooks/useEventTypes';
import type { EventType } from '@/types/events';
import type { FoodItem } from '@/hooks/useIndoorEventItems';

interface SelectedItem {
  item: FoodItem;
  quantity: number;
}

type BookingMode = 'quick' | 'planner' | null;
type PopupStep = 'guest-count' | 'food-selection' | null;

const presetCounts = [10, 25, 50, 100, 150, 200, 300];

const IndoorEvents: React.FC = () => {
  useServiceModuleGuard('indoor_events');
  const navigate = useNavigate();
  const { data: eventTypes } = useEventTypes();
  const [showReferral, setShowReferral] = useState(false);
  const [referralMobile, setReferralMobile] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);

  // Auto-select first event type (default) when data loads
  React.useEffect(() => {
    if (eventTypes?.length && !selectedEventType) {
      setSelectedEventType(eventTypes[0]);
    }
  }, [eventTypes]);
  
  // Popup state
  const [bookingMode, setBookingMode] = useState<BookingMode>(null);
  const [popupStep, setPopupStep] = useState<PopupStep>(null);
  const [guestCount, setGuestCount] = useState<number>(50);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());

  const handleBookingClick = (mode: BookingMode) => {
    if (!selectedEventType) {
      return; // Button should be disabled anyway
    }
    
    // Store referral info and event type for the booking pages
    if (referralMobile.trim()) {
      sessionStorage.setItem('indoor_event_referral', referralMobile.trim());
    }
    sessionStorage.setItem('indoor_event_type', JSON.stringify(selectedEventType));
    
    // Set mode and open guest count popup first
    setBookingMode(mode);
    setPopupStep('guest-count');
  };

  const handleGuestCountContinue = () => {
    // Store guest count for the booking pages
    sessionStorage.setItem('indoor_event_guest_count', guestCount.toString());
    // Move to food selection popup
    setPopupStep('food-selection');
  };

  const handleFoodSelectionContinue = () => {
    // Store selected items for the booking pages
    const itemsArray = Array.from(selectedItems.values()).map(({ item, quantity }) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity,
    }));
    sessionStorage.setItem('indoor_event_items', JSON.stringify(itemsArray));
    
    setPopupStep(null);
    
    // Navigate to the appropriate page
    if (bookingMode === 'quick') {
      navigate('/indoor-events/quick-booking');
    } else {
      navigate('/indoor-events/planner');
    }
  };

  const handleSkipFoodSelection = () => {
    sessionStorage.removeItem('indoor_event_items');
    setPopupStep(null);
    
    if (bookingMode === 'quick') {
      navigate('/indoor-events/quick-booking');
    } else {
      navigate('/indoor-events/planner');
    }
  };

  const totalItemsCount = Array.from(selectedItems.values()).reduce((sum, { quantity }) => sum + quantity, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-indoor-events text-white">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CalendarHeart className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Indoor Events</h1>
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Referral Section */}
        <div className="mb-6">
          {!showReferral ? (
            <button
              onClick={() => setShowReferral(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <UserPlus className="h-4 w-4" />
              Have a referral? Add reference
            </button>
          ) : (
            <div className="bg-muted/50 rounded-xl p-4 border">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Reference Mobile (Optional)
                </Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    setShowReferral(false);
                    setReferralMobile('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                type="tel"
                placeholder="Enter referrer's mobile number"
                value={referralMobile}
                onChange={(e) => setReferralMobile(e.target.value)}
                maxLength={10}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Enter the mobile number of the person who referred you
              </p>
            </div>
          )}
        </div>

        {/* Booking Cards */}
        <div className="space-y-4">
          {/* Quick Booking Card */}
          <div 
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 p-6 transition-all cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            onClick={() => navigate('/indoor-events/quick-booking')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">Quick Booking</h3>
                <p className="text-white/80 text-sm mt-1">
                  Simple & fast • Admin sends quotation
                </p>
              </div>
            </div>
          </div>

          {/* Plan & Estimate Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 p-6 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            {/* Recommended Badge */}
            <div className="absolute top-3 right-3">
              <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
                Recommended
              </span>
            </div>
            
            <div className="relative z-10 flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Calculator className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">Plan & Estimate</h3>
                <p className="text-white/80 text-sm mt-1">
                  Build menu • Real-time pricing
                </p>
              </div>
            </div>

            {/* Event Type Selector inside card */}
            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/90 text-sm font-medium mb-3">
                Select Event Type (ഏതു തരം പരിപാടിയാണെന്ന് തിരഞ്ഞെടുക്കൂ)
              </p>
              <EventTypeSelector
                selectedEventType={selectedEventType}
                onSelect={setSelectedEventType}
              />
              {selectedEventType && (
                <Button
                  className="w-full mt-4 bg-white text-purple-700 hover:bg-white/90 font-semibold"
                  onClick={() => handleBookingClick('planner')}
                >
                  Continue with {selectedEventType.name}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          All bookings require admin approval. No instant payment.
        </p>
      </main>

      {/* Guest Count Popup */}
      <StepDialog
        open={popupStep === 'guest-count'}
        onOpenChange={(open) => {
          if (!open) {
            setPopupStep(null);
            setBookingMode(null);
          }
        }}
        title="How Many Guests?"
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground text-center">
            This helps us calculate portion sizes and pricing
          </p>

          <Card className="border-indoor-events/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Users className="h-8 w-8 text-indoor-events" />
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value) || 1)}
                  className="w-24 text-center text-2xl font-bold h-12"
                />
                <span className="text-muted-foreground">guests</span>
              </div>

              <Slider
                value={[guestCount]}
                onValueChange={([value]) => setGuestCount(value)}
                min={1}
                max={500}
                step={1}
                className="my-4"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>500+</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Presets */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Quick select</p>
            <div className="flex flex-wrap justify-center gap-2">
              {presetCounts.map((count) => (
                <Button
                  key={count}
                  variant={guestCount === count ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGuestCount(count)}
                  className={guestCount === count ? "bg-indoor-events hover:bg-indoor-events/90" : ""}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          <Button
            className="w-full bg-indoor-events hover:bg-indoor-events/90"
            onClick={handleGuestCountContinue}
            disabled={guestCount < 1}
          >
            Continue
          </Button>
        </div>
      </StepDialog>

      {/* Food Selection Popup */}
      <StepDialog
        open={popupStep === 'food-selection'}
        onOpenChange={(open) => {
          if (!open) {
            setPopupStep(null);
            setBookingMode(null);
          }
        }}
        title="Food Selection (Optional)"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select dishes you'd like for your event, or skip to continue.
          </p>
          
          <QuickBookingFoodSelection
            selectedItems={selectedItems}
            onItemsChange={setSelectedItems}
            guestCount={guestCount}
          />
          
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleSkipFoodSelection}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              className="flex-1 bg-indoor-events hover:bg-indoor-events/90"
              onClick={handleFoodSelectionContinue}
            >
              {totalItemsCount > 0 ? `Continue (${totalItemsCount} items)` : 'Continue'}
            </Button>
          </div>
        </div>
      </StepDialog>

      <BottomNav />
    </div>
  );
};

export default IndoorEvents;
