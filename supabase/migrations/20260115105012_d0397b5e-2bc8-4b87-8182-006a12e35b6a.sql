-- Add service_fee_percentage column to owner_profiles
ALTER TABLE public.owner_profiles 
ADD COLUMN service_fee_percentage numeric DEFAULT 0.20 NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.owner_profiles.service_fee_percentage IS 'Service fee percentage charged to this owner (e.g., 0.20 = 20%)';

-- Add RLS policy for admins to update service fee
CREATE POLICY "Admins can update owner service fees" 
ON public.owner_profiles 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));