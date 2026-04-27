ALTER TABLE public.admin_permissions
  ADD COLUMN IF NOT EXISTS perm_users text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS perm_storage text NOT NULL DEFAULT 'none';

ALTER TABLE public.admin_permissions
  DROP CONSTRAINT IF EXISTS chk_perm_values;

ALTER TABLE public.admin_permissions
  ADD CONSTRAINT chk_perm_values CHECK (
    perm_items = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_orders = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_assign_orders = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_cooks = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_delivery_staff = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_reports = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_settlements = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_categories = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_banners = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_locations = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_special_offers = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_users = ANY (ARRAY['none'::text, 'read'::text, 'write'::text]) AND
    perm_storage = ANY (ARRAY['none'::text, 'read'::text, 'write'::text])
  );