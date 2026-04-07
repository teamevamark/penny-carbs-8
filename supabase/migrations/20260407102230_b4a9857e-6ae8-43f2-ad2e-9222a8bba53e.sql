
ALTER TABLE public.delivery_rules ADD COLUMN IF NOT EXISTS base_distance_km numeric NOT NULL DEFAULT 5;

ALTER TABLE public.cooks ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.cooks ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_distance_km numeric;
