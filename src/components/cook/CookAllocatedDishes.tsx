import React, { useState } from 'react';
import { useCookAllocatedDishes } from '@/hooks/useCookDishes';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { ChefHat, Leaf, IndianRupee, Check, X } from 'lucide-react';
import DishFeaturesManager from './DishFeaturesManager';
import DishMediaManager from './DishMediaManager';

const CookAllocatedDishes: React.FC = () => {
  const { data: allocatedDishes, isLoading } = useCookAllocatedDishes();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (dishId: string, currentPrice: number | null, basePrice: number) => {
    setEditingId(dishId);
    setEditPrice(String(currentPrice ?? basePrice));
  };

  const handleSavePrice = async (dishId: string, basePrice: number) => {
    setSaving(true);
    try {
      const newPrice = parseFloat(editPrice);
      if (isNaN(newPrice) || newPrice < 1) {
        toast({ title: 'Invalid price', description: 'Price must be at least ₹1', variant: 'destructive' });
        return;
      }
      const customPrice = newPrice === basePrice ? null : newPrice;
      const { error } = await supabase
        .from('cook_dishes')
        .update({ custom_price: customPrice })
        .eq('id', dishId);
      if (error) throw error;
      toast({ title: 'Price updated' });
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
      setEditingId(null);
    } catch (error: any) {
      toast({ title: 'Failed to update price', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComingSoon = async (dishId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('cook_dishes')
        .update({ is_coming_soon: !currentValue })
        .eq('id', dishId);
      if (error) throw error;
      toast({ title: !currentValue ? 'Marked as Coming Soon' : 'Removed Coming Soon' });
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
    } catch (error: any) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    }
  };

  const handleImageUpload = async (cookDishId: string, imageUrl: string) => {
    try {
      const { error } = await supabase
        .from('cook_dish_images')
        .insert({
          cook_dish_id: cookDishId,
          image_url: imageUrl,
          display_order: 0,
        });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
    } catch (error: any) {
      toast({ title: 'Failed to save image', description: error.message, variant: 'destructive' });
    }
  };

  const handleImageRemove = async (cookDishId: string) => {
    try {
      const { error } = await supabase
        .from('cook_dish_images')
        .delete()
        .eq('cook_dish_id', cookDishId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['cook-allocated-dishes'] });
    } catch (error: any) {
      toast({ title: 'Failed to remove image', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ChefHat className="h-4 w-4" />
          My Allocated Dishes ({allocatedDishes?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : allocatedDishes?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No dishes allocated yet.
          </p>
        ) : (
          <div className="space-y-2">
            {allocatedDishes?.map(dish => {
              const basePrice = dish.food_item?.price || 0;
              const isEditing = editingId === dish.id;
              const displayPrice = dish.custom_price ?? basePrice;
              const currentImage = dish.images?.[0]?.image_url || null;

              return (
                <div key={dish.id} className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{dish.food_item?.name}</span>
                          {dish.food_item?.is_vegetarian && (
                            <Badge variant="outline" className="text-xs border-green-600 shrink-0">
                              <Leaf className="h-3 w-3 mr-0.5 text-green-600" />
                              Veg
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Base: ₹{basePrice} • {dish.food_item?.category?.name || 'Uncategorized'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Switch
                            checked={dish.is_coming_soon}
                            onCheckedChange={() => handleToggleComingSoon(dish.id, dish.is_coming_soon)}
                            className="scale-75 origin-left"
                          />
                          <span className="text-[10px] text-muted-foreground">Coming Soon</span>
                        </div>
                        <DishFeaturesManager cookDishId={dish.id} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3 text-muted-foreground" />
                            <Input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-20 h-8 text-sm"
                              min={1}
                              autoFocus
                            />
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSavePrice(dish.id, basePrice)} disabled={saving}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => handleStartEdit(dish.id, dish.custom_price, basePrice)}
                        >
                          <IndianRupee className="h-3 w-3" />
                          {displayPrice}
                          {dish.custom_price != null && dish.custom_price !== basePrice && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Custom</Badge>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-1">Dish Image</p>
                    <ImageUpload
                      bucket="food-items"
                      folder={`cook-dishes/${dish.id}`}
                      currentImageUrl={currentImage}
                      onUploadComplete={(url) => handleImageUpload(dish.id, url)}
                      onRemove={() => handleImageRemove(dish.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CookAllocatedDishes;
