-- Make instagram_handle nullable in influencer_profiles
-- This allows influencers to register without Instagram if they use other platforms

ALTER TABLE public.influencer_profiles 
ALTER COLUMN instagram_handle DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.influencer_profiles.instagram_handle IS 'Instagram handle (optional, as influencer may only use TikTok or Snapchat)';

