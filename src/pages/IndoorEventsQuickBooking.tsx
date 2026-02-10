import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, Leaf, ShoppingBasket, Zap, CheckCircle } from 'lucide-react';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import { useIndoorEventItems, useIndoorEventCategories } from '@/hooks/useIndoorEventItems';
import FoodItemCard from '@/components/indoor-events/FoodItemCard';
import QuickBookingFormDialog from '@/components/indoor-events/QuickBookingFormDialog';
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
  const { user } = useAuth();

  const { data: items, isLoading: itemsLoading } = useIndoorEventItems();
  const { data: categories, isLoading: categoriesLoading } = useIndoorEventCategories();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
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
    (sum, { item, quantity }) => sum + getCustomerPrice(item) * quantity,
    0
  );

  const isLoading = itemsLoading || categoriesLoading;

  const handleBookNow = () => {
    if (!user) {
      navigate('/customer-auth');
      return;
    }
    setShowBookingDialog(true);
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
    <div className="min-h-screen bg-background pb-32">
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
            variant={vegOnly ? 'default' : 'outline'}
            size="sm"
            className={vegOnly ? 'bg-success hover:bg-success/90' : ''}
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
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                className={selectedCategory === null ? 'bg-indoor-events hover:bg-indoor-events/90' : ''}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  className={selectedCategory === category.id ? 'bg-indoor-events hover:bg-indoor-events/90' : ''}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Food Items */}
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
                {items?.length === 0
                  ? 'No dishes available for indoor events yet'
                  : 'No dishes match your filters'}
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
          <div className="container flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''} selected
              </p>
              <p className="text-lg font-bold text-indoor-events">
                ₹{estimatedTotal.toLocaleString()}
              </p>
            </div>
            <Button
              className="bg-indoor-events hover:bg-indoor-events/90 px-6"
              size="lg"
              onClick={handleBookNow}
            >
              Book Now
            </Button>
          </div>
        </div>
      )}

      {/* Booking Form Dialog */}
      <QuickBookingFormDialog
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        selectedItems={selectedItems}
        estimatedTotal={estimatedTotal}
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
