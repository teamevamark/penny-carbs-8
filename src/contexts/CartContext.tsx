import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { CartItem, FoodItemWithImages } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { calculatePlatformMargin } from '@/lib/priceUtils';

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  itemCount: number;
  totalAmount: number;
  addToCart: (foodItemId: string, quantity?: number) => Promise<void>;
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
  const [items, setItems] = useState<CartItem[]>([]);
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

      const cartItems: CartItem[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        food_item_id: item.food_item_id,
        quantity: item.quantity,
        created_at: item.created_at,
        updated_at: item.updated_at,
        food_item: item.food_item as FoodItemWithImages,
      }));

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

  const addToCart = async (foodItemId: string, quantity = 1) => {
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
        // Update quantity
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Insert new item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            food_item_id: foodItemId,
            quantity,
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
    const basePrice = item.food_item?.price || 0;
    const marginType = (item.food_item?.platform_margin_type || 'percent') as 'percent' | 'fixed';
    const marginValue = item.food_item?.platform_margin_value || 0;
    const margin = calculatePlatformMargin(basePrice, marginType, marginValue);
    const customerPrice = basePrice + margin;
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
