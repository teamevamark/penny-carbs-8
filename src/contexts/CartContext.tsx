import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { CartItem, FoodItemWithImages } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { calculatePlatformMargin } from '@/lib/priceUtils';

interface CartItemWithCook extends CartItem {
  selected_cook_id?: string | null;
  cook_custom_price?: number | null;
}

interface CartContextType {
  items: CartItemWithCook[];
  isLoading: boolean;
  itemCount: number;
  totalAmount: number;
  addToCart: (foodItemId: string, quantity?: number, selectedCookId?: string | null) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemWithCook[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCart = async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          food_item:food_items(
            *,
            images:food_item_images(*)
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching cart:', error);
        return;
      }

      let cartItems: CartItemWithCook[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        food_item_id: item.food_item_id,
        quantity: item.quantity,
        created_at: item.created_at,
        updated_at: item.updated_at,
        food_item: item.food_item as FoodItemWithImages,
        selected_cook_id: item.selected_cook_id,
        cook_custom_price: null,
      }));

      // Fetch cook custom prices for items with selected_cook_id
      const itemsWithCook = cartItems.filter(ci => ci.selected_cook_id);
      if (itemsWithCook.length > 0) {
        const cookIds = [...new Set(itemsWithCook.map(ci => ci.selected_cook_id!))];
        const foodItemIds = [...new Set(itemsWithCook.map(ci => ci.food_item_id))];
        const { data: cookDishes } = await supabase
          .from('cook_dishes')
          .select('cook_id, food_item_id, custom_price')
          .in('cook_id', cookIds)
          .in('food_item_id', foodItemIds);

        if (cookDishes) {
          const priceMap = new Map<string, number | null>();
          cookDishes.forEach(cd => {
            priceMap.set(`${cd.cook_id}_${cd.food_item_id}`, cd.custom_price);
          });
          cartItems = cartItems.map(ci => ({
            ...ci,
            cook_custom_price: ci.selected_cook_id
              ? priceMap.get(`${ci.selected_cook_id}_${ci.food_item_id}`) ?? null
              : null,
          }));
        }
      }

      setItems(cartItems);
    } catch (error) {
      console.error('Error in fetchCart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (foodItemId: string, quantity = 1, selectedCookId?: string | null) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = items.find(item => item.food_item_id === foodItemId);

      if (existingItem) {
        // Update quantity and cook selection if provided
        const { error } = await supabase
          .from('cart_items')
          .update({ 
            quantity: existingItem.quantity + quantity,
            ...(selectedCookId !== undefined && { selected_cook_id: selectedCookId }),
          })
          .eq('id', existingItem.id);

        if (error) throw error;

        toast({
          title: "Updated cart",
          description: "Item quantity updated",
        });

        await fetchCart();
      } else {
        // Insert new item with selected cook
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            food_item_id: foodItemId,
            quantity,
            selected_cook_id: selectedCookId || null,
          });

        if (error) {
          throw error;
        }

        toast({
          title: "Added to cart",
          description: "Item has been added to your cart",
        });

        await fetchCart();
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) {
      await removeFromCart(cartItemId);
      return;
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) {
        throw error;
      }

      setItems(prev =>
        prev.map(item =>
          item.id === cartItemId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) {
        throw error;
      }

      setItems(prev => prev.filter(item => item.id !== cartItemId));

      toast({
        title: "Removed",
        description: "Item removed from cart",
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  const totalAmount = items.reduce((sum, item) => {
    // Use cook's custom price if available, otherwise base price
    const effectiveBasePrice = item.cook_custom_price ?? item.food_item?.price ?? 0;
    const marginType = (item.food_item?.platform_margin_type || 'percent') as 'percent' | 'fixed';
    const marginValue = item.food_item?.platform_margin_value || 0;
    const margin = calculatePlatformMargin(effectiveBasePrice, marginType, marginValue);
    const customerPrice = effectiveBasePrice + margin;
    return sum + (customerPrice * item.quantity);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoading,
        itemCount,
        totalAmount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
