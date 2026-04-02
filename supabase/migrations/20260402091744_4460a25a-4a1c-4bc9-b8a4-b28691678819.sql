-- Allow anyone to view food items by ID (for shareable links), even if not available
DROP POLICY IF EXISTS "Anyone can view items by direct link" ON food_items;
CREATE POLICY "Anyone can view items by direct link"
ON food_items
FOR SELECT
TO anon, authenticated
USING (true);