import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import type { FoodItemWithImages } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { ArrowLeft, Plus, Minus, Clock, Leaf, ShoppingCart, CalendarHeart, Lock, Share2, Copy, Check, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import CookSelector, { type CookOption } from '@/components/customer/CookSelector';
import PendingCartDialog from '@/components/customer/PendingCartDialog';
import CustomerLoginDialog from '@/components/customer/CustomerLoginDialog';
import cfcOfferDetailImage from '@/assets/cfc-offer-detail.jpeg';

const getCustomItemTheme = (itemName: string | undefined) => {
  const normalizedName = itemName?.toLowerCase().trim() || '';

  if (
    normalizedName.includes('carbs brost chicken mega offer') ||
    normalizedName.includes('8 piece cfc')
  ) {
    return {
      heroImage: cfcOfferDetailImage,
      eyebrow: 'Limited time offer',
      title: '8 Piece CFC Mega Offer',
      description: 'A custom promo layout for your brost special with the uploaded poster shown first on the detail page.',
      highlights: ['₹299 deal', '8 crispy pieces', 'Best deal'],
    };
  }

  return null;
};

const ItemDetail: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { addToCart, items: cartItems, updateQuantity, clearCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();
  
  const [item, setItem] = useState<FoodItemWithImages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [availableCooks, setAvailableCooks] = useState<CookOption[]>([]);
  const [selectedCookId, setSelectedCookId] = useState<string | null>(null);
  const [showPendingCartDialog, setShowPendingCartDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'buy' | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { selectedPanchayat } = useLocation();

  // Don't auto-show login dialog - let users browse freely
  // Login will be prompted when they try to add to cart or buy

  const cartItem = cartItems.find(ci => ci.food_item_id === itemId);
  const currentCartQuantity = cartItem?.quantity || 0;

  // Check if cart has items from a different context (other items)
  const hasOtherCartItems = cartItems.length > 0 && !cartItem;

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return;
      
      try {
        const { data, error } = await supabase
          .from('food_items')
          .select(`
            *,
            images:food_item_images(*),
            category:food_categories(*)
          `)
          .eq('id', itemId)
          .single();

        if (error) {
          console.error('Error fetching item:', error);
          setIsLoading(false);
          return;
        }
        setItem(data as FoodItemWithImages);

        // For homemade and cloud kitchen items, fetch available cooks
        const serviceTypes = (data as any).service_types || [];
        const isHomemade = data.service_type === 'homemade' || serviceTypes.includes('homemade');
        const isCloudKitchenItem = data.service_type === 'cloud_kitchen' || serviceTypes.includes('cloud_kitchen');
        
        if (isHomemade || isCloudKitchenItem) {
          const { data: cookDishes, error: cooksError } = await supabase
            .from('cook_dishes')
            .select(`
              id,
              cook_id,
              custom_price,
              cooks!inner(id, kitchen_name, rating, total_orders, is_active, is_available, panchayat_id, assigned_panchayat_ids),
              cook_dish_images(id, image_url, display_order)
            `)
            .eq('food_item_id', itemId);

          if (!cooksError && cookDishes) {
            const cookDishIds = cookDishes.map((cd: any) => cd.id);
            let featuresMap: Record<string, string[]> = {};
            if (cookDishIds.length > 0) {
              const { data: featuresData } = await supabase
                .from('cook_dish_features')
                .select('cook_dish_id, feature_text')
                .in('cook_dish_id', cookDishIds)
                .order('display_order');
              if (featuresData) {
                featuresData.forEach((f: any) => {
                  if (!featuresMap[f.cook_dish_id]) featuresMap[f.cook_dish_id] = [];
                  featuresMap[f.cook_dish_id].push(f.feature_text);
                });
              }
            }

            const activeCooks = cookDishes
              .filter((cd: any) => {
                if (!cd.cooks?.is_active || !cd.cooks?.is_available) return false;
                const panchayatId = selectedPanchayat?.id;
                if (!panchayatId) return false;
                const assignedPanchayats: string[] = cd.cooks.assigned_panchayat_ids || [];
                return assignedPanchayats.includes(panchayatId) || cd.cooks.panchayat_id === panchayatId;
              })
              .map((cd: any) => ({
                cook_id: cd.cook_id,
                kitchen_name: cd.cooks.kitchen_name,
                rating: cd.cooks.rating,
                total_orders: cd.cooks.total_orders,
                custom_price: cd.custom_price as number | null,
                features: featuresMap[cd.id] || [],
                images: cd.cook_dish_images || [],
              }));
            setAvailableCooks(activeCooks);
            if (activeCooks.length === 1) {
              setSelectedCookId(activeCooks[0].cook_id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching item:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [itemId, selectedPanchayat?.id]);

  const serviceTypes = (item as any)?.service_types || [];
  const isHomemade = item?.service_type === 'homemade' || serviceTypes.includes('homemade');
  const isCloudKitchen = item?.service_type === 'cloud_kitchen' || serviceTypes.includes('cloud_kitchen');
  const isIndoorEvents = item?.service_type === 'indoor_events';
  const isComingSoon = isHomemade ? (item as any)?.is_coming_soon_home_delivery === true : (item as any)?.is_coming_soon_cloud_kitchen === true;

  // Multi-cook: require selection (homemade only for cook selector UI)
  const needsCookSelection = isHomemade && availableCooks.length > 1 && !selectedCookId;
  const noCooksAvailable = (isHomemade || isCloudKitchen) && availableCooks.length === 0 && !isLoading;

  const customerPrice = useMemo(() => {
    if (!item) return 0;
    const itemWithMargin = item as FoodItemWithImages & { platform_margin_type?: string; platform_margin_value?: number };
    const marginType = (itemWithMargin.platform_margin_type || 'percent') as 'percent' | 'fixed';
    const marginValue = itemWithMargin.platform_margin_value || 0;

    let basePrice = item.price;
    if (isHomemade && availableCooks.length > 0) {
      if (selectedCookId) {
        const selectedCook = availableCooks.find(c => c.cook_id === selectedCookId);
        if (selectedCook?.custom_price != null) {
          basePrice = selectedCook.custom_price;
        }
      } else {
        const lowestPrice = Math.min(
          ...availableCooks.map(c => c.custom_price ?? item.price)
        );
        basePrice = lowestPrice;
      }
    }

    const margin = calculatePlatformMargin(basePrice, marginType, marginValue);
    return basePrice + margin;
  }, [item, selectedCookId, availableCooks, isHomemade]);

  const getResolvedCookId = () => {
    let cookId = selectedCookId;
    if (isHomemade && !cookId && availableCooks.length === 1) {
      cookId = availableCooks[0].cook_id;
    }
    return cookId;
  };

  const handleAddToCart = async () => {
    if (!item) return;
    if (needsCookSelection) {
      toast.error('Please select a cook first');
      return;
    }
    if (hasOtherCartItems && user) {
      setPendingAction('add');
      setShowPendingCartDialog(true);
      return;
    }
    await performAddToCart();
  };

  const performAddToCart = async () => {
    if (!item) return;
    const cookId = getResolvedCookId();
    await addToCart(item.id, quantity, cookId);
    navigate(-1);
  };

  const handleBuyNow = async () => {
    if (!item) return;
    if (needsCookSelection) {
      toast.error('Please select a cook first');
      return;
    }
    if (!user) {
      navigate('/auth');
      return;
    }
    if (hasOtherCartItems) {
      setPendingAction('buy');
      setShowPendingCartDialog(true);
      return;
    }
    await performBuyNow();
  };

  const performBuyNow = async () => {
    if (!item) return;
    const cookId = getResolvedCookId();
    await addToCart(item.id, quantity, cookId);
    navigate('/checkout');
  };

  const handlePendingCartContinue = async () => {
    setShowPendingCartDialog(false);
    if (pendingAction === 'add') {
      await performAddToCart();
    } else if (pendingAction === 'buy') {
      await performBuyNow();
    }
    setPendingAction(null);
  };

  const handlePendingCartClear = async () => {
    await clearCart();
    setShowPendingCartDialog(false);
    if (pendingAction === 'add') {
      await performAddToCart();
    } else if (pendingAction === 'buy') {
      await performBuyNow();
    }
    setPendingAction(null);
  };

  const handleUpdateCart = async (newQuantity: number) => {
    if (!cartItem) return;
    await updateQuantity(cartItem.id, newQuantity);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-72 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <span className="text-6xl">😕</span>
        <h2 className="mt-4 text-lg font-semibold">Item not found</h2>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const images = item.images?.sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  }) || [];
  const customTheme = getCustomItemTheme(item.name);
  const heroImages = Array.from(new Set([
    customTheme?.heroImage,
    ...images.map((image) => image.image_url),
  ].filter(Boolean) as string[]));

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between p-4">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full bg-card/90 shadow-md backdrop-blur"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-card/90 shadow-md backdrop-blur"
            onClick={async () => {
              const url = `${window.location.origin}/item/${itemId}`;
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                toast.success('Link copied!');
                setTimeout(() => setCopied(false), 2000);
              } catch {
                try {
                  const textarea = document.createElement('textarea');
                  textarea.value = url;
                  textarea.style.position = 'fixed';
                  textarea.style.opacity = '0';
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  setCopied(true);
                  toast.success('Link copied!');
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  toast.error('Could not copy link');
                }
              }
            }}
          >
            {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-card/90 shadow-md backdrop-blur"
            onClick={async () => {
              const url = `${window.location.origin}/item/${itemId}`;
              const text = `Check out ${item?.name || 'this item'}! ${url}`;
              if (navigator.share) {
                try {
                  await navigator.share({ title: item?.name || 'Food Item', text, url });
                } catch (err: any) {
                  if (err?.name !== 'AbortError') {
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }
                }
              } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
              }
            }}
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="relative bg-secondary">
        {heroImages.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {heroImages.map((imageUrl, index) => (
                <CarouselItem key={`${imageUrl}-${index}`}>
                  <div className="relative h-72 w-full overflow-hidden sm:h-96">
                    <img
                      src={imageUrl}
                      alt={index === 0 && customTheme ? `${item.name} promotional poster` : item.name}
                      className="h-full w-full object-cover"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                    {index === 0 && customTheme && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
                        <div className="absolute inset-x-0 top-20 p-4 sm:top-24 sm:p-6">
                          <div className="max-w-sm rounded-3xl border bg-card/85 p-4 shadow-xl backdrop-blur sm:p-5">
                            <Badge variant="secondary" className="mb-3">{customTheme.eyebrow}</Badge>
                            <h2 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">{customTheme.title}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{customTheme.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {customTheme.highlights.map((highlight) => (
                                <Badge key={highlight} variant="outline">{highlight}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {heroImages.length > 1 && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="flex h-72 items-center justify-center text-7xl sm:h-96">
            🍽️
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-2xl font-bold">{item.name}</h1>
          {item.is_vegetarian && (
            <Badge className="gap-1 bg-success shrink-0">
              <Leaf className="h-3 w-3" />
              Veg
            </Badge>
          )}
        </div>

        {item.category && (
          <Badge variant="secondary" className="mt-2">
            {item.category.name}
          </Badge>
        )}

        {item.preparation_time_minutes && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{item.preparation_time_minutes} min preparation time</span>
          </div>
        )}

        {item.description && (
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}

        {customTheme && (
          <div className="mt-4 rounded-3xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {customTheme.highlights.map((highlight) => (
                <Badge key={`detail-${highlight}`} variant="secondary">{highlight}</Badge>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This item now uses your uploaded creative on the detail page for a stronger promo-style presentation.
            </p>
          </div>
        )}

        <div className="mt-6">
          <span className="text-3xl font-bold text-foreground">
            ₹{customerPrice.toFixed(0)}
          </span>
          {isIndoorEvents && (
            <span className="ml-2 text-sm text-muted-foreground">per plate</span>
          )}
          {needsCookSelection && (
            <span className="ml-2 text-sm text-muted-foreground">(starting from)</span>
          )}
        </div>

        {isHomemade && availableCooks.length > 0 && (
          <CookSelector
            cooks={availableCooks}
            selectedCookId={selectedCookId}
            onSelectCook={setSelectedCookId}
            basePrice={item.price}
            platformMarginType={(item as any).platform_margin_type || 'percent'}
            platformMarginValue={(item as any).platform_margin_value || 0}
          />
        )}

        {needsCookSelection && (
          <p className="mt-2 text-sm font-medium text-destructive">
            ⚠️ Please select a cook above to add to cart
          </p>
        )}

        {isIndoorEvents && (
          <div className="mt-4 rounded-lg border border-indoor-events/30 bg-indoor-events/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-indoor-events">🎉 Event Item:</strong> This dish is available for indoor events and party bookings.
              Contact us to customize your menu and get a quotation.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-card p-4 shadow-lg">
        {noCooksAvailable ? (
          <Button className="h-12 w-full text-base" disabled>
            <Lock className="mr-2 h-5 w-5" />
            No Cooks Available
          </Button>
        ) : isComingSoon ? (
          <Button className="h-12 w-full text-base" disabled>
            <Lock className="mr-2 h-5 w-5" />
            Coming Soon
          </Button>
        ) : isIndoorEvents ? (
          <Button
            className="h-12 w-full text-base bg-indoor-events hover:bg-indoor-events/90"
            onClick={() => navigate('/indoor-events')}
          >
            <CalendarHeart className="mr-2 h-5 w-5" />
            Book Event with This Dish
          </Button>
        ) : currentCartQuantity > 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Already in cart
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-r-none"
                  onClick={() => handleUpdateCart(currentCartQuantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-semibold">
                  {currentCartQuantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-l-none"
                  onClick={() => handleUpdateCart(currentCartQuantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => navigate('/cart')}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Cart
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-r-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-lg font-semibold">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-l-none"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="h-12 flex-1 text-base"
                onClick={handleAddToCart}
                disabled={needsCookSelection}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Add to Cart - ₹{(customerPrice * quantity).toFixed(0)}
              </Button>
            </div>
            <Button
              variant="outline"
              className="h-10 w-full border-primary text-sm text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={handleBuyNow}
              disabled={needsCookSelection}
            >
              <Zap className="mr-2 h-4 w-4" />
              Buy Now - ₹{(customerPrice * quantity).toFixed(0)}
            </Button>
          </div>
        )}
      </div>

      <PendingCartDialog
        open={showPendingCartDialog}
        onOpenChange={setShowPendingCartDialog}
        cartItemCount={cartItems.length}
        onContinue={handlePendingCartContinue}
        onClearCart={handlePendingCartClear}
        onViewCart={() => {
          setShowPendingCartDialog(false);
          navigate('/cart');
        }}
      />

      <CustomerLoginDialog
        open={showLoginDialog}
        onOpenChange={(open) => {
          setShowLoginDialog(open);
        }}
        title="ലോഗിൻ ആവശ്യമാണ്"
        message="മൊബൈൽ നമ്പറും പഞ്ചായത്തും നൽകിയാൽ മാത്രമേ നിങ്ങളുടെ പരിസരത്തു ഡെലിവറി ഉണ്ടോ എന്ന് മനസ്സിലാക്കൂ"
      />
    </div>
  );
};

export default ItemDetail;
