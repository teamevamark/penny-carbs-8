CREATE POLICY "Cooks can view approved delivery staff for allocation"
ON public.delivery_staff
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND is_approved = true
  AND public.is_cook(auth.uid())
);