-- Add preferred_publish_time column to campaigns table
-- This allows restaurant owners to specify when they prefer influencers to publish content

-- Create a new enum type for publish time that includes 'influencer_choice'
DO $$ BEGIN
  CREATE TYPE public.publish_time AS ENUM ('morning', 'afternoon', 'evening', 'influencer_choice');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add preferred_publish_time column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS preferred_publish_time public.publish_time;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.preferred_publish_time IS 'Preferred time slot for content publishing: morning (7am-12pm), afternoon (1pm-5pm), evening (6pm-12am), or influencer_choice (let influencer decide)';

