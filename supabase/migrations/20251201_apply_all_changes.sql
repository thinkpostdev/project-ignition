-- =============================================
-- Complete Migration Script with All Updates
-- =============================================

-- Create enum for user roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'influencer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for campaign status
DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for offer status
DO $$ BEGIN
  CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum types for new features
DO $$ BEGIN
  CREATE TYPE public.main_type AS ENUM ('restaurant', 'cafe');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.price_level AS ENUM ('cheap', 'moderate', 'expensive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_goal AS ENUM ('opening', 'promotions', 'new_products', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.collaboration_status AS ENUM ('pending', 'accepted', 'shooting', 'uploaded', 'posted', 'problem');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.avg_range AS ENUM ('0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.influencer_category AS ENUM ('food_reviews', 'lifestyle', 'fashion', 'travel', 'comedy', 'general');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sender_type AS ENUM ('owner', 'influencer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create owner_profiles table with all new columns including tiktok_username
CREATE TABLE IF NOT EXISTS public.owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  location TEXT,
  instagram_handle TEXT,
  target_audience TEXT,
  main_type public.main_type,
  sub_category TEXT,
  price_level public.price_level,
  tiktok_username TEXT,
  snapchat_url TEXT,
  logo_url TEXT,
  cities TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

-- Create influencer_profiles table with all new columns including tiktok_username
CREATE TABLE IF NOT EXISTS public.influencer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  instagram_handle TEXT,
  followers_count INTEGER,
  engagement_rate DECIMAL(5,2),
  content_style TEXT,
  niche TEXT,
  location TEXT,
  display_name TEXT,
  cities TEXT[],
  primary_platforms TEXT[],
  tiktok_username TEXT,
  snapchat_username TEXT,
  category public.influencer_category,
  bio TEXT,
  avg_views_tiktok public.avg_range,
  avg_views_snapchat public.avg_range,
  avg_views_instagram public.avg_range,
  avg_likes_range public.avg_range,
  accept_hospitality BOOLEAN DEFAULT false,
  accept_paid BOOLEAN DEFAULT false,
  min_price NUMERIC,
  max_price NUMERIC,
  notes_preferences TEXT,
  city_served TEXT,
  content_type TEXT,
  history_category TEXT,
  history_type TEXT,
  history_price_cat TEXT,
  avg_views_val INTEGER,
  type_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.influencer_profiles ENABLE ROW LEVEL SECURITY;

-- Create branches table with neighborhood field
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  address TEXT,
  google_map_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  budget DECIMAL(10,2),
  target_followers_min INTEGER,
  target_followers_max INTEGER,
  target_engagement_min DECIMAL(5,2),
  content_requirements TEXT,
  status campaign_status NOT NULL DEFAULT 'draft',
  branch_id UUID,
  goal public.campaign_goal,
  goal_details TEXT,
  start_date DATE,
  duration_days INTEGER DEFAULT 10,
  add_bonus_hospitality BOOLEAN DEFAULT false,
  strategy_summary JSONB,
  budget_summary JSONB,
  algorithm_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Add foreign key for branch
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_campaigns_branch'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT fk_campaigns_branch
      FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create offers table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  influencer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status offer_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create campaign_influencer_suggestions table
CREATE TABLE IF NOT EXISTS public.campaign_influencer_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL,
  name TEXT,
  city_served TEXT,
  platform TEXT,
  content_type TEXT,
  match_score NUMERIC,
  min_price NUMERIC,
  avg_views_val INTEGER,
  type_label TEXT,
  history_type TEXT,
  history_price_cat TEXT,
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.campaign_influencer_suggestions ENABLE ROW LEVEL SECURITY;

-- Create campaign_schedule_items table
CREATE TABLE IF NOT EXISTS public.campaign_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  influencer_id UUID,
  influencer_name TEXT,
  collaboration_type TEXT,
  platform TEXT,
  idea TEXT,
  status public.collaboration_status DEFAULT 'pending',
  proof_links JSONB,
  proof_screenshots TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.campaign_schedule_items ENABLE ROW LEVEL SECURITY;

-- Create influencer_invitations table
CREATE TABLE IF NOT EXISTS public.influencer_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL,
  status public.invitation_status DEFAULT 'pending',
  offered_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.influencer_invitations ENABLE ROW LEVEL SECURITY;

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  influencer_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(campaign_id, owner_id, influencer_id)
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type public.sender_type NOT NULL,
  sender_id UUID NOT NULL,
  text TEXT NOT NULL,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_owner_profiles_updated_at ON public.owner_profiles;
CREATE TRIGGER update_owner_profiles_updated_at BEFORE UPDATE ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_influencer_profiles_updated_at ON public.influencer_profiles;
CREATE TRIGGER update_influencer_profiles_updated_at BEFORE UPDATE ON public.influencer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON public.branches;
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_items_updated_at ON public.campaign_schedule_items;
CREATE TRIGGER update_schedule_items_updated_at
  BEFORE UPDATE ON public.campaign_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own role during registration" ON public.user_roles;
CREATE POLICY "Users can insert own role during registration"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for owner_profiles
DROP POLICY IF EXISTS "Anyone can view owner profiles" ON public.owner_profiles;
CREATE POLICY "Anyone can view owner profiles"
  ON public.owner_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Owners can update own profile" ON public.owner_profiles;
CREATE POLICY "Owners can update own profile"
  ON public.owner_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can insert own profile" ON public.owner_profiles;
CREATE POLICY "Owners can insert own profile"
  ON public.owner_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for branches
DROP POLICY IF EXISTS "Owners can view own branches" ON public.branches;
CREATE POLICY "Owners can view own branches"
  ON public.branches FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

DROP POLICY IF EXISTS "Owners can insert own branches" ON public.branches;
CREATE POLICY "Owners can insert own branches"
  ON public.branches FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

DROP POLICY IF EXISTS "Owners can update own branches" ON public.branches;
CREATE POLICY "Owners can update own branches"
  ON public.branches FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

DROP POLICY IF EXISTS "Owners can delete own branches" ON public.branches;
CREATE POLICY "Owners can delete own branches"
  ON public.branches FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

-- RLS Policies for influencer_profiles
DROP POLICY IF EXISTS "Anyone can view influencer profiles" ON public.influencer_profiles;
CREATE POLICY "Anyone can view influencer profiles"
  ON public.influencer_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Influencers can update own profile" ON public.influencer_profiles;
CREATE POLICY "Influencers can update own profile"
  ON public.influencer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Influencers can insert own profile" ON public.influencer_profiles;
CREATE POLICY "Influencers can insert own profile"
  ON public.influencer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for campaigns
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (status = 'active' OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can create campaigns" ON public.campaigns;
CREATE POLICY "Owners can create campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owners can update own campaigns" ON public.campaigns;
CREATE POLICY "Owners can update own campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own campaigns" ON public.campaigns;
CREATE POLICY "Owners can delete own campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- RLS Policies for offers
DROP POLICY IF EXISTS "Users can view relevant offers" ON public.offers;
CREATE POLICY "Users can view relevant offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = influencer_id OR
    auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_id)
  );

DROP POLICY IF EXISTS "Influencers can create offers" ON public.offers;
CREATE POLICY "Influencers can create offers"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = influencer_id AND public.has_role(auth.uid(), 'influencer'));

