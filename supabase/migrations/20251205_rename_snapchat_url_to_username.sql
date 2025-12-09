-- =============================================
-- Migration: Rename snapchat_url to snapchat_username in owner_profiles
-- Date: 2024-12-05
-- Description: Change owner_profiles.snapchat_url to snapchat_username for consistency
--              (influencer_profiles already uses snapchat_username)
-- =============================================

-- Rename the column from snapchat_url to snapchat_username
ALTER TABLE public.owner_profiles 
  RENAME COLUMN snapchat_url TO snapchat_username;

-- Update the comment
COMMENT ON COLUMN public.owner_profiles.snapchat_username IS 'Snapchat username (without URL, just the username)';

