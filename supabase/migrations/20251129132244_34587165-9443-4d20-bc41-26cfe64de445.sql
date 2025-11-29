-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'influencer');

-- Create enum for campaign status
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');

-- Create enum for offer status
CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create owner_profiles table
CREATE TABLE public.owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  business_type TEXT,
  location TEXT,
  instagram_handle TEXT,
  target_audience TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;

-- Create influencer_profiles table
CREATE TABLE public.influencer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  instagram_handle TEXT NOT NULL,
  followers_count INTEGER,
  engagement_rate DECIMAL(5,2),
  content_style TEXT,
  niche TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.influencer_profiles ENABLE ROW LEVEL SECURITY;

-- Create campaigns table
CREATE TABLE public.campaigns (
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create offers table
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  influencer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status offer_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

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
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_owner_profiles_updated_at BEFORE UPDATE ON public.owner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_influencer_profiles_updated_at BEFORE UPDATE ON public.influencer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for owner_profiles
CREATE POLICY "Anyone can view owner profiles"
  ON public.owner_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can update own profile"
  ON public.owner_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own profile"
  ON public.owner_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for influencer_profiles
CREATE POLICY "Anyone can view influencer profiles"
  ON public.influencer_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Influencers can update own profile"
  ON public.influencer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Influencers can insert own profile"
  ON public.influencer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for campaigns
CREATE POLICY "Anyone can view active campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (status = 'active' OR owner_id = auth.uid());

CREATE POLICY "Owners can create campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update own campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own campaigns"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- RLS Policies for offers
CREATE POLICY "Users can view relevant offers"
  ON public.offers FOR SELECT
  TO authenticated
  USING (
    auth.uid() = influencer_id OR
    auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_id)
  );

CREATE POLICY "Influencers can create offers"
  ON public.offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = influencer_id AND public.has_role(auth.uid(), 'influencer'));

CREATE POLICY "Owners and influencers can update their offers"
  ON public.offers FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = influencer_id OR
    auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_id)
  );