-- Add approval system to owner_profiles and influencer_profiles
-- This migration adds approval fields and sets all existing users as approved

-- Add is_approved column to owner_profiles
ALTER TABLE public.owner_profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Add is_approved column to influencer_profiles
ALTER TABLE public.influencer_profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- Set all existing users as approved (backward compatibility)
UPDATE public.owner_profiles
SET is_approved = true
WHERE is_approved = false;

UPDATE public.influencer_profiles
SET is_approved = true
WHERE is_approved = false;

-- Add comments for documentation
COMMENT ON COLUMN public.owner_profiles.is_approved IS 'Whether the owner profile has been approved by admin';
COMMENT ON COLUMN public.influencer_profiles.is_approved IS 'Whether the influencer profile has been approved by admin';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_owner_profiles_is_approved ON public.owner_profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_influencer_profiles_is_approved ON public.influencer_profiles(is_approved);

