
-- Drop the problematic policies causing infinite recursion
DROP POLICY IF EXISTS "Cooks can view their own assignments" ON public.order_assigned_cooks;
DROP POLICY IF EXISTS "Cooks can update their own assignment status" ON public.order_assigned_cooks;
DROP POLICY IF EXISTS "Customers can create cook assignments for their orders" ON public.order_assigned_cooks;

-- Recreate without recursive joins - use direct cook user_id check
CREATE POLICY "Cooks can view their own assignments"
ON public.order_assigned_cooks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cooks c
    WHERE c.id = order_assigned_cooks.cook_id
      AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Cooks can update their own assignment status"
ON public.order_assigned_cooks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.cooks c
    WHERE c.id = order_assigned_cooks.cook_id
      AND c.user_id = auth.uid()
  )
);

-- For customer inserts, check orders directly without joining back
CREATE POLICY "Customers can create cook assignments for their orders"
ON public.order_assigned_cooks
FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT customer_id FROM public.orders WHERE id = order_assigned_cooks.order_id)
);

-- Also fix the orders policies that reference order_assigned_cooks (causing the recursion loop)
DROP POLICY IF EXISTS "Cooks can view assigned orders via assignments" ON public.orders;
DROP POLICY IF EXISTS "Cooks can update cook status on assigned orders" ON public.orders;

-- Recreate orders policies for cooks without the recursive join through order_assigned_cooks
CREATE POLICY "Cooks can view assigned orders via assignments"
ON public.orders
FOR SELECT
USING (
  auth.uid() IN (
    SELECT c.user_id FROM public.cooks c
    WHERE c.id = orders.assigned_cook_id
  )
  OR
  auth.uid() IN (
    SELECT c.user_id FROM public.cooks c
    INNER JOIN public.order_assigned_cooks oac ON oac.cook_id = c.id
    WHERE oac.order_id = orders.id
  )
);

CREATE POLICY "Cooks can update cook status on assigned orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT c.user_id FROM public.cooks c
    WHERE c.id = orders.assigned_cook_id
  )
  OR
  auth.uid() IN (
    SELECT c.user_id FROM public.cooks c
    INNER JOIN public.order_assigned_cooks oac ON oac.cook_id = c.id
    WHERE oac.order_id = orders.id
  )
);

-- Fix order_items policy that also joins through order_assigned_cooks
DROP POLICY IF EXISTS "Cooks can view order items for their assigned orders" ON public.order_items;

CREATE POLICY "Cooks can view order items for their assigned orders"
ON public.order_items
FOR SELECT
USING (
  auth.uid() IN (
    SELECT c.user_id FROM public.cooks c
    INNER JOIN public.order_assigned_cooks oac ON oac.cook_id = c.id
    WHERE oac.order_id = order_items.order_id
  )
);
