-- Fix the overly permissive INSERT policy on delivery_staff
-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can apply as delivery partner" ON public.delivery_staff;

-- Create a more restrictive policy - only authenticated users can apply
CREATE POLICY "Authenticated users can apply as delivery partner" ON public.delivery_staff
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);