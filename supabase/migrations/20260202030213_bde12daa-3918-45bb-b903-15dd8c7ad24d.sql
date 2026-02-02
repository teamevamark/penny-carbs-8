-- Table for dishes allocated to cooks (approved dishes they can make)
CREATE TABLE public.cook_dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_id uuid NOT NULL REFERENCES public.cooks(id) ON DELETE CASCADE,
  food_item_id uuid NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  allocated_at timestamp with time zone NOT NULL DEFAULT now(),
  allocated_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(cook_id, food_item_id)
);

-- Table for dish requests from cooks (including new dish suggestions)
CREATE TABLE public.cook_dish_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cook_id uuid NOT NULL REFERENCES public.cooks(id) ON DELETE CASCADE,
  -- If requesting an existing dish
  food_item_id uuid NULL REFERENCES public.food_items(id) ON DELETE SET NULL,
  -- For new dish requests
  dish_name text NULL,
  dish_description text NULL,
  dish_price numeric NULL,
  dish_preparation_time_minutes integer NULL,
  dish_is_vegetarian boolean NULL DEFAULT false,
  dish_category_id uuid NULL REFERENCES public.food_categories(id) ON DELETE SET NULL,
  -- Request status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text NULL,
  reviewed_by uuid NULL,
  reviewed_at timestamp with time zone NULL,
  -- If approved and new dish created
  created_food_item_id uuid NULL REFERENCES public.food_items(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cook_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cook_dish_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cook_dishes
CREATE POLICY "Admins can manage cook dishes"
  ON public.cook_dishes FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cooks can view their own allocated dishes"
  ON public.cook_dishes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cooks c
    WHERE c.id = cook_dishes.cook_id AND c.user_id = auth.uid()
  ));

-- RLS Policies for cook_dish_requests
CREATE POLICY "Admins can manage dish requests"
  ON public.cook_dish_requests FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Cooks can view their own requests"
  ON public.cook_dish_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cooks c
    WHERE c.id = cook_dish_requests.cook_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Cooks can create their own requests"
  ON public.cook_dish_requests FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cooks c
    WHERE c.id = cook_dish_requests.cook_id AND c.user_id = auth.uid()
  ));

-- Update triggers
CREATE TRIGGER update_cook_dishes_updated_at
  BEFORE UPDATE ON public.cook_dishes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cook_dish_requests_updated_at
  BEFORE UPDATE ON public.cook_dish_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_cook_dishes_cook_id ON public.cook_dishes(cook_id);
CREATE INDEX idx_cook_dishes_food_item_id ON public.cook_dishes(food_item_id);
CREATE INDEX idx_cook_dish_requests_cook_id ON public.cook_dish_requests(cook_id);
CREATE INDEX idx_cook_dish_requests_status ON public.cook_dish_requests(status);