import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Leaf, Plus, Minus, ChefHat, Star } from 'lucide-react';
import type { CustomerCloudKitchenItem } from '@/hooks/useCustomerCloudKitchen';
import { calculatePlatformMargin } from '@/lib/priceUtils';

// Helper to calculate customer display price (base + margin)
const getCustomerPrice = (item: CustomerCloudKitchenItem): number => {
  const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = item.platform_margin_value || 0;
  const margin = calculatePlatformMargin(item.price, marginType, marginValue);
  return item.price + margin;
};

interface SetItemCardProps {
  item: CustomerCloudKitchenItem;
  quantity: number;
  onQuantityChange: (newQuantity: number) => void;
}

const SetItemCard: React.FC<SetItemCardProps> = ({
  item,
  quantity,
  onQuantityChange,
}) => {
  const setSize = item.set_size || 1;
  const minSets = item.min_order_sets || 1;
  const customerPrice = getCustomerPrice(item);
  const pricePerSet = customerPrice * setSize;
  const totalPieces = quantity * setSize;

  const handleDecrease = () => {
    if (quantity > 0) {
      const newQty = quantity - 1;
      // If decreasing below minimum and not zero, set to zero
      if (newQty < minSets && newQty !== 0) {
        onQuantityChange(0);
      } else {
        onQuantityChange(newQty);
      }
    }
  };

  const handleIncrease = () => {
    if (quantity === 0) {
      // Start with minimum sets
      onQuantityChange(minSets);
    } else {
      onQuantityChange(quantity + 1);
    }
  };

  const primaryImage = item.images?.find((img) => img.is_primary)?.image_url ||
    item.images?.[0]?.image_url;

  return (
    <Card className={`overflow-hidden ${!item.is_orderable ? 'opacity-60' : ''}`}>
      <div className="flex">
        {/* Image */}
        <div className="w-28 h-32 bg-muted flex-shrink-0 relative">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {!item.is_orderable && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1">
                {item.is_vegetarian && (
                  <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />
                )}
                <h3 className="font-semibold text-sm line-clamp-1">{item.name}</h3>
              </div>
            </div>

            {/* Cook Info - only show if cook exists */}
            {item.cook ? (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <ChefHat className="h-3 w-3" />
                <span className="font-medium text-foreground">{item.cook.kitchen_name}</span>
                {item.cook.rating && (
                  <span className="flex items-center gap-0.5 ml-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {item.cook.rating.toFixed(1)}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <ChefHat className="h-3 w-3" />
                <span>No cook available</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="outline" className="text-xs">
                {setSize} pcs/set
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Min {minSets} sets
              </Badge>
            </div>

            <p className="text-sm font-bold text-primary mt-1">
              ₹{pricePerSet}/set
            </p>
          </div>

          {/* Quantity Controls - only show if orderable */}
          {item.is_orderable ? (
            <div className="flex items-center justify-between mt-2">
              {quantity > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalPieces} pcs total
                </span>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {quantity > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleDecrease}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleIncrease}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={handleIncrease}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Not available for order
              </Badge>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default SetItemCard;
