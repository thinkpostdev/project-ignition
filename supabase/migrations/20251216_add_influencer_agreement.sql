-- Add agreement_accepted column to influencer_profiles
-- This tracks whether the influencer has accepted the mandatory agreement

ALTER TABLE public.influencer_profiles
ADD COLUMN IF NOT EXISTS agreement_accepted BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.influencer_profiles.agreement_accepted IS 'Whether the influencer has accepted the mandatory agreement. Influencers must accept the agreement before they can use the platform.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_influencer_profiles_agreement_accepted ON public.influencer_profiles(agreement_accepted);

-- Set all existing approved influencers as having accepted the agreement (backward compatibility)
-- This assumes existing influencers implicitly agreed
UPDATE public.influencer_profiles
SET agreement_accepted = true
WHERE is_approved = true AND agreement_accepted = false;

