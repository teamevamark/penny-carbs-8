import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface OrderItemForRating {
  id: string;
  food_item_id: string;
  assigned_cook_id: string | null;
  food_item: {
    name: string;
  };
}

interface OrderRatingProps {
  orderId: string;
  customerId: string;
  orderItems: OrderItemForRating[];
}

interface ExistingRating {
  order_item_id: string;
  rating: number;
  review_text: string | null;
}

const StarRating: React.FC<{
  rating: number;
  onRate: (rating: number) => void;
  readonly?: boolean;
}> = ({ rating, onRate, readonly }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => onRate(star)}
        className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
      >
        <Star
          className={`h-6 w-6 ${
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      </button>
    ))}
  </div>
);

const OrderRating: React.FC<OrderRatingProps> = ({ orderId, customerId, orderItems }) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [existingRatings, setExistingRatings] = useState<ExistingRating[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('order_ratings')
        .select('order_item_id, rating, review_text')
        .eq('order_id', orderId)
        .eq('customer_id', customerId);

      if (data && data.length > 0) {
        setExistingRatings(data);
        const r: Record<string, number> = {};
        const rv: Record<string, string> = {};
        data.forEach((d) => {
          r[d.order_item_id] = d.rating;
          rv[d.order_item_id] = d.review_text || '';
        });
        setRatings(r);
        setReviews(rv);
      }
      setIsLoading(false);
    };
    fetchExisting();
  }, [orderId, customerId]);

  const hasExisting = existingRatings.length > 0;

  const handleSubmit = async () => {
    const itemsToRate = orderItems.filter((item) => ratings[item.id]);
    if (itemsToRate.length === 0) {
      toast.error('Please rate at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const inserts = itemsToRate.map((item) => ({
        order_id: orderId,
        order_item_id: item.id,
        food_item_id: item.food_item_id,
        cook_id: item.assigned_cook_id,
        customer_id: customerId,
        rating: ratings[item.id],
        review_text: reviews[item.id] || null,
      }));

      const { error } = await supabase.from('order_ratings').upsert(inserts, {
        onConflict: 'order_item_id,customer_id',
      });

      if (error) throw error;
      toast.success('Thank you for your rating!');
      setExistingRatings(inserts.map((i) => ({
        order_item_id: i.order_item_id,
        rating: i.rating,
        review_text: i.review_text,
      })));
    } catch (err: any) {
      console.error('Rating error:', err);
      toast.error('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400" />
          {hasExisting ? 'Your Ratings' : 'Rate Your Order'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {orderItems.map((item) => (
          <div key={item.id} className="space-y-2">
            <p className="text-sm font-medium">{item.food_item?.name || 'Item'}</p>
            <StarRating
              rating={ratings[item.id] || 0}
              onRate={(r) => setRatings((prev) => ({ ...prev, [item.id]: r }))}
              readonly={hasExisting}
            />
            {!hasExisting && (
              <Textarea
                placeholder="Write a review (optional)"
                value={reviews[item.id] || ''}
                onChange={(e) =>
                  setReviews((prev) => ({ ...prev, [item.id]: e.target.value }))
                }
                className="text-sm h-16"
              />
            )}
            {hasExisting && reviews[item.id] && (
              <p className="text-xs text-muted-foreground italic">"{reviews[item.id]}"</p>
            )}
          </div>
        ))}
        {!hasExisting && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(ratings).length === 0}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderRating;
