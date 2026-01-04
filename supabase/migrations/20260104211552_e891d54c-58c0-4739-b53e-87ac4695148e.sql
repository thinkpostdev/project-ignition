-- =============================================
-- SECURITY FIX 1: Ensure RLS is enabled on campaign_influencer_suggestions
-- =============================================

-- Make sure RLS is enabled (in case it was disabled at DB level)
ALTER TABLE public.campaign_influencer_suggestions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY FIX 2: Drop the admin_influencer_view that exposes auth.users data
-- =============================================

-- Drop the insecure view that exposes user data
DROP VIEW IF EXISTS public.admin_influencer_view;

-- Recreate it as a SECURITY DEFINER function that only admins can access
CREATE OR REPLACE FUNCTION public.get_admin_influencer_data()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  city_served text,
  cities text[],
  content_type text,
  category text,
  avg_views_val integer,
  min_price integer,
  max_price integer,
  type_label text,
  primary_platforms text[],
  accept_hospitality boolean,
  accept_paid boolean,
  is_approved boolean,
  instagram_handle text,
  tiktok_username text,
  snapchat_username text,
  bio text,
  created_at timestamptz,
  updated_at timestamptz,
  full_name text,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  RETURN QUERY
  SELECT 
    ip.id,
    ip.user_id,
    ip.display_name,
    ip.city_served,
    ip.cities,
    ip.content_type,
    ip.category::text,
    ip.avg_views_val,
    ip.min_price,
    ip.max_price,
    ip.type_label,
    ip.primary_platforms,
    ip.accept_hospitality,
    ip.accept_paid,
    ip.is_approved,
    ip.instagram_handle,
    ip.tiktok_username,
    ip.snapchat_username,
    ip.bio,
    ip.created_at,
    ip.updated_at,
    p.full_name,
    au.email::text as user_email
  FROM public.influencer_profiles ip
  LEFT JOIN public.profiles p ON ip.user_id = p.id
  LEFT JOIN auth.users au ON ip.user_id = au.id;
END;
$$;

-- Grant execute to authenticated users (the function itself checks admin status)
GRANT EXECUTE ON FUNCTION public.get_admin_influencer_data() TO authenticated;