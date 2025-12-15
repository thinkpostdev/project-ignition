-- Migration: Add automatic invitation expiration (48 hours)
-- This migration creates a function to handle expired invitations and sets up a cron job

-- =============================================
-- 1. Enable pg_cron extension if not already enabled
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================
-- 2. Create function to process expired invitations
-- =============================================
CREATE OR REPLACE FUNCTION process_expired_invitations()
RETURNS TABLE(
  expired_count INTEGER,
  processed_invitations JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_invitations RECORD;
  v_count INTEGER := 0;
  v_results JSONB := '[]'::JSONB;
  v_invitation_data JSONB;
BEGIN
  -- Find and process invitations that are:
  -- 1. Status = 'pending'
  -- 2. Created more than 48 hours ago
  -- 3. Haven't been responded to
  
  FOR v_expired_invitations IN
    SELECT 
      ii.id,
      ii.campaign_id,
      ii.influencer_id,
      ii.created_at,
      c.title as campaign_title
    FROM influencer_invitations ii
    JOIN campaigns c ON c.id = ii.campaign_id
    WHERE 
      ii.status = 'pending'
      AND ii.created_at < (NOW() - INTERVAL '48 hours')
      AND ii.responded_at IS NULL
    ORDER BY ii.created_at ASC
    LIMIT 100  -- Process in batches to avoid long-running transactions
  LOOP
    -- Update invitation status to declined
    UPDATE influencer_invitations
    SET 
      status = 'declined',
      responded_at = NOW()
    WHERE id = v_expired_invitations.id;
    
    -- Increment counter
    v_count := v_count + 1;
    
    -- Store information about this expired invitation
    v_invitation_data := jsonb_build_object(
      'invitation_id', v_expired_invitations.id,
      'campaign_id', v_expired_invitations.campaign_id,
      'influencer_id', v_expired_invitations.influencer_id,
      'campaign_title', v_expired_invitations.campaign_title,
      'expired_at', NOW(),
      'was_pending_since', v_expired_invitations.created_at
    );
    
    v_results := v_results || v_invitation_data;
    
    -- Log the expiration
    RAISE NOTICE 'Expired invitation % for campaign % (pending since %)', 
      v_expired_invitations.id, 
      v_expired_invitations.campaign_title,
      v_expired_invitations.created_at;
  END LOOP;
  
  -- Return results
  RETURN QUERY SELECT v_count, v_results;
END;
$$;

-- =============================================
-- 3. Grant execute permission to service role
-- =============================================
GRANT EXECUTE ON FUNCTION process_expired_invitations() TO service_role;

-- =============================================
-- 4. Create a cron job to run every hour
-- =============================================
-- Note: pg_cron runs in the postgres database by default
-- We need to schedule it to run the function
SELECT cron.schedule(
  'process-expired-invitations',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT process_expired_invitations();$$
);

-- =============================================
-- 5. Add helpful comment
-- =============================================
COMMENT ON FUNCTION process_expired_invitations() IS 
  'Automatically marks invitations as declined after 48 hours of no response. 
   Should be called by pg_cron every hour to process expired invitations.
   Returns the count of expired invitations and their details.';