DROP POLICY IF EXISTS "Owners and influencers can update their offers" ON public.offers;
CREATE POLICY "Owners and influencers can update their offers"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = influencer_id OR
    auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_id)
  );

-- RLS policies for campaign-related tables
DROP POLICY IF EXISTS "Owners can view suggestions for own campaigns" ON public.campaign_influencer_suggestions;
CREATE POLICY "Owners can view suggestions for own campaigns"
  ON public.campaign_influencer_suggestions FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_influencer_suggestions.campaign_id));

DROP POLICY IF EXISTS "System can insert suggestions" ON public.campaign_influencer_suggestions;
CREATE POLICY "System can insert suggestions"
  ON public.campaign_influencer_suggestions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can update suggestions for own campaigns" ON public.campaign_influencer_suggestions;
CREATE POLICY "Owners can update suggestions for own campaigns"
  ON public.campaign_influencer_suggestions FOR UPDATE
  USING (auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_influencer_suggestions.campaign_id));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_branches_owner_id ON public.branches(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaign_suggestions_campaign_id ON public.campaign_influencer_suggestions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_campaign_id ON public.campaign_schedule_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_influencer_id ON public.campaign_schedule_items(influencer_id);
CREATE INDEX IF NOT EXISTS idx_invitations_campaign_id ON public.influencer_invitations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invitations_influencer_id ON public.influencer_invitations(influencer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_campaign_id ON public.conversations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- Create unique index for user_roles
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_key ON public.user_roles(user_id);

