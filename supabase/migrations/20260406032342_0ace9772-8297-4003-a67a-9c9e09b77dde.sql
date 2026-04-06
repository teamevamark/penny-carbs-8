-- Add lat/lng to customer_addresses
ALTER TABLE public.customer_addresses
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;

-- Add delivery lat/lng to orders
ALTER TABLE public.orders
ADD COLUMN delivery_latitude double precision,
ADD COLUMN delivery_longitude double precision;