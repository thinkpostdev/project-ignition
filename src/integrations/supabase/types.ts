export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          city: string
          created_at: string | null
          google_map_url: string | null
          id: string
          neighborhood: string | null
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string | null
          google_map_url?: string | null
          id?: string
          neighborhood?: string | null
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string | null
          google_map_url?: string | null
          id?: string
          neighborhood?: string | null
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_influencer_suggestions: {
        Row: {
          avg_views_val: number | null
          campaign_id: string
          city_served: string | null
          compaign_name: string | null
          content_type: string | null
          created_at: string | null
          history_price_cat: string | null
          history_type: string | null
          id: string
          influencer_id: string
          match_score: number | null
          min_price: number | null
          name: string | null
          platform: string | null
          scheduled_date: string | null
          selected: boolean | null
          type_label: string | null
        }
        Insert: {
          avg_views_val?: number | null
          campaign_id: string
          city_served?: string | null
          compaign_name?: string | null
          content_type?: string | null
          created_at?: string | null
          history_price_cat?: string | null
          history_type?: string | null
          id?: string
          influencer_id: string
          match_score?: number | null
          min_price?: number | null
          name?: string | null
          platform?: string | null
          scheduled_date?: string | null
          selected?: boolean | null
          type_label?: string | null
        }
        Update: {
          avg_views_val?: number | null
          campaign_id?: string
          city_served?: string | null
          compaign_name?: string | null
          content_type?: string | null
          created_at?: string | null
          history_price_cat?: string | null
          history_type?: string | null
          id?: string
          influencer_id?: string
          match_score?: number | null
          min_price?: number | null
          name?: string | null
          platform?: string | null
          scheduled_date?: string | null
          selected?: boolean | null
          type_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_influencer_suggestions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_influencer_suggestions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "developer_tracking_view"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaign_schedule_items: {
        Row: {
          campaign_id: string
          collaboration_type: string | null
          created_at: string | null
          date: string | null
          day_number: number
          id: string
          idea: string | null
          influencer_id: string | null
          influencer_name: string | null
          platform: string | null
          proof_links: Json | null
          proof_screenshots: string[] | null
          status: Database["public"]["Enums"]["collaboration_status"] | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          collaboration_type?: string | null
          created_at?: string | null
          date?: string | null
          day_number: number
          id?: string
          idea?: string | null
          influencer_id?: string | null
          influencer_name?: string | null
          platform?: string | null
          proof_links?: Json | null
          proof_screenshots?: string[] | null
          status?: Database["public"]["Enums"]["collaboration_status"] | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          collaboration_type?: string | null
          created_at?: string | null
          date?: string | null
          day_number?: number
          id?: string
          idea?: string | null
          influencer_id?: string | null
          influencer_name?: string | null
          platform?: string | null
          proof_links?: Json | null
          proof_screenshots?: string[] | null
          status?: Database["public"]["Enums"]["collaboration_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_schedule_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_schedule_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "developer_tracking_view"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          add_bonus_hospitality: boolean | null
          algorithm_version: string | null
          branch_id: string | null
          budget: number | null
          budget_summary: Json | null
          content_requirements: string | null
          created_at: string
          description: string | null
          duration_days: number | null
          goal: Database["public"]["Enums"]["campaign_goal"] | null
          goal_details: string | null
          id: string
          owner_id: string
          payment_approved: boolean | null
          payment_submitted_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_detailed_status"]
          strategy_summary: Json | null
          target_engagement_min: number | null
          target_followers_max: number | null
          target_followers_min: number | null
          title: string
          updated_at: string
        }
        Insert: {
          add_bonus_hospitality?: boolean | null
          algorithm_version?: string | null
          branch_id?: string | null
          budget?: number | null
          budget_summary?: Json | null
          content_requirements?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          goal?: Database["public"]["Enums"]["campaign_goal"] | null
          goal_details?: string | null
          id?: string
          owner_id: string
          payment_approved?: boolean | null
          payment_submitted_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_detailed_status"]
          strategy_summary?: Json | null
          target_engagement_min?: number | null
          target_followers_max?: number | null
          target_followers_min?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          add_bonus_hospitality?: boolean | null
          algorithm_version?: string | null
          branch_id?: string | null
          budget?: number | null
          budget_summary?: Json | null
          content_requirements?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          goal?: Database["public"]["Enums"]["campaign_goal"] | null
          goal_details?: string | null
          id?: string
          owner_id?: string
          payment_approved?: boolean | null
          payment_submitted_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_detailed_status"]
          strategy_summary?: Json | null
          target_engagement_min?: number | null
          target_followers_max?: number | null
          target_followers_min?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_campaigns_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          influencer_id: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          influencer_id: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          influencer_id?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "developer_tracking_view"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      influencer_invitations: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          influencer_id: string
          offered_price: number | null
          payment_completed: boolean | null
          proof_approved_at: string | null
          proof_deadline_at: string | null
          proof_rejected_reason: string | null
          proof_status: Database["public"]["Enums"]["proof_status"] | null
          proof_submitted_at: string | null
          proof_url: string | null
          responded_at: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["invitation_status"] | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          influencer_id: string
          offered_price?: number | null
          payment_completed?: boolean | null
          proof_approved_at?: string | null
          proof_deadline_at?: string | null
          proof_rejected_reason?: string | null
          proof_status?: Database["public"]["Enums"]["proof_status"] | null
          proof_submitted_at?: string | null
          proof_url?: string | null
          responded_at?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          influencer_id?: string
          offered_price?: number | null
          payment_completed?: boolean | null
          proof_approved_at?: string | null
          proof_deadline_at?: string | null
          proof_rejected_reason?: string | null
          proof_status?: Database["public"]["Enums"]["proof_status"] | null
          proof_submitted_at?: string | null
          proof_url?: string | null
          responded_at?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "influencer_invitations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "influencer_invitations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "developer_tracking_view"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      influencer_profiles: {
        Row: {
          accept_hospitality: boolean | null
          accept_paid: boolean | null
          agreement_accepted: boolean | null
          avg_likes_range: Database["public"]["Enums"]["avg_range"] | null
          avg_views_instagram: Database["public"]["Enums"]["avg_range"] | null
          avg_views_snapchat: Database["public"]["Enums"]["avg_range"] | null
          avg_views_tiktok: Database["public"]["Enums"]["avg_range"] | null
          avg_views_val: number | null
          bank_name: string | null
          bio: string | null
          categories: string[] | null
          category: Database["public"]["Enums"]["influencer_category"] | null
          cities: string[] | null
          city_served: string | null
          content_style: string | null
          content_type: string | null
          created_at: string
          display_name: string | null
          engagement_rate: number | null
          followers_count: number | null
          history_category: string | null
          history_price_cat: string | null
          history_type: string | null
          iban: string | null
          id: string
          instagram_handle: string | null
          is_approved: boolean | null
          location: string | null
          max_price: number | null
          min_price: number | null
          niche: string | null
          notes_preferences: string | null
          primary_platforms: string[] | null
          snapchat_username: string | null
          tiktok_url: string | null
          tiktok_username: string | null
          type_label: string | null
          updated_at: string
          user_id: string
          verification_document_url: string | null
        }
        Insert: {
          accept_hospitality?: boolean | null
          accept_paid?: boolean | null
          agreement_accepted?: boolean | null
          avg_likes_range?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_instagram?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_snapchat?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_tiktok?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_val?: number | null
          bank_name?: string | null
          bio?: string | null
          categories?: string[] | null
          category?: Database["public"]["Enums"]["influencer_category"] | null
          cities?: string[] | null
          city_served?: string | null
          content_style?: string | null
          content_type?: string | null
          created_at?: string
          display_name?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          history_category?: string | null
          history_price_cat?: string | null
          history_type?: string | null
          iban?: string | null
          id?: string
          instagram_handle?: string | null
          is_approved?: boolean | null
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          niche?: string | null
          notes_preferences?: string | null
          primary_platforms?: string[] | null
          snapchat_username?: string | null
          tiktok_url?: string | null
          tiktok_username?: string | null
          type_label?: string | null
          updated_at?: string
          user_id: string
          verification_document_url?: string | null
        }
        Update: {
          accept_hospitality?: boolean | null
          accept_paid?: boolean | null
          agreement_accepted?: boolean | null
          avg_likes_range?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_instagram?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_snapchat?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_tiktok?: Database["public"]["Enums"]["avg_range"] | null
          avg_views_val?: number | null
          bank_name?: string | null
          bio?: string | null
          categories?: string[] | null
          category?: Database["public"]["Enums"]["influencer_category"] | null
          cities?: string[] | null
          city_served?: string | null
          content_style?: string | null
          content_type?: string | null
          created_at?: string
          display_name?: string | null
          engagement_rate?: number | null
          followers_count?: number | null
          history_category?: string | null
          history_price_cat?: string | null
          history_type?: string | null
          iban?: string | null
          id?: string
          instagram_handle?: string | null
          is_approved?: boolean | null
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          niche?: string | null
          notes_preferences?: string | null
          primary_platforms?: string[] | null
          snapchat_username?: string | null
          tiktok_url?: string | null
          tiktok_username?: string | null
          type_label?: string | null
          updated_at?: string
          user_id?: string
          verification_document_url?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: string[] | null
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["sender_type"]
          text: string
        }
        Insert: {
          attachments?: string[] | null
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: Database["public"]["Enums"]["sender_type"]
          text: string
        }
        Update: {
          attachments?: string[] | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: Database["public"]["Enums"]["sender_type"]
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          influencer_id: string
          message: string | null
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          influencer_id: string
          message?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          influencer_id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "developer_tracking_view"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          business_name: string
          business_type: string | null
          cities: string[] | null
          created_at: string
          id: string
          instagram_handle: string | null
          is_approved: boolean | null
          location: string | null
          logo_url: string | null
          main_type: Database["public"]["Enums"]["main_type"] | null
          price_level: Database["public"]["Enums"]["price_level"] | null
          snapchat_username: string | null
          sub_category: string | null
          target_audience: string | null
          tiktok_url: string | null
          tiktok_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          business_type?: string | null
          cities?: string[] | null
          created_at?: string
          id?: string
          instagram_handle?: string | null
          is_approved?: boolean | null
          location?: string | null
          logo_url?: string | null
          main_type?: Database["public"]["Enums"]["main_type"] | null
          price_level?: Database["public"]["Enums"]["price_level"] | null
          snapchat_username?: string | null
          sub_category?: string | null
          target_audience?: string | null
          tiktok_url?: string | null
          tiktok_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          business_type?: string | null
          cities?: string[] | null
          created_at?: string
          id?: string
          instagram_handle?: string | null
          is_approved?: boolean | null
          location?: string | null
          logo_url?: string | null
          main_type?: Database["public"]["Enums"]["main_type"] | null
          price_level?: Database["public"]["Enums"]["price_level"] | null
          snapchat_username?: string | null
          sub_category?: string | null
          target_audience?: string | null
          tiktok_url?: string | null
          tiktok_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_influencer_suggestions_with_title: {
        Row: {
          avg_views_val: number | null
          campaign_id: string | null
          city_served: string | null
          compaign_name: string | null
          compaign_title: string | null
          content_type: string | null
          created_at: string | null
          history_price_cat: string | null
          history_type: string | null
          id: string | null
          influencer_id: string | null
          match_score: number | null
          min_price: number | null
          name: string | null
          platform: string | null
          scheduled_date: string | null
          selected: boolean | null
          type_label: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_influencer_suggestions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_influencer_suggestions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "developer_tracking_view"
            referencedColumns: ["campaign_id"]
          },
        ]
      }
      developer_tracking_view: {
        Row: {
          amount_to_pay: number | null
          business_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          has_uploaded_link: boolean | null
          influencer_id: string | null
          influencer_name: string | null
          influencer_phone: string | null
          invitation_created_at: string | null
          invitation_id: string | null
          invitation_responded_at: string | null
          invitation_status:
            | Database["public"]["Enums"]["invitation_status"]
            | null
          link_approved_at: string | null
          link_submitted_at: string | null
          owner_approved_link: boolean | null
          payment_completed: boolean | null
          proof_status: Database["public"]["Enums"]["proof_status"] | null
          uploaded_link: string | null
          visit_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_admin_influencer_data: {
        Args: never
        Returns: {
          accept_hospitality: boolean
          accept_paid: boolean
          avg_views_val: number
          bio: string
          category: string
          cities: string[]
          city_served: string
          content_type: string
          created_at: string
          display_name: string
          full_name: string
          id: string
          instagram_handle: string
          is_approved: boolean
          max_price: number
          min_price: number
          primary_platforms: string[]
          snapchat_username: string
          tiktok_username: string
          type_label: string
          updated_at: string
          user_email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      user_has_invitation_to_campaign: {
        Args: { campaign_uuid: string; user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "influencer"
      avg_range: "0-10k" | "10k-50k" | "50k-100k" | "100k-500k" | "500k+"
      campaign_detailed_status:
        | "draft"
        | "waiting_match_plan"
        | "plan_ready"
        | "waiting_influencer_responses"
        | "in_progress"
        | "completed"
        | "cancelled"
      campaign_goal: "opening" | "promotions" | "new_products" | "other"
      campaign_status: "draft" | "active" | "paused" | "completed"
      collaboration_status:
        | "pending"
        | "accepted"
        | "shooting"
        | "uploaded"
        | "posted"
        | "problem"
      influencer_category:
        | "food_reviews"
        | "lifestyle"
        | "fashion"
        | "travel"
        | "comedy"
        | "general"
      invitation_status: "pending" | "accepted" | "declined" | "cancelled"
      main_type: "restaurant" | "cafe"
      offer_status: "pending" | "accepted" | "rejected" | "completed"
      price_level: "cheap" | "moderate" | "expensive"
      proof_status: "pending_submission" | "submitted" | "approved" | "rejected"
      sender_type: "owner" | "influencer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "influencer"],
      avg_range: ["0-10k", "10k-50k", "50k-100k", "100k-500k", "500k+"],
      campaign_detailed_status: [
        "draft",
        "waiting_match_plan",
        "plan_ready",
        "waiting_influencer_responses",
        "in_progress",
        "completed",
        "cancelled",
      ],
      campaign_goal: ["opening", "promotions", "new_products", "other"],
      campaign_status: ["draft", "active", "paused", "completed"],
      collaboration_status: [
        "pending",
        "accepted",
        "shooting",
        "uploaded",
        "posted",
        "problem",
      ],
      influencer_category: [
        "food_reviews",
        "lifestyle",
        "fashion",
        "travel",
        "comedy",
        "general",
      ],
      invitation_status: ["pending", "accepted", "declined", "cancelled"],
      main_type: ["restaurant", "cafe"],
      offer_status: ["pending", "accepted", "rejected", "completed"],
      price_level: ["cheap", "moderate", "expensive"],
      proof_status: ["pending_submission", "submitted", "approved", "rejected"],
      sender_type: ["owner", "influencer"],
    },
  },
} as const
