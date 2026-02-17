import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Leaf, Plus, Minus, ChefHat, Star, ChevronDown } from 'lucide-react';
import type { CustomerCloudKitchenItem } from '@/hooks/useCustomerCloudKitchen';
import { calculatePlatformMargin } from '@/lib/priceUtils';

const getCustomerPrice = (item: CustomerCloudKitchenItem): number => {
  const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = item.platform_margin_value || 0;
  const margin = calculatePlatformMargin(item.price, marginType, marginValue);
  return item.price + margin;
};

export interface GroupedFoodItem {
  id: string;
  name: string;
  description: string | null;
  is_vegetarian: boolean;
  set_size: number;
  min_order_sets: number;
  images: { id: string; image_url: string; is_primary: boolean }[];
  cooks: CustomerCloudKitchenItem[]; // All cook variants for this item
  hasNoCook: boolean; // True if no cook is allocated
}

interface CartItem {
  item: CustomerCloudKitchenItem;
  quantity: number;
}

interface SetItemCardProps {
  group: GroupedFoodItem;
  cart: Record<string, CartItem>; // keyed by unique_key
  onQuantityChange: (item: CustomerCloudKitchenItem, newQuantity: number) => void;
}

const SetItemCard: React.FC<SetItemCardProps> = ({
  group,
  cart,
  onQuantityChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const setSize = group.set_size || 1;
  const minSets = group.min_order_sets || 1;

  const primaryImage = group.images?.find((img) => img.is_primary)?.image_url ||
    group.images?.[0]?.image_url;

  const orderableCooks = group.cooks.filter(c => c.is_orderable);
  const totalSelected = orderableCooks.reduce((sum, c) => sum + (cart[c.unique_key]?.quantity || 0), 0);

  // Get price range for display
  const prices = orderableCooks.map(c => getCustomerPrice(c) * setSize);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  return (
    <Card className={`overflow-hidden ${group.hasNoCook ? 'opacity-60' : ''}`}>
      {/* Main item row */}
      <div className="flex">
        <div className="w-28 h-32 bg-muted flex-shrink-0 relative">
          {primaryImage ? (
            <img src={primaryImage} alt={group.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
          )}
          {group.hasNoCook && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
          )}
        </div>

        <CardContent className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1">
              {group.is_vegetarian && <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />}
              <h3 className="font-semibold text-sm line-clamp-1">{group.name}</h3>
            </div>

            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="outline" className="text-xs">{setSize} pcs/set</Badge>
              <Badge variant="secondary" className="text-xs">Min {minSets} sets</Badge>
            </div>

            {orderableCooks.length > 0 ? (
              <p className="text-sm font-bold text-primary mt-1">
                ₹{minPrice.toFixed(0)}{maxPrice !== minPrice ? ` - ₹${maxPrice.toFixed(0)}` : ''}/set
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">No cooks available</p>
            )}

            {orderableCooks.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <ChefHat className="h-3 w-3" />
                <span>{orderableCooks.length} kitchen{orderableCooks.length > 1 ? 's' : ''} available</span>
              </div>
            )}
          </div>

          {/* Expand/collapse cooks */}
          {orderableCooks.length > 0 && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                <span>
                  {totalSelected > 0
                    ? `${totalSelected} set${totalSelected > 1 ? 's' : ''} selected`
                    : 'Choose Kitchen'}
                </span>
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          )}

          {group.hasNoCook && (
            <Badge variant="outline" className="text-xs text-muted-foreground mt-2">
              Not available for order
            </Badge>
          )}
        </CardContent>
      </div>

      {/* Expanded cook selection */}
      {expanded && orderableCooks.length > 0 && (
        <div className="border-t bg-muted/30 p-3 space-y-2">
          {orderableCooks.map((cookItem) => {
            const quantity = cart[cookItem.unique_key]?.quantity || 0;
            const cookPrice = getCustomerPrice(cookItem) * setSize;
            const totalPieces = quantity * setSize;

            const handleDecrease = () => {
              if (quantity > 0) {
                const newQty = quantity - 1;
                onQuantityChange(cookItem, newQty < minSets && newQty !== 0 ? 0 : newQty);
              }
            };

            const handleIncrease = () => {
              onQuantityChange(cookItem, quantity === 0 ? minSets : quantity + 1);
            };

            return (
              <div key={cookItem.unique_key} className="flex items-center justify-between rounded-lg bg-background p-2.5 border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="font-medium text-sm truncate">{cookItem.cook?.kitchen_name}</span>
                    {cookItem.cook?.rating ? (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground flex-shrink-0">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {cookItem.cook.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-primary mt-0.5">₹{cookPrice.toFixed(0)}/set</p>
                </div>

                <div className="flex items-center gap-2 ml-2">
                  {quantity > 0 ? (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{totalPieces} pcs</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleDecrease}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-semibold text-sm">{quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleIncrease}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleIncrease}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default SetItemCard;
