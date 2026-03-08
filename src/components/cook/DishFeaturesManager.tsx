import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, X, Sparkles } from 'lucide-react';

interface DishFeaturesManagerProps {
  cookDishId: string;
}

const SUGGESTED_FEATURES = [
  'Home Ground Masala',
  'Extra Spicy',
  'Less Oil',
  'No MSG',
  'Fresh Ingredients',
  'Traditional Recipe',
  'Wood Fire Cooked',
  'Organic',
  'Sugar Free',
  'Gluten Free',
];

const DishFeaturesManager: React.FC<DishFeaturesManagerProps> = ({ cookDishId }) => {
  const queryClient = useQueryClient();
  const [newFeature, setNewFeature] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['cook-dish-features', cookDishId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cook_dish_features')
        .select('*')
        .eq('cook_dish_id', cookDishId)
        .order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const addFeature = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (features.some(f => f.feature_text.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: 'Feature already added', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase
        .from('cook_dish_features')
        .insert({ cook_dish_id: cookDishId, feature_text: trimmed, display_order: features.length });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['cook-dish-features', cookDishId] });
      setNewFeature('');
      toast({ title: 'Feature added' });
    } catch (err: any) {
      toast({ title: 'Failed to add', description: err.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const removeFeature = async (id: string) => {
    try {
      const { error } = await supabase.from('cook_dish_features').delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['cook-dish-features', cookDishId] });
      toast({ title: 'Feature removed' });
    } catch (err: any) {
      toast({ title: 'Failed to remove', description: err.message, variant: 'destructive' });
    }
  };

  const unusedSuggestions = SUGGESTED_FEATURES.filter(
    s => !features.some(f => f.feature_text.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="mt-2 space-y-2">
      {/* Existing features */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {features.map(f => (
            <Badge key={f.id} variant="secondary" className="gap-1 text-xs pr-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {f.feature_text}
              <button
                onClick={() => removeFeature(f.id)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {showInput ? (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <Input
              placeholder="e.g. Home Ground Masala"
              value={newFeature}
              onChange={e => setNewFeature(e.target.value)}
              className="h-7 text-xs"
              onKeyDown={e => e.key === 'Enter' && addFeature(newFeature)}
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={() => addFeature(newFeature)} disabled={adding || !newFeature.trim()}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowInput(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          {unusedSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {unusedSuggestions.slice(0, 5).map(s => (
                <button
                  key={s}
                  onClick={() => addFeature(s)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 text-primary"
          onClick={() => setShowInput(true)}
        >
          <Plus className="h-3 w-3" />
          Add Features
        </Button>
      )}
    </div>
  );
};

export default DishFeaturesManager;
