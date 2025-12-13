-- Auto-approve all owner profiles
-- Owners no longer require manual approval
-- Only influencers need approval going forward

-- Set all existing owner profiles as approved
UPDATE public.owner_profiles
SET is_approved = true
WHERE is_approved = false;

-- Update the default value for future owner profiles to be auto-approved
ALTER TABLE public.owner_profiles
ALTER COLUMN is_approved SET DEFAULT true;

-- Update comment for documentation
COMMENT ON COLUMN public.owner_profiles.is_approved IS 'Owner profiles are auto-approved upon registration';
COMMENT ON COLUMN public.influencer_profiles.is_approved IS 'Whether the influencer profile has been approved by admin';

