ALTER TABLE public.google_maps_api_keys
  ADD COLUMN api_key TEXT NOT NULL DEFAULT '';

ALTER TABLE public.google_maps_api_keys
  ALTER COLUMN api_key DROP DEFAULT;

ALTER TABLE public.google_maps_api_keys
  DROP COLUMN secret_name;

-- Allow any authenticated user to read ACTIVE keys so the map can load app-wide.
-- Super admins keep their own broader SELECT policy from the previous migration.
CREATE POLICY "Authenticated users can read active gmaps keys"
  ON public.google_maps_api_keys
  FOR SELECT
  TO authenticated
  USING (is_active = true);