-- Migration: Add unique constraint to prevent duplicate campaign invitations
-- Created: 2024-12-06
-- Purpose: Ensure each influencer can only have one invitation per campaign (prevents race conditions)

-- Add unique constraint on (campaign_id, influencer_id)
-- This prevents the automatic replacement system from creating duplicate invitations
-- if multiple rejections happen simultaneously

DO $$ 
BEGIN
  -- First, check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_campaign_influencer'
  ) THEN
    -- Add the constraint
    ALTER TABLE public.influencer_invitations 
    ADD CONSTRAINT unique_campaign_influencer 
    UNIQUE (campaign_id, influencer_id);
    
    RAISE NOTICE 'Added unique constraint: unique_campaign_influencer';
  ELSE
    RAISE NOTICE 'Constraint unique_campaign_influencer already exists, skipping';
  END IF;
END $$;

-- Create index for faster lookups by campaign_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_invitations_campaign_id 
ON public.influencer_invitations(campaign_id);

-- Create index for faster lookups by influencer_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_invitations_influencer_id 
ON public.influencer_invitations(influencer_id);

-- Create index for faster lookups by status (if not exists)
CREATE INDEX IF NOT EXISTS idx_invitations_status 
ON public.influencer_invitations(status);

-- Create composite index for replacement queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_invitations_campaign_status 
ON public.influencer_invitations(campaign_id, status);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_campaign_influencer ON public.influencer_invitations IS 
'Ensures each influencer can only have one invitation per campaign. Prevents duplicate invitations from automatic replacement system.';

