import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AddressSelector from '@/components/customer/AddressSelector';
import { calculatePlatformMargin } from '@/lib/priceUtils';

// Helper to get customer price (base + margin)
const getCustomerPrice = (foodItem: any): number => {
  if (!foodItem) return 0;
  const marginType = (foodItem.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = foodItem.platform_margin_value || 0;
  const margin = calculatePlatformMargin(foodItem.price, marginType, marginValue);
  return foodItem.price + margin;
};

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { selectedPanchayat, selectedWardNumber, isLocationSet } = useLocation();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine service type from cart items (assume all items have same service type)
  const serviceType = items[0]?.food_item?.service_type || 'cloud_kitchen';

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">Checkout</h1>
        </header>

        <div className="flex flex-col items-center justify-center py-20">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Add some items to proceed with checkout
          </p>
          <Button className="mt-6" onClick={() => navigate('/')}>
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has location set in their profile
  if (!isLocationSet) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">Checkout</h1>
        </header>

        <div className="flex flex-col items-center justify-center py-20 px-4">
          <MapPin className="h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Location Required</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Please update your profile with your Panchayat and Ward to continue
          </p>
          <Button className="mt-6" onClick={() => navigate('/profile')}>
            Update Profile
          </Button>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      toast({
        title: 'Address Required',
        description: 'Please enter your delivery address',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate order number
      const orderNumber = `PC${Date.now()}`;

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          customer_id: user.id,
          service_type: serviceType as 'indoor_events' | 'cloud_kitchen' | 'homemade',
          total_amount: totalAmount,
          panchayat_id: selectedPanchayat!.id,
          ward_number: selectedWardNumber!,
          delivery_address: deliveryAddress,
          delivery_instructions: deliveryInstructions || null,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with customer price (base + platform margin)
      const orderItems = items.map(item => {
        const customerPrice = getCustomerPrice(item.food_item);
        return {
          order_id: order.id,
          food_item_id: item.food_item_id,
          quantity: item.quantity,
          unit_price: customerPrice,
          total_price: customerPrice * item.quantity,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear the cart
      await clearCart();

      toast({
        title: 'Order Placed!',
        description: `Your order #${order.order_number} has been placed successfully`,
      });

      navigate('/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deliveryFee = 0; // Free delivery for now
  const grandTotal = totalAmount + deliveryFee;

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">Checkout</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* Delivery Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location from profile */}
            <div className="rounded-lg bg-muted p-3 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Ward {selectedWardNumber}, {selectedPanchayat?.name}</p>
                <p className="text-xs text-muted-foreground">Your registered location</p>
              </div>
            </div>

            {/* Address Selector with saved addresses */}
            <div className="space-y-2">
              <Label>Select or enter delivery address *</Label>
              <AddressSelector
                selectedAddress={deliveryAddress}
                onAddressChange={setDeliveryAddress}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
              <Input
                id="instructions"
                placeholder="Any special delivery instructions..."
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => {
              const customerPrice = getCustomerPrice(item.food_item);
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.food_item?.name} × {item.quantity}
                  </span>
                  <span>₹{(customerPrice * item.quantity).toFixed(0)}</span>
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{totalAmount.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="text-green-600">FREE</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">₹{grandTotal.toFixed(0)}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 shadow-lg">
        <Button
          className="w-full h-12 text-base"
          onClick={handlePlaceOrder}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : (
            `Place Order • ₹${grandTotal.toFixed(0)}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
