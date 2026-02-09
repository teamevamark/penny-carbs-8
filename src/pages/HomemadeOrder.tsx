import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuthCheck } from '@/hooks/useAuthCheck';
import CustomerLoginDialog from '@/components/customer/CustomerLoginDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Clock, Search, Leaf, Filter } from 'lucide-react';
import CartButton from '@/components/customer/CartButton';
import BottomNav from '@/components/customer/BottomNav';
import { calculatePlatformMargin } from '@/lib/priceUtils';

interface HomemadeItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_vegetarian: boolean;
  preparation_time_minutes: number | null;
  category_id: string | null;
  platform_margin_type: string | null;
  platform_margin_value: number | null;
  images: { id: string; image_url: string; is_primary: boolean }[];
  category: { id: string; name: string } | null;
}

const getCustomerPrice = (item: HomemadeItem): number => {
  const marginType = (item.platform_margin_type || 'percent') as 'percent' | 'fixed';
  const marginValue = item.platform_margin_value || 0;
  const margin = calculatePlatformMargin(item.price, marginType, marginValue);
  return item.price + margin;
};

const HomemadeOrder: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { requireAuth, showLoginDialog, setShowLoginDialog, onLoginSuccess } = useAuthCheck();

  const [items, setItems] = useState<HomemadeItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Get all food_item_ids that have at least one active+available cook allocated
        const { data: cookDishes, error: cookDishesError } = await supabase
          .from('cook_dishes')
          .select(`
            food_item_id,
            cooks!inner(is_active, is_available)
          `);

        if (cookDishesError) throw cookDishesError;

        const allocatedItemIds = [...new Set(
          (cookDishes || [])
            .filter((cd: any) => cd.cooks?.is_active && cd.cooks?.is_available)
            .map((cd: any) => cd.food_item_id)
        )];

        if (allocatedItemIds.length === 0) {
          setItems([]);
          setIsLoading(false);
          return;
        }

        // 2. Fetch those food items that are homemade + available + allocated to a cook
        const { data: foodItems, error: itemsError } = await supabase
          .from('food_items')
          .select(`
            id, name, description, price, is_vegetarian, preparation_time_minutes,
            category_id, platform_margin_type, platform_margin_value,
            images:food_item_images(id, image_url, is_primary),
            category:food_categories(id, name)
          `)
          .or('service_types.cs.{homemade},service_type.eq.homemade')
          .eq('is_available', true)
          .in('id', allocatedItemIds)
          .order('name');

        if (itemsError) throw itemsError;

        setItems((foodItems || []) as unknown as HomemadeItem[]);

        // Extract unique categories from results
        const cats = new Map<string, string>();
        (foodItems || []).forEach((item: any) => {
          if (item.category?.id && item.category?.name) {
            cats.set(item.category.id, item.category.name);
          }
        });
        setCategories(Array.from(cats.entries()).map(([id, name]) => ({ id, name })));
      } catch (error) {
        console.error('Error fetching homemade items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddToCart = async (e: React.MouseEvent, item: HomemadeItem) => {
    e.stopPropagation();
    requireAuth(() => addToCart(item.id));
  };

  const handleItemClick = (itemId: string) => {
    requireAuth(() => navigate(`/item/${itemId}`));
  };

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return a.price - b.price;
        case 'price-high': return b.price - a.price;
        default: return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-lg font-semibold">🏠 Homemade Food</h1>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 border-t px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dishes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="flex-1">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price-low">Price: Low</SelectItem>
                <SelectItem value="price-high">Price: High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="p-4">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-6xl">🍽️</span>
            <h2 className="mt-4 text-lg font-semibold">No items available</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No homemade dishes are currently available
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0];
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer overflow-hidden transition-all hover:shadow-lg"
                  onClick={() => handleItemClick(item.id)}
                >
                  <div className="relative h-40 w-full overflow-hidden bg-secondary">
                    {primaryImage ? (
                      <img src={primaryImage.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl">🍲</div>
                    )}
                    {item.is_vegetarian && (
                      <Badge className="absolute left-2 top-2 gap-1 bg-success">
                        <Leaf className="h-3 w-3" /> Veg
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="line-clamp-1 font-semibold">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.preparation_time_minutes && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{item.preparation_time_minutes} min</span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold">₹{getCustomerPrice(item).toFixed(0)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        onClick={(e) => handleAddToCart(e, item)}
                      >
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <CartButton />
      <BottomNav />

      <CustomerLoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onLoginSuccess={onLoginSuccess}
      />
    </div>
  );
};

export default HomemadeOrder;
