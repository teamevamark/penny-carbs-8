
CREATE TABLE public.service_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.service_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service modules"
  ON public.service_modules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage service modules"
  ON public.service_modules FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.service_modules (service_type, name, is_active) VALUES
  ('indoor_events', 'Indoor Events', true),
  ('cloud_kitchen', 'Cloud Kitchen', true),
  ('homemade', 'Home Food Delivery', true);
