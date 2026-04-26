DROP POLICY IF EXISTS "Delivery staff can view assigned orders" ON public.orders;

CREATE POLICY "Delivery staff can view assigned orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  is_delivery_staff(auth.uid())
  AND assigned_delivery_id = auth.uid()
);