-- Script to create 50 fake influencer accounts for testing
-- Run this in your Supabase SQL Editor

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_password TEXT := 'Test123456!';
  v_display_name TEXT;
  v_city TEXT;
  v_category TEXT;
  v_content_type TEXT;
  v_avg_views TEXT;
  v_accept_paid BOOLEAN;
  v_accept_hospitality BOOLEAN;
  v_phone TEXT;
  i INT;
  cities TEXT[] := ARRAY['خميس مشيط', 'أبها'];
  categories TEXT[] := ARRAY['food_reviews', 'lifestyle', 'fashion', 'travel', 'comedy', 'general'];
  content_types TEXT[] := ARRAY['ريلز', 'قصص', 'منشورات', 'فيديوهات طويلة'];
  avg_views_options TEXT[] := ARRAY['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+'];
BEGIN
  FOR i IN 1..50 LOOP
    -- Generate user data
    v_email := 'fake-influencer-' || i || '@test.com';
    v_display_name := 'سعد خالد - مزيف' || i;
    v_city := cities[1 + floor(random() * array_length(cities, 1))::int];
    v_category := categories[1 + floor(random() * array_length(categories, 1))::int];
    v_content_type := content_types[1 + floor(random() * array_length(content_types, 1))::int];
    v_avg_views := avg_views_options[1 + floor(random() * array_length(avg_views_options, 1))::int];
    v_phone := '+966' || (500000000 + floor(random() * 100000000))::text;
    
    -- 80% paid, 20% hospitality
    v_accept_paid := random() < 0.8;
    v_accept_hospitality := NOT v_accept_paid;
    
    -- Create auth user (you'll need to do this via Supabase Auth API or dashboard)
    -- For now, we'll create a UUID that would be used
    v_user_id := gen_random_uuid();
    
    -- Note: You need to create auth users manually via Supabase Dashboard or API
    -- This script only creates the profile and role records
    -- The auth.users table can only be modified via Supabase Auth API
    
    RAISE NOTICE 'Creating fake influencer %: % (%)', i, v_display_name, v_city;
    
    -- Insert into profiles (commented out - needs real auth user first)
    -- INSERT INTO public.profiles (id, full_name, phone)
    -- VALUES (v_user_id, v_display_name, v_phone);
    
    -- Insert into user_roles (commented out - needs real auth user first)
    -- INSERT INTO public.user_roles (user_id, role)
    -- VALUES (v_user_id, 'influencer');
    
    -- Insert into influencer_profiles (commented out - needs real auth user first)
    -- INSERT INTO public.influencer_profiles (
    --   user_id, display_name, bio, cities, primary_platforms,
    --   tiktok_url, category, content_type, avg_views_tiktok,
    --   accept_hospitality, accept_paid, min_price, max_price
    -- ) VALUES (
    --   v_user_id,
    --   v_display_name,
    --   'مؤثر تجريبي ' || i || ' - محتوى إبداعي ومميز',
    --   ARRAY[v_city],
    --   ARRAY['TikTok'],
    --   'https://tiktok.com/@fake_user_' || i,
    --   v_category::public.influencer_category,
    --   v_content_type,
    --   v_avg_views::public.avg_range,
    --   v_accept_hospitality,
    --   v_accept_paid,
    --   CASE WHEN v_accept_paid THEN 500 + floor(random() * 1500)::int ELSE NULL END,
    --   CASE WHEN v_accept_paid THEN 3000 + floor(random() * 7000)::int ELSE NULL END
    -- );
    
  END LOOP;
  
  RAISE NOTICE 'Script prepared. Please use the TypeScript version to actually create users.';
END $$;

