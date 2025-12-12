-- =============================================
-- Add payment_completed column to influencer_invitations if it doesn't exist
-- IMPORTANT: Add the column FIRST before creating the view
-- =============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'influencer_invitations' 
    AND column_name = 'payment_completed'
  ) THEN
    ALTER TABLE public.influencer_invitations 
    ADD COLUMN payment_completed BOOLEAN DEFAULT false;
  END IF;
END $$;


-- =============================================
-- Developer Tracking View
-- Purpose: Consolidated view for tracking influencer payments and content submissions
-- =============================================

CREATE OR REPLACE VIEW public.developer_tracking_view AS
SELECT 
  -- Influencer information
  ip.id AS influencer_id,
  ip.display_name AS influencer_name,
  p.phone AS influencer_phone,
  
  -- Campaign information
  c.id AS campaign_id,
  c.title AS campaign_name,
  op.business_name AS business_name,
  
  -- Invitation and content information
  ii.id AS invitation_id,
  ii.status AS invitation_status,
  ii.offered_price AS amount_to_pay,
  ii.proof_url AS uploaded_link,
  
  -- Upload status
  CASE 
    WHEN ii.proof_url IS NOT NULL AND ii.proof_url != '' THEN true
    ELSE false
  END AS has_uploaded_link,
  
  -- Payment status (default false, will be updated manually)
  COALESCE(ii.payment_completed, false) AS payment_completed,
  
  -- Owner approval status
  CASE 
    WHEN ii.proof_status = 'approved' THEN true
    ELSE false
  END AS owner_approved_link,
  
  -- Additional useful information
  ii.proof_status AS proof_status,
  ii.proof_submitted_at AS link_submitted_at,
  ii.proof_approved_at AS link_approved_at,
  ii.scheduled_date AS visit_date,
  ii.created_at AS invitation_created_at,
  ii.responded_at AS invitation_responded_at
  
FROM 
  public.influencer_invitations ii
  
-- Join influencer profile
INNER JOIN public.influencer_profiles ip 
  ON ii.influencer_id = ip.id
  
-- Join user profile for phone number
LEFT JOIN public.profiles p 
  ON ip.user_id = p.id
  
-- Join campaign
INNER JOIN public.campaigns c 
  ON ii.campaign_id = c.id
  
-- Join owner profile for business name
LEFT JOIN public.owner_profiles op 
  ON c.owner_id = op.user_id
  
-- Only show accepted invitations
WHERE 
  ii.status = 'accepted'
  
ORDER BY 
  ii.created_at DESC;


-- =============================================
-- Grant access to the view
-- =============================================

-- Allow authenticated users to view this (for developers with proper access)
GRANT SELECT ON public.developer_tracking_view TO authenticated;

-- Optional: Create a comment describing the view
COMMENT ON VIEW public.developer_tracking_view IS 
'Developer tracking view for monitoring influencer payments and content submissions. 
This view consolidates data from multiple tables to provide a single source of truth for:
- Influencer contact information
- Campaign details
- Content upload status
- Payment tracking
- Owner approval status';


