import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCookDishes, useAllocateDishes, useRemoveDishAllocation } from '@/hooks/useCookDishes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { ChefHat, Plus, Trash2, UtensilsCrossed, Leaf, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Cook } from '@/types/cook';

interface CookDishesTabProps {
  cooks: Cook[] | undefined;
  cooksLoading: boolean;
}

const CookDishesTab: React.FC<CookDishesTabProps> = ({ cooks, cooksLoading }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCookId, setSelectedCookId] = useState<string | null>(null);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: cookDishes, isLoading: dishesLoading } = useAdminCookDishes(selectedCookId);
  const allocateMutation = useAllocateDishes();
  const removeMutation = useRemoveDishAllocation();

  // Fetch all food items for allocation
  const { data: allFoodItems } = useQuery({
    queryKey: ['all-food-items-for-allocation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('id, name, price, is_vegetarian, category:food_categories(name)')
        .eq('is_available', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const selectedCook = cooks?.find(c => c.id === selectedCookId);

  // Filter out already allocated dishes
  const allocatedIds = new Set(cookDishes?.map(d => d.food_item_id) || []);
  const availableDishes = allFoodItems?.filter(item => !allocatedIds.has(item.id)) || [];
  const filteredDishes = availableDishes.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAllocate = async () => {
    if (!selectedCookId || !user?.id || selectedDishes.length === 0) return;

    try {
      await allocateMutation.mutateAsync({
        cookId: selectedCookId,
        foodItemIds: selectedDishes,
        userId: user.id,
      });
      toast({ title: 'Dishes allocated successfully' });
      setSelectedDishes([]);
      setIsAllocateOpen(false);
    } catch (error: any) {
      toast({ title: 'Failed to allocate', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMutation.mutateAsync(id);
      toast({ title: 'Dish removed from cook' });
    } catch (error: any) {
      toast({ title: 'Failed to remove', description: error.message, variant: 'destructive' });
    }
  };

  const toggleDish = (id: string) => {
    setSelectedDishes(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Cook Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Select Cook to Manage Dishes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCookId || ''} onValueChange={setSelectedCookId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a cook..." />
            </SelectTrigger>
            <SelectContent>
              {cooks?.filter(c => c.is_active).map(cook => (
                <SelectItem key={cook.id} value={cook.id}>
                  {cook.kitchen_name} • {cook.mobile_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Allocated Dishes for Selected Cook */}
      {selectedCookId && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                {selectedCook?.kitchen_name}'s Allocated Dishes
              </CardTitle>
              <Dialog open={isAllocateOpen} onOpenChange={setIsAllocateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Allocate Dishes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Allocate Dishes to {selectedCook?.kitchen_name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search dishes..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-[300px] border rounded-lg p-3">
                      {filteredDishes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No dishes available
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredDishes.map(item => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedDishes.includes(item.id)}
                                onCheckedChange={() => toggleDish(item.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{item.name}</span>
                                  {item.is_vegetarian && (
                                    <Leaf className="h-3 w-3 text-green-600 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  ₹{item.price} • {(item.category as any)?.name || 'Uncategorized'}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {selectedDishes.length} selected
                      </span>
                      <Button onClick={handleAllocate} disabled={selectedDishes.length === 0 || allocateMutation.isPending}>
                        Allocate Selected
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {dishesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : cookDishes?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No dishes allocated yet. Click "Allocate Dishes" to add.
              </p>
            ) : (
              <div className="space-y-2">
                {cookDishes?.map(dish => (
                  <div key={dish.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <UtensilsCrossed className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{dish.food_item?.name}</span>
                          {dish.food_item?.is_vegetarian && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              <Leaf className="h-3 w-3 mr-1" />
                              Veg
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ₹{dish.food_item?.price} • {dish.food_item?.category?.name || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(dish.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedCookId && !cooksLoading && (
        <Card className="p-6 text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Select a cook to manage their allocated dishes</p>
        </Card>
      )}
    </div>
  );
};

export default CookDishesTab;
