-- Complete campaign updates migration
-- This adds all the new required fields for campaigns

-- 1. Create enum types for time preferences
DO $$ BEGIN
  CREATE TYPE public.visit_time AS ENUM ('morning', 'afternoon', 'evening');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.publish_time AS ENUM ('morning', 'afternoon', 'evening', 'influencer_choice');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS preferred_visit_time public.visit_time;

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS preferred_publish_time public.publish_time;

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS influencer_instructions TEXT;

-- 3. Add comments for documentation
COMMENT ON COLUMN public.campaigns.preferred_visit_time IS 'Required: Preferred time slot for influencer visits: morning (7am-12pm), afternoon (1pm-5pm), or evening (6pm-12am)';

COMMENT ON COLUMN public.campaigns.preferred_publish_time IS 'Required: Preferred time slot for content publishing: morning (7am-12pm), afternoon (1pm-5pm), evening (6pm-12am), or influencer_choice (let influencer decide)';

COMMENT ON COLUMN public.campaigns.influencer_instructions IS 'Required: Instructions from the owner to the influencer about what to focus on and the message to convey';

-- 4. Display success message
DO $$
BEGIN
  RAISE NOTICE 'Campaign columns added successfully!';
  RAISE NOTICE '  - preferred_visit_time (visit_time enum)';
  RAISE NOTICE '  - preferred_publish_time (publish_time enum)';
  RAISE NOTICE '  - influencer_instructions (text)';
END $$;

