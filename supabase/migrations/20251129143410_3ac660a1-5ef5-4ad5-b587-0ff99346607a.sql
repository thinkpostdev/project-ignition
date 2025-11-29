-- =============================================
-- Phase 1: Database Schema Updates
-- =============================================

-- Create enums for type safety
CREATE TYPE public.main_type AS ENUM ('restaurant', 'cafe');
CREATE TYPE public.price_level AS ENUM ('cheap', 'moderate', 'expensive');
CREATE TYPE public.campaign_goal AS ENUM ('opening', 'promotions', 'new_products', 'other');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE public.collaboration_status AS ENUM ('pending', 'accepted', 'shooting', 'uploaded', 'posted', 'problem');
CREATE TYPE public.avg_range AS ENUM ('0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+');
CREATE TYPE public.influencer_category AS ENUM ('food_reviews', 'lifestyle', 'fashion', 'travel', 'comedy', 'general');
CREATE TYPE public.sender_type AS ENUM ('owner', 'influencer');

-- =============================================
-- 1. Update owner_profiles table
-- =============================================
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS main_type public.main_type,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS price_level public.price_level,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS snapchat_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cities TEXT[];

-- =============================================
-- 2. Create branches table
-- =============================================
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  google_map_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own branches"
  ON public.branches FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

CREATE POLICY "Owners can insert own branches"
  ON public.branches FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

CREATE POLICY "Owners can update own branches"
  ON public.branches FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

CREATE POLICY "Owners can delete own branches"
  ON public.branches FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = branches.owner_id));

-- =============================================
-- 3. Update influencer_profiles table
-- =============================================
ALTER TABLE public.influencer_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS cities TEXT[],
  ADD COLUMN IF NOT EXISTS primary_platforms TEXT[],
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS snapchat_username TEXT,
  ADD COLUMN IF NOT EXISTS category public.influencer_category,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avg_views_tiktok public.avg_range,
  ADD COLUMN IF NOT EXISTS avg_views_snapchat public.avg_range,
  ADD COLUMN IF NOT EXISTS avg_views_instagram public.avg_range,
  ADD COLUMN IF NOT EXISTS avg_likes_range public.avg_range,
  ADD COLUMN IF NOT EXISTS accept_hospitality BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accept_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_price NUMERIC,
  ADD COLUMN IF NOT EXISTS max_price NUMERIC,
  ADD COLUMN IF NOT EXISTS notes_preferences TEXT,
  ADD COLUMN IF NOT EXISTS city_served TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS history_category TEXT,
  ADD COLUMN IF NOT EXISTS history_type TEXT,
  ADD COLUMN IF NOT EXISTS history_price_cat TEXT,
  ADD COLUMN IF NOT EXISTS avg_views_val INTEGER,
  ADD COLUMN IF NOT EXISTS type_label TEXT;

-- =============================================
-- 4. Update campaigns table
-- =============================================
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS branch_id UUID,
  ADD COLUMN IF NOT EXISTS goal public.campaign_goal,
  ADD COLUMN IF NOT EXISTS goal_details TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS add_bonus_hospitality BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS strategy_summary JSONB,
  ADD COLUMN IF NOT EXISTS budget_summary JSONB,
  ADD COLUMN IF NOT EXISTS algorithm_version TEXT;

-- Add foreign key for branch
ALTER TABLE public.campaigns
  ADD CONSTRAINT fk_campaigns_branch
  FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- =============================================
-- 5. Create campaign_influencer_suggestions table
-- =============================================
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

CREATE POLICY "Owners can view suggestions for own campaigns"
  ON public.campaign_influencer_suggestions FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_influencer_suggestions.campaign_id));

CREATE POLICY "System can insert suggestions"
  ON public.campaign_influencer_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update suggestions for own campaigns"
  ON public.campaign_influencer_suggestions FOR UPDATE
  USING (auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_influencer_suggestions.campaign_id));

-- =============================================
-- 6. Create campaign_schedule_items table
-- =============================================
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

CREATE POLICY "Owners can view schedule for own campaigns"
  ON public.campaign_schedule_items FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_schedule_items.campaign_id));

CREATE POLICY "Influencers can view their schedule items"
  ON public.campaign_schedule_items FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.influencer_profiles WHERE id = campaign_schedule_items.influencer_id));

CREATE POLICY "System can insert schedule items"
  ON public.campaign_schedule_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners and influencers can update their schedule items"
  ON public.campaign_schedule_items FOR UPDATE
  USING (
    auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = campaign_schedule_items.campaign_id)
    OR auth.uid() IN (SELECT user_id FROM public.influencer_profiles WHERE id = campaign_schedule_items.influencer_id)
  );

-- =============================================
-- 7. Create influencer_invitations table
-- =============================================
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

CREATE POLICY "Owners can view invitations for own campaigns"
  ON public.influencer_invitations FOR SELECT
  USING (auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = influencer_invitations.campaign_id));

CREATE POLICY "Influencers can view their invitations"
  ON public.influencer_invitations FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.influencer_profiles WHERE id = influencer_invitations.influencer_id));

CREATE POLICY "Owners can insert invitations for own campaigns"
  ON public.influencer_invitations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.campaigns WHERE id = influencer_invitations.campaign_id));

CREATE POLICY "Influencers can update their invitations"
  ON public.influencer_invitations FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.influencer_profiles WHERE id = influencer_invitations.influencer_id));

-- =============================================
-- 8. Create conversations table
-- =============================================
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

CREATE POLICY "Owners can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = conversations.owner_id));

CREATE POLICY "Influencers can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.influencer_profiles WHERE id = conversations.influencer_id));

CREATE POLICY "Owners can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.owner_profiles WHERE id = conversations.owner_id));

CREATE POLICY "Influencers can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.influencer_profiles WHERE id = conversations.influencer_id));

-- =============================================
-- 9. Create messages table
-- =============================================
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

CREATE POLICY "Conversation participants can view messages"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.owner_profiles WHERE id = conversations.owner_id
        UNION
        SELECT user_id FROM public.influencer_profiles WHERE id = conversations.influencer_id
      )
    )
  );

CREATE POLICY "Conversation participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.owner_profiles WHERE id = conversations.owner_id
        UNION
        SELECT user_id FROM public.influencer_profiles WHERE id = conversations.influencer_id
      )
    )
  );

CREATE POLICY "Message recipients can update read status"
  ON public.messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations 
      WHERE auth.uid() IN (
        SELECT user_id FROM public.owner_profiles WHERE id = conversations.owner_id
        UNION
        SELECT user_id FROM public.influencer_profiles WHERE id = conversations.influencer_id
      )
    )
  );

-- =============================================
-- Create indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_branches_owner_id ON public.branches(owner_id);
CREATE INDEX IF NOT EXISTS idx_campaign_suggestions_campaign_id ON public.campaign_influencer_suggestions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_campaign_id ON public.campaign_schedule_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_influencer_id ON public.campaign_schedule_items(influencer_id);
CREATE INDEX IF NOT EXISTS idx_invitations_campaign_id ON public.influencer_invitations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invitations_influencer_id ON public.influencer_invitations(influencer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_campaign_id ON public.conversations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);

-- =============================================
-- Add triggers for updated_at timestamps
-- =============================================
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedule_items_updated_at
  BEFORE UPDATE ON public.campaign_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();