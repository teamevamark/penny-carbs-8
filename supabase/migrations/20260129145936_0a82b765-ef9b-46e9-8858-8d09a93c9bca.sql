-- STEP 1: Create cooks table (Food Partners)
CREATE TABLE public.cooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kitchen_name TEXT NOT NULL UNIQUE,
  mobile_number TEXT NOT NULL,
  panchayat_id UUID REFERENCES public.panchayats(id),
  allowed_order_types TEXT[] NOT NULL DEFAULT ARRAY['indoor_events', 'cloud_kitchen', 'homemade'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 2: Create delivery_staff_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_staff_type') THEN
    CREATE TYPE delivery_staff_type AS ENUM ('fixed_salary', 'registered_partner');
  END IF;
END $$;

-- STEP 3: Create delivery_staff table
CREATE TABLE public.delivery_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  vehicle_number TEXT,
  panchayat_id UUID REFERENCES public.panchayats(id),
  assigned_wards INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  staff_type TEXT NOT NULL DEFAULT 'registered_partner',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rating NUMERIC DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 4: Create delivery_wallet table
CREATE TABLE public.delivery_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_staff_id UUID REFERENCES public.delivery_staff(id) ON DELETE CASCADE NOT NULL UNIQUE,
  collected_amount NUMERIC NOT NULL DEFAULT 0,
  job_earnings NUMERIC NOT NULL DEFAULT 0,
  total_settled NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 5: Create wallet_transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_staff_id UUID REFERENCES public.delivery_staff(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  transaction_type TEXT NOT NULL, -- 'collection', 'earning', 'settlement'
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 6: Create indoor_event_vehicles table for event delivery tracking
CREATE TABLE public.indoor_event_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  vehicle_number TEXT NOT NULL,
  driver_mobile TEXT NOT NULL,
  driver_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- STEP 7: Add new columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS estimated_delivery_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS delivery_eta TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cook_status TEXT DEFAULT 'pending', -- pending, accepted, preparing, cooked, ready
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending', -- pending, assigned, picked_up, delivered
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_earnings NUMERIC DEFAULT 0;

-- STEP 8: Enable RLS on new tables
ALTER TABLE public.cooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indoor_event_vehicles ENABLE ROW LEVEL SECURITY;

-- STEP 9: RLS policies for cooks
CREATE POLICY "Cooks can view their own profile" ON public.cooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Cooks can update their own profile" ON public.cooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage cooks" ON public.cooks
  FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- STEP 10: RLS policies for delivery_staff
CREATE POLICY "Delivery staff can view their own profile" ON public.delivery_staff
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Delivery staff can update availability" ON public.delivery_staff
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage delivery staff" ON public.delivery_staff
  FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can apply as delivery partner" ON public.delivery_staff
  FOR INSERT WITH CHECK (true);

-- STEP 11: RLS policies for delivery_wallets
CREATE POLICY "Staff can view own wallet" ON public.delivery_wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.delivery_staff ds WHERE ds.id = delivery_staff_id AND ds.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage wallets" ON public.delivery_wallets
  FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- STEP 12: RLS policies for wallet_transactions
CREATE POLICY "Staff can view own transactions" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.delivery_staff ds WHERE ds.id = delivery_staff_id AND ds.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage transactions" ON public.wallet_transactions
  FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

-- STEP 13: RLS policies for indoor_event_vehicles
CREATE POLICY "Admins can manage vehicles" ON public.indoor_event_vehicles
  FOR ALL USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their order vehicles" ON public.indoor_event_vehicles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );

-- STEP 14: Add triggers for updated_at
CREATE TRIGGER update_cooks_updated_at
  BEFORE UPDATE ON public.cooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_staff_updated_at
  BEFORE UPDATE ON public.delivery_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_wallets_updated_at
  BEFORE UPDATE ON public.delivery_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_indoor_event_vehicles_updated_at
  BEFORE UPDATE ON public.indoor_event_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 15: Create function to auto-create wallet for delivery staff
CREATE OR REPLACE FUNCTION public.create_delivery_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.delivery_wallets (delivery_staff_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_wallet_on_staff_insert
  AFTER INSERT ON public.delivery_staff
  FOR EACH ROW EXECUTE FUNCTION public.create_delivery_wallet();

-- STEP 16: Create function to check cook role
CREATE OR REPLACE FUNCTION public.is_cook(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cooks
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;

-- STEP 17: Create function to check delivery staff
CREATE OR REPLACE FUNCTION public.is_delivery_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_staff
    WHERE user_id = _user_id
      AND is_active = true
      AND is_approved = true
  )
$$;