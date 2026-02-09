import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useLocation } from '@/contexts/LocationContext';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import CustomerLoginDialog from '@/components/customer/CustomerLoginDialog';
import type { FoodItemWithImages, ServiceType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Clock, ChevronRight } from 'lucide-react';
import { calculatePlatformMargin } from '@/lib/priceUtils';
import { useCookAllocatedItemIds } from '@/hooks/useCookAllocatedItems';

// Helper to calculate customer display price (base + margin)
const getCustomerPrice = (item: FoodItemWithImages): number => {
  const marginType = ((item as any).platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = (item as any).platform_margin_value || 0;
  const margin = calculatePlatformMargin(item.price, marginType, marginValue);
  return item.price + margin;
};

interface PopularItemsProps {
  serviceType: ServiceType;
  title: string;
  limit?: number;
  gradientClass?: string;
  bgGradient?: string;
}

const serviceTypeLabels: Record<ServiceType, string> = {
  indoor_events: 'Event Special',
  cloud_kitchen: "Chef's Choice",
  homemade: 'Home Fresh',
};

const PopularItems: React.FC<PopularItemsProps> = ({
  serviceType,
  title,
  limit = 6,
  gradientClass,
  bgGradient,
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { selectedPanchayat } = useLocation();
  const { requireAuth, showLoginDialog, setShowLoginDialog, onLoginSuccess } = useAuthCheck();
  const { data: allocatedIds } = useCookAllocatedItemIds();
  const [items, setItems] = useState<FoodItemWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        let query = supabase
          .from('food_items')
          .select(`
            *,
            images:food_item_images(*)
          `)
          .eq('is_available', true)
          .or(`service_type.eq.${serviceType},service_types.cs.{${serviceType}}`);

        if (selectedPanchayat) {
          query = query.or(
            `available_all_panchayats.eq.true,available_panchayat_ids.cs.{${selectedPanchayat.id}}`
          );
        }

        const { data, error } = await query.limit(limit);

        if (error) throw error;
        // For homemade items, only show those allocated to an active cook
        let filtered = data as FoodItemWithImages[];
        if (serviceType === 'homemade' && allocatedIds) {
          filtered = filtered.filter(item => allocatedIds.has(item.id));
        }
        setItems(filtered);
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [serviceType, limit, selectedPanchayat, allocatedIds]);

  const handleAddToCart = async (e: React.MouseEvent, item: FoodItemWithImages) => {
    e.stopPropagation();
    requireAuth(() => addToCart(item.id));
  };

  const handleItemClick = (itemId: string) => {
    requireAuth(() => navigate(`/item/${itemId}`));
  };

  if (isLoading) {
    return (
      <section className="py-4">
        <div className="mb-4 flex items-center justify-between px-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 w-40 flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className={`py-4 ${bgGradient || ''}`}>
      <div className="mb-4 flex items-center justify-between px-4">
        <h2 className={`font-display text-lg font-semibold ${gradientClass || 'text-foreground'}`}>
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => navigate(`/menu/${serviceType}`)}
        >
          See More
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
        {items.map((item) => {
          const primaryImage = item.images?.find((img) => img.is_primary) || item.images?.[0];
          const isIndoorEvents = serviceType === 'indoor_events';

          return (
            <Card
              key={item.id}
              className="w-40 flex-shrink-0 cursor-pointer overflow-hidden transition-all hover:shadow-lg"
              onClick={() =>
                isIndoorEvents
                  ? requireAuth(() => navigate('/indoor-events'))
                  : handleItemClick(item.id)
              }
            >
              <div className="relative h-28 w-full overflow-hidden bg-secondary">
                {primaryImage ? (
                  <img
                    src={primaryImage.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-xs font-medium">
                  {serviceTypeLabels[serviceType]}
                </span>
              </div>
              <CardContent className="p-3">
                <h3 className="line-clamp-2 text-sm font-medium leading-tight">{item.name}</h3>
                {item.preparation_time_minutes && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{item.preparation_time_minutes} min</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold text-foreground">₹{getCustomerPrice(item).toFixed(0)}</span>
                  {isIndoorEvents ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full border-indoor-events text-indoor-events text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        requireAuth(() => navigate('/indoor-events'));
                      }}
                    >
                      Book
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      onClick={(e) => handleAddToCart(e, item)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CustomerLoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLoginSuccess={onLoginSuccess}
      />
    </section>
  );
};

export default PopularItems;
