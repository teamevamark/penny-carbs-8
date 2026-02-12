import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDeliveryRules } from '@/hooks/useDeliveryRules';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { items, totalAmount, updateQuantity, removeFromCart, isLoading } = useCart();
  const { user } = useAuth();
  const { rules } = useDeliveryRules();

  const deliveryFee = useMemo(() => {
    if (!items.length || !rules?.length) return 0;

    // Determine the service type from cart items
    const serviceType = items[0]?.food_item?.service_type;
    if (!serviceType) return 0;

    // Find active rule for this service type
    const activeRule = rules.find(
      (r) => r.service_type === serviceType && r.is_active
    );
    if (!activeRule) return 0;

    // Free delivery if subtotal exceeds threshold
    if (activeRule.free_delivery_above != null && totalAmount >= activeRule.free_delivery_above) {
      return 0;
    }

    return activeRule.min_delivery_charge;
  }, [items, rules, totalAmount]);

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/checkout');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Login to view cart</h2>
        <p className="mt-2 text-center text-muted-foreground">
          Sign in to add items to your cart
        </p>
        <Button className="mt-6" onClick={() => navigate('/auth')}>
          Login / Sign Up
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">Cart</h1>
        </header>
        
        <div className="flex flex-col items-center justify-center py-20">
          <ShoppingBag className="h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Add some delicious items to get started
          </p>
          <Button className="mt-6" onClick={() => navigate('/')}>
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-card px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-display text-lg font-semibold">
          Cart ({items.length} items)
        </h1>
      </header>

      <main className="p-4 space-y-4">
        {items.map((cartItem) => {
          const item = cartItem.food_item;
          const primaryImage = item?.images?.find(img => img.is_primary) || item?.images?.[0];
          
          return (
            <Card key={cartItem.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {primaryImage ? (
                      <img
                        src={primaryImage.image_url}
                        alt={item?.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium line-clamp-2">{item?.name}</h3>
                    <p className="mt-1 text-lg font-bold">
                      ₹{(((cartItem as any).cook_custom_price ?? item?.price ?? 0) * cartItem.quantity).toFixed(0)}
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-r-none"
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {cartItem.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-l-none"
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(cartItem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>

      {/* Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 shadow-lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{totalAmount.toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Delivery Fee</span>
            {deliveryFee > 0 ? (
              <span>₹{deliveryFee.toFixed(0)}</span>
            ) : (
              <span className="text-green-600">FREE</span>
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between font-semibold">
            <span>Total</span>
            <span className="text-lg">₹{(totalAmount + deliveryFee).toFixed(0)}</span>
          </div>
          <Button className="w-full h-12 text-base" onClick={handleCheckout}>
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
