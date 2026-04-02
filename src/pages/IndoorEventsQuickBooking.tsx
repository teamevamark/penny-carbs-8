import React, { useState, useMemo } from 'react';
import { useServiceModuleGuard } from '@/hooks/useServiceModuleGuard';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarDays, Search, Leaf, ShoppingBasket, Loader2, CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import { useIndoorEventItems, useIndoorEventCategories } from '@/hooks/useIndoorEventItems';
import FoodItemCard from '@/components/indoor-events/FoodItemCard';
import BottomNav from '@/components/customer/BottomNav';
import type { FoodItem } from '@/hooks/useIndoorEventItems';

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
  const { user, profile } = useAuth();
  const { selectedPanchayat, selectedWardNumber } = useLocation();

  const { data: items, isLoading: itemsLoading } = useIndoorEventItems();
  const { data: categories, isLoading: categoriesLoading } = useIndoorEventCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  // Booking form state
  const [eventDate, setEventDate] = useState<Date | undefined>();
  const [eventTime, setEventTime] = useState('');
  const [contactNumber, setContactNumber] = useState(profile?.mobile_number || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [eventDetails, setEventDetails] = useState('');
  const [referralMobile, setReferralMobile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const minDate = addDays(startOfDay(new Date()), 1);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory && item.category_id !== selectedCategory) return false;
      if (vegOnly && !item.is_vegetarian) return false;
      return true;
    });
  }, [items, searchQuery, selectedCategory, vegOnly]);

  const handleQuantityChange = (item: FoodItem, quantity: number) => {
    const newItems = new Map(selectedItems);
    if (quantity <= 0) {
      newItems.delete(item.id);
    } else {
      newItems.set(item.id, { item, quantity });
    }
    setSelectedItems(newItems);
  };

  const totalItemsCount = Array.from(selectedItems.values()).reduce((sum, { quantity }) => sum + quantity, 0);
  const estimatedTotal = Array.from(selectedItems.values()).reduce(
    (sum, { item, quantity }) => sum + (getCustomerPrice(item) * quantity), 0
  );

  const canSubmit = !!eventDate && !!contactNumber.trim() && !!deliveryAddress.trim() && !!selectedPanchayat && !!selectedWardNumber;

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to submit a booking", variant: "destructive" });
      navigate('/customer-auth');
      return;
    }
    if (!eventDate || !selectedPanchayat || !selectedWardNumber) return;

    setIsSubmitting(true);
    try {
      const orderNumber = `IE-${Date.now().toString(36).toUpperCase()}`;
      const itemsSummary = totalItemsCount > 0
        ? Array.from(selectedItems.values()).map(({ item, quantity }) => `${item.name} x${quantity}`).join(', ')
        : 'No specific dishes selected';

      let referredBy: string | null = null;
      const referralMobileToUse = referralMobile.trim();
      if (referralMobileToUse) {
        const { data: referrerProfile } = await supabase
          .from('profiles').select('user_id').eq('mobile_number', referralMobileToUse).single();
        if (referrerProfile) referredBy = referrerProfile.user_id;
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          service_type: 'indoor_events',
          event_date: eventDate.toISOString(),
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
        await supabase.from('order_items').insert(orderItems);
      }

      setShowBookingDialog(false);
      setIsSubmitted(true);
      toast({ title: "Booking Submitted!", description: "We will contact you with a quotation soon." });
    } catch (error: any) {
      console.error('Error submitting booking:', error);
      toast({ title: "Submission Failed", description: error.message || "Please try again", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h2 className="text-2xl font-display font-bold">Booking Submitted!</h2>
            <p className="text-muted-foreground max-w-sm">
              Your booking request has been submitted. Our team will review and contact you with a quotation.
            </p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => navigate('/orders')}>View My Bookings</Button>
              <Button onClick={() => navigate('/')} className="bg-indoor-events hover:bg-indoor-events/90">Back to Home</Button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const isLoading = itemsLoading || categoriesLoading;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-indoor-events text-white">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/indoor-events')} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Zap className="h-6 w-6" />
          <h1 className="text-lg font-semibold">Quick Booking</h1>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dishes..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            variant={vegOnly ? "default" : "outline"}
            size="sm"
            className={vegOnly ? "bg-success hover:bg-success/90" : ""}
            onClick={() => setVegOnly(!vegOnly)}
          >
            <Leaf className="h-3 w-3 mr-1" />
            Veg Only
          </Button>
        </div>

        {/* Category Tabs */}
        {!isLoading && categories && categories.length > 0 && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                className={selectedCategory === null ? "bg-indoor-events hover:bg-indoor-events/90" : ""}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  className={selectedCategory === category.id ? "bg-indoor-events hover:bg-indoor-events/90" : ""}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 border rounded-lg">
                <Skeleton className="h-20 w-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBasket className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {items?.length === 0 ? "No dishes available yet" : "No dishes match your filters"}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <FoodItemCard
                key={item.id}
                item={item}
                quantity={selectedItems.get(item.id)?.quantity || 0}
                onQuantityChange={(quantity) => handleQuantityChange(item, quantity)}
              />
            ))
          )}
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-background border-t shadow-lg">
          <div className="container px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{totalItemsCount} items selected</p>
              <p className="text-lg font-bold text-indoor-events">₹{estimatedTotal.toLocaleString()}</p>
            </div>
            <Button
              className="bg-indoor-events hover:bg-indoor-events/90"
              size="lg"
              onClick={() => {
                if (!user) {
                  toast({ title: "Login Required", description: "Please login to book", variant: "destructive" });
                  navigate('/customer-auth');
                  return;
                }
                setShowBookingDialog(true);
              }}
            >
              Book Now
            </Button>
          </div>
        </div>
      )}

      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indoor-events" />
              Complete Booking
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Order Summary */}
            <div className="rounded-lg bg-indoor-events/5 border border-indoor-events/20 p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{totalItemsCount} items</span>
                <span className="font-bold text-indoor-events">₹{estimatedTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Event Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !eventDate && "text-muted-foreground")}
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

            {/* Time */}
            <div className="space-y-2">
              <Label>Event Time (Optional)</Label>
              <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <Label>Contact Number *</Label>
              <Input type="tel" placeholder="Your phone number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Event Venue Address *</Label>
              <Textarea placeholder="Enter complete venue address..." value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              {selectedPanchayat && selectedWardNumber && (
                <p className="text-xs text-muted-foreground">📍 Ward {selectedWardNumber}, {selectedPanchayat.name}</p>
              )}
            </div>

            {/* Special Instructions */}
            <div className="space-y-2">
              <Label>Special Instructions (Optional)</Label>
              <Textarea placeholder="Any special requirements..." value={eventDetails} onChange={(e) => setEventDetails(e.target.value)} />
            </div>

            {/* Referral */}
            <div className="space-y-2">
              <Label>Reference Mobile (Optional)</Label>
              <Input type="tel" placeholder="Referrer's mobile number" value={referralMobile} onChange={(e) => setReferralMobile(e.target.value)} />
            </div>

            {/* Submit */}
            <Button
              className="w-full bg-indoor-events hover:bg-indoor-events/90"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
              ) : (
                `Confirm Booking • ₹${estimatedTotal.toLocaleString()}`
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">Admin will review and send you a quotation</p>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default IndoorEventsQuickBooking;
