-- Drop and recreate the function with correct numeric types for min_price and max_price
DROP FUNCTION IF EXISTS public.get_admin_influencer_data();

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
  min_price numeric,
  max_price numeric,
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