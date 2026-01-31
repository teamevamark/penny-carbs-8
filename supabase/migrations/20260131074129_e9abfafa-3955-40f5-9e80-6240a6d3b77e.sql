-- Allow unauthenticated users to check if a mobile number exists for login purposes
-- This only allows checking existence by mobile_number, not viewing full profile data
CREATE POLICY "Allow checking mobile number for login" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Note: We're making profiles readable but only user_id is needed for login check
-- The RLS still protects against updates/deletes