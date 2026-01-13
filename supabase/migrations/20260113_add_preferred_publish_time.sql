-- Add preferred_publish_time column to campaigns table
-- This allows restaurant owners to specify when they prefer influencers to publish content

-- Add preferred_publish_time column to campaigns table (reusing the same enum type)
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS preferred_publish_time public.visit_time;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.preferred_publish_time IS 'Preferred time slot for content publishing: morning (7am-12pm), afternoon (1pm-5pm), or evening (6pm-12am)';

