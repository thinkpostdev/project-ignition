-- Replace goal_details and content_requirements with influencer_instructions
-- This simplifies campaign creation and makes instructions more focused for influencers

-- Add the new influencer_instructions column
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS influencer_instructions TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.influencer_instructions IS 'Required instructions from the owner to the influencer about what to focus on and the message to convey';

-- Note: We're keeping goal_details and content_requirements columns for backward compatibility
-- with existing campaigns, but new campaigns will use influencer_instructions

