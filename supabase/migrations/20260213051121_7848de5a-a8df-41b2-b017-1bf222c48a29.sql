
-- Create a SECURITY DEFINER function to handle delivery order acceptance
-- This bypasses the complex RLS policy interaction that's causing WITH CHECK failures
CREATE OR REPLACE FUNCTION public.accept_delivery_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the calling user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify the user is an active, approved delivery staff
  IF NOT is_delivery_staff(v_user_id) THEN
    RAISE EXCEPTION 'User is not an approved delivery staff';
  END IF;
  
  -- Try to accept the order atomically
  UPDATE orders
  SET 
    assigned_delivery_id = v_user_id,
    delivery_status = 'assigned',
    delivery_eta = now() + interval '1 hour'
  WHERE id = p_order_id
    AND assigned_delivery_id IS NULL
    AND delivery_status = 'pending'
    AND cook_status = 'ready'
    AND service_type IN ('cloud_kitchen', 'homemade');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not available for acceptance. It may have been taken by another driver.';
  END IF;
END;
$$;
