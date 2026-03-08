
-- Create cook_dish_features table for cooks to add feature tags to their dishes
CREATE TABLE public.cook_dish_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_dish_id uuid NOT NULL REFERENCES public.cook_dishes(id) ON DELETE CASCADE,
  feature_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent duplicate features per dish
ALTER TABLE public.cook_dish_features ADD CONSTRAINT unique_cook_dish_feature UNIQUE (cook_dish_id, feature_text);

-- Enable RLS
ALTER TABLE public.cook_dish_features ENABLE ROW LEVEL SECURITY;

-- Anyone can view features (shown on customer UI)
CREATE POLICY "Anyone can view cook dish features"
  ON public.cook_dish_features FOR SELECT
  USING (true);

-- Cooks can manage their own dish features
CREATE POLICY "Cooks can manage their dish features"
  ON public.cook_dish_features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cook_dishes cd
      JOIN public.cooks c ON c.id = cd.cook_id
      WHERE cd.id = cook_dish_features.cook_dish_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cook_dishes cd
      JOIN public.cooks c ON c.id = cd.cook_id
      WHERE cd.id = cook_dish_features.cook_dish_id AND c.user_id = auth.uid()
    )
  );

-- Admins can manage all features
CREATE POLICY "Admins can manage cook dish features"
  ON public.cook_dish_features FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
