-- Admin User Setup Script
-- Run this in Supabase SQL Editor after registering thinkpost.dev@gmail.com

-- Step 1: Verify the user exists
SELECT 
  id, 
  email, 
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'thinkpost.dev@gmail.com';

-- Step 2: Add user to admins table (run this after confirming user exists above)
-- This will make the user an admin
INSERT INTO public.admins (user_id)
SELECT id 
FROM auth.users 
WHERE email = 'thinkpost.dev@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify admin was added successfully
SELECT 
  a.user_id,
  u.email,
  a.created_at as admin_since
FROM public.admins a
JOIN auth.users u ON u.id = a.user_id
WHERE u.email = 'thinkpost.dev@gmail.com';

-- Step 4: Test the is_admin function
SELECT public.is_admin(
  (SELECT id FROM auth.users WHERE email = 'thinkpost.dev@gmail.com')
) as is_admin;

-- Expected result: true

-- TROUBLESHOOTING:
-- If the insert fails, check:
-- 1. User exists in auth.users
-- 2. User email is confirmed
-- 3. admins table exists and RLS is enabled
-- 4. Migration was applied successfully

-- To check if admins table exists:
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admins'
) as admins_table_exists;

-- To check RLS policies on admins table:
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'admins';

