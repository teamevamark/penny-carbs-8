import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { useCookAllocatedDishes, useCookDishRequests, useSubmitDishRequest } from '@/hooks/useCookDishes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { 
  UtensilsCrossed, 
  Plus, 
  Leaf, 
  Clock, 
  Check, 
  X,
  ChefHat
} from 'lucide-react';
import { format } from 'date-fns';

const newDishSchema = z.object({
  dish_name: z.string().min(2, 'Dish name is required').max(100),
  dish_description: z.string().max(500).optional(),
  dish_price: z.number().min(1, 'Price must be at least ₹1'),
  dish_preparation_time_minutes: z.number().min(1).max(480).optional(),
  dish_is_vegetarian: z.boolean(),
  dish_category_id: z.string().optional(),
});

type NewDishFormData = z.infer<typeof newDishSchema>;

const DishRequestForm: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<'existing' | 'new'>('existing');
  const [selectedExistingDish, setSelectedExistingDish] = useState<string>('');

  const { data: allocatedDishes, isLoading: allocatedLoading } = useCookAllocatedDishes();
  const { data: dishRequests, isLoading: requestsLoading } = useCookDishRequests();
  const submitRequest = useSubmitDishRequest();

  // Fetch all food items for existing dish selection
  const { data: allFoodItems } = useQuery({
    queryKey: ['all-food-items-for-request'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_items')
        .select('id, name, price, is_vegetarian')
        .eq('is_available', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['food-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<NewDishFormData>({
    resolver: zodResolver(newDishSchema),
    defaultValues: {
      dish_name: '',
      dish_description: '',
      dish_price: 0,
      dish_preparation_time_minutes: 30,
      dish_is_vegetarian: false,
      dish_category_id: '',
    },
  });

  // Filter out already allocated and pending request dishes
  const allocatedIds = new Set(allocatedDishes?.map(d => d.food_item_id) || []);
  const pendingRequestIds = new Set(
    dishRequests?.filter(r => r.status === 'pending' && r.food_item_id).map(r => r.food_item_id!) || []
  );
  const availableDishes = allFoodItems?.filter(
    item => !allocatedIds.has(item.id) && !pendingRequestIds.has(item.id)
  ) || [];

  const handleSubmitExisting = async () => {
    if (!selectedExistingDish) {
      toast({ title: 'Please select a dish', variant: 'destructive' });
      return;
    }

    try {
      await submitRequest.mutateAsync({ food_item_id: selectedExistingDish });
      toast({ title: 'Request submitted', description: 'Admin will review your request soon.' });
      setSelectedExistingDish('');
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmitNew = async (data: NewDishFormData) => {
    try {
      await submitRequest.mutateAsync({
        dish_name: data.dish_name,
        dish_description: data.dish_description,
        dish_price: data.dish_price,
        dish_preparation_time_minutes: data.dish_preparation_time_minutes,
        dish_is_vegetarian: data.dish_is_vegetarian,
        dish_category_id: data.dish_category_id || undefined,
      });
      toast({ title: 'Request submitted', description: 'Admin will review and create this dish.' });
      form.reset();
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    }
  };

  const pendingRequests = dishRequests?.filter(r => r.status === 'pending') || [];
  const processedRequests = dishRequests?.filter(r => r.status !== 'pending') || [];

  return (
    <div className="space-y-4">
      {/* My Allocated Dishes */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              My Allocated Dishes ({allocatedDishes?.length || 0})
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Request Dish
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Request a Dish</DialogTitle>
                </DialogHeader>
                <Tabs value={requestType} onValueChange={(v) => setRequestType(v as any)}>
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="existing">Existing Dish</TabsTrigger>
                    <TabsTrigger value="new">New Dish</TabsTrigger>
                  </TabsList>

                  <TabsContent value="existing" className="space-y-4 mt-4">
                    <Select value={selectedExistingDish} onValueChange={setSelectedExistingDish}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a dish..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDishes.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} {item.is_vegetarian && '🌿'} - ₹{item.price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="w-full"
                      onClick={handleSubmitExisting}
                      disabled={!selectedExistingDish || submitRequest.isPending}
                    >
                      Submit Request
                    </Button>
                  </TabsContent>

                  <TabsContent value="new" className="space-y-4 mt-4">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmitNew)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="dish_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dish Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Chicken Biriyani" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dish_description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Brief description of the dish..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dish_price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price (₹) *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="dish_preparation_time_minutes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Prep Time (min)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="30"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="dish_category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories?.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="dish_is_vegetarian"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex items-center gap-2">
                                <Leaf className="h-4 w-4 text-green-600" />
                                <FormLabel className="!mt-0">Vegetarian</FormLabel>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button type="submit" className="w-full" disabled={submitRequest.isPending}>
                          Submit Request
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {allocatedLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : allocatedDishes?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No dishes allocated yet. Request dishes to get started.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allocatedDishes?.map(dish => (
                <Badge key={dish.id} variant="secondary" className="py-1.5 px-3">
                  {dish.food_item?.is_vegetarian && <Leaf className="h-3 w-3 mr-1 text-green-600" />}
                  {dish.food_item?.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Requests */}
      {(pendingRequests.length > 0 || processedRequests.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              My Dish Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requestsLoading ? (
              <Skeleton className="h-20" />
            ) : (
              <>
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-sm">
                          {req.food_item?.name || req.dish_name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested {format(new Date(req.created_at), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-yellow-700">Pending</Badge>
                  </div>
                ))}
                {processedRequests.slice(0, 5).map(req => (
                  <div 
                    key={req.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      req.status === 'approved' ? 'bg-green-50/50' : 'bg-red-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {req.status === 'approved' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          {req.food_item?.name || req.dish_name}
                        </span>
                      </div>
                      {req.admin_notes && (
                        <p className="text-xs text-muted-foreground mt-1">{req.admin_notes}</p>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={req.status === 'approved' ? 'text-green-700' : 'text-red-700'}
                    >
                      {req.status === 'approved' ? 'Approved' : 'Rejected'}
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DishRequestForm;
