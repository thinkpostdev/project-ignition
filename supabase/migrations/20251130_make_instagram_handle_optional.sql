-- Make instagram_handle optional since influencers may only use TikTok or other platforms
ALTER TABLE public.influencer_profiles 
ALTER COLUMN instagram_handle DROP NOT NULL;

-- Update any existing NULL values to ensure consistency
UPDATE public.influencer_profiles 
SET instagram_handle = NULL 
WHERE instagram_handle = '';

