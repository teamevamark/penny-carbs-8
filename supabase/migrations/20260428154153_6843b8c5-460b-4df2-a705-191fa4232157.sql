CREATE TABLE public.google_maps_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  secret_name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_four TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_maps_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view gmaps keys"
  ON public.google_maps_api_keys
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert gmaps keys"
  ON public.google_maps_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update gmaps keys"
  ON public.google_maps_api_keys
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete gmaps keys"
  ON public.google_maps_api_keys
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_google_maps_api_keys_updated_at
  BEFORE UPDATE ON public.google_maps_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();