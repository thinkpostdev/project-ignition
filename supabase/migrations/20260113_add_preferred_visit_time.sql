-- Add preferred_visit_time column to campaigns table
-- This allows restaurant owners to specify when they prefer influencers to visit

-- Create enum for visit time preferences
DO $$ BEGIN
  CREATE TYPE public.visit_time AS ENUM ('morning', 'afternoon', 'evening');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add preferred_visit_time column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS preferred_visit_time public.visit_time;

-- Add comment for documentation
COMMENT ON COLUMN public.campaigns.preferred_visit_time IS 'Preferred time slot for influencer visits: morning (7am-12pm), afternoon (1pm-5pm), or evening (6pm-12am)';

