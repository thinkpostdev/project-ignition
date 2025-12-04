-- =============================================
-- Migration: Add Proof-of-Content Workflow
-- Date: 2024-12-04
-- Description: Add proof submission and review system for influencer content
-- =============================================

-- Create enum for proof status
DO $$ BEGIN
  CREATE TYPE public.proof_status AS ENUM (
    'pending_submission',  -- Waiting for influencer to upload proof
    'submitted',           -- Influencer has submitted proof, waiting for owner review
    'approved',            -- Owner has approved the proof
    'rejected'             -- Owner has rejected the proof
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add proof-related columns to influencer_invitations table
ALTER TABLE public.influencer_invitations
  ADD COLUMN IF NOT EXISTS proof_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_status public.proof_status DEFAULT 'pending_submission',
  ADD COLUMN IF NOT EXISTS proof_rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS proof_approved_at TIMESTAMPTZ;

-- Create index for faster queries on proof_status
CREATE INDEX IF NOT EXISTS idx_invitations_proof_status 
  ON public.influencer_invitations(proof_status);

-- Create index for faster queries on campaign_id and proof_status combined
CREATE INDEX IF NOT EXISTS idx_invitations_campaign_proof_status 
  ON public.influencer_invitations(campaign_id, proof_status);

-- Update existing RLS policies to allow influencers to update their proof fields
-- (The existing policy "Influencers can update their invitations" should already cover this,
-- but we'll ensure it's clear in comments)

-- Add a trigger to automatically set proof_status to 'pending_submission' 
-- when an invitation is accepted
CREATE OR REPLACE FUNCTION public.set_proof_pending_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When invitation is accepted, set proof_status to pending_submission
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    NEW.proof_status = 'pending_submission';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_proof_pending_on_accept ON public.influencer_invitations;
CREATE TRIGGER trigger_set_proof_pending_on_accept
  BEFORE UPDATE ON public.influencer_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_proof_pending_on_accept();

-- Add comments for documentation
COMMENT ON COLUMN public.influencer_invitations.proof_url IS 'URL to the influencer content (TikTok, Instagram, Snapchat, etc.)';
COMMENT ON COLUMN public.influencer_invitations.proof_submitted_at IS 'Timestamp when the influencer submitted the proof link';
COMMENT ON COLUMN public.influencer_invitations.proof_status IS 'Current status of the proof submission workflow';
COMMENT ON COLUMN public.influencer_invitations.proof_rejected_reason IS 'Reason provided by owner when rejecting proof';
COMMENT ON COLUMN public.influencer_invitations.proof_approved_at IS 'Timestamp when the owner approved the proof';

