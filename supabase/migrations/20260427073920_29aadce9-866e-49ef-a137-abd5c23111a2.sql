-- Delete all order-related data (test cleanup). Order matters due to FKs.
DELETE FROM public.wallet_transactions;
DELETE FROM public.referrals;
DELETE FROM public.order_ratings;
DELETE FROM public.indoor_event_vehicles;
DELETE FROM public.order_assigned_cooks;
DELETE FROM public.order_items;
DELETE FROM public.orders;

-- Reset delivery wallets
UPDATE public.delivery_wallets
SET collected_amount = 0,
    job_earnings = 0,
    total_settled = 0,
    updated_at = now();

-- Reset cook order counters
UPDATE public.cooks
SET total_orders = 0,
    updated_at = now();

-- Reset delivery staff delivery counters
UPDATE public.delivery_staff
SET total_deliveries = 0,
    updated_at = now();

-- Clear customer wallet transactions and reset balances
DELETE FROM public.customer_wallet_transactions;
UPDATE public.customer_wallets
SET balance = 0,
    total_credited = 0,
    total_withdrawn = 0,
    updated_at = now();