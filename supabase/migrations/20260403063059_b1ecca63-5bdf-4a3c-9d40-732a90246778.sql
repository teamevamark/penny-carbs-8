
-- Add youtube_video_url to cook_dishes
ALTER TABLE public.cook_dishes ADD COLUMN youtube_video_url text DEFAULT NULL;

-- Create cook_dish_images table
CREATE TABLE public.cook_dish_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cook_dish_id uuid NOT NULL REFERENCES public.cook_dishes(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cook_dish_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view cook dish images"
ON public.cook_dish_images FOR SELECT
USING (true);

-- Cooks can manage their own dish images
CREATE POLICY "Cooks can manage their own dish images"
ON public.cook_dish_images FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.cook_dishes cd
    JOIN public.cooks c ON c.id = cd.cook_id
    WHERE cd.id = cook_dish_images.cook_dish_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cook_dishes cd
    JOIN public.cooks c ON c.id = cd.cook_id
    WHERE cd.id = cook_dish_images.cook_dish_id AND c.user_id = auth.uid()
  )
);

-- Admins can manage all
CREATE POLICY "Admins can manage all cook dish images"
ON public.cook_dish_images FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
