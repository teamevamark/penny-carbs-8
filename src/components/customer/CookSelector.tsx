import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChefHat, Star, Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { calculatePlatformMargin } from '@/lib/priceUtils';

export interface CookImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface CookOption {
  cook_id: string;
  kitchen_name: string;
  rating: number | null;
  total_orders: number | null;
  custom_price: number | null;
  features?: string[];
  images?: CookImage[];
}

interface CookSelectorProps {
  cooks: CookOption[];
  selectedCookId: string | null;
  onSelectCook: (cookId: string) => void;
  basePrice?: number;
  platformMarginType?: 'percent' | 'fixed';
  platformMarginValue?: number;
}

const CookSelector: React.FC<CookSelectorProps> = ({ cooks, selectedCookId, onSelectCook, basePrice, platformMarginType = 'percent', platformMarginValue = 0 }) => {
  const [lightboxImages, setLightboxImages] = useState<CookImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (cooks.length === 0) return null;
  if (cooks.length === 1) return null;

  const getCustomerPrice = (cookPrice: number) => {
    const margin = calculatePlatformMargin(cookPrice, platformMarginType, platformMarginValue);
    return cookPrice + margin;
  };

  const openLightbox = (images: CookImage[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <ChefHat className="h-4 w-4 text-primary" />
        <span>Choose your cook</span>
      </div>
      <RadioGroup value={selectedCookId || ''} onValueChange={onSelectCook}>
        <div className="space-y-2">
          {cooks.map((cook) => {
            const rawPrice = cook.custom_price ?? basePrice;
            const displayPrice = rawPrice != null ? getCustomerPrice(rawPrice) : null;
            const cookImages = cook.images?.sort((a, b) => a.display_order - b.display_order) || [];
            return (
              <div
                key={cook.cook_id}
                className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                  selectedCookId === cook.cook_id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => onSelectCook(cook.cook_id)}
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={cook.cook_id} id={cook.cook_id} />
                  <Label htmlFor={cook.cook_id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{cook.kitchen_name}</span>
                      {displayPrice != null && (
                        <span className="font-bold text-primary">₹{displayPrice.toFixed(0)}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      {cook.rating != null && cook.rating > 0 ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {cook.rating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground/60">
                          <Star className="h-3 w-3" />
                          No ratings
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        🛒 {cook.total_orders ?? 0} orders
                      </span>
                    </div>
                    {cook.features && cook.features.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {cook.features.map((feature, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-amber-300 text-amber-700 bg-amber-50">
                            <Sparkles className="h-2.5 w-2.5" />
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Label>
                </div>
                {cookImages.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pl-8">
                    {cookImages.map((img) => (
                      <img
                        key={img.id}
                        src={img.image_url}
                        alt={`${cook.kitchen_name} dish`}
                        className="h-16 w-16 rounded-md object-cover border flex-shrink-0"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
};

export default CookSelector;
