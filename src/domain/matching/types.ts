/**
 * Influencer Matching System Types
 * 
 * These types mirror the data structures used in the Edge Function
 * and provide strong typing for client-side code.
 */

import type { Database } from '@/integrations/supabase/types';

// Database type aliases for convenience
export type InfluencerCategory = Database['public']['Enums']['influencer_category'];
export type AvgRange = Database['public']['Enums']['avg_range'];

/**
 * Configuration for the matching algorithm.
 * These values can be tuned to adjust scoring behavior.
 */
export interface MatchingConfig {
  /** Points awarded for food/reviews content type */
  foodReviewsWeight: number;
  /** Points awarded for lifestyle content type */
  lifestyleWeight: number;
  /** Points awarded for travel content type */
  travelWeight: number;
  /** Maximum points from reach/views scoring */
  maxReachScore: number;
  /** Number of hospitality influencers to add as bonus */
  hospitalityBonusSlots: number;
}

/**
 * Influencer data required for the matching algorithm.
 * This is a subset of the full influencer_profiles table.
 */
export interface InfluencerForMatching {
  id: string;
  display_name: string | null;
  /** Primary city served (legacy field) */
  city_served: string | null;
  /** Array of cities the influencer covers */
  cities: string[] | null;
  /** Free-form content type description */
  content_type: string | null;
  /** Enum category (food_reviews, lifestyle, etc.) */
  category: InfluencerCategory | null;
  /** Numeric average views value */
  avg_views_val: number | null;
  /** TikTok views range enum */
  avg_views_tiktok: AvgRange | null;
  /** Instagram views range enum */
  avg_views_instagram: AvgRange | null;
  /** Snapchat views range enum */
  avg_views_snapchat: AvgRange | null;
  /** Whether influencer accepts hospitality-only collaborations */
  accept_hospitality: boolean | null;
  /** Whether influencer accepts paid collaborations */
  accept_paid: boolean | null;
  /** Minimum price for paid collaboration */
  min_price: number | null;
  /** Maximum price for paid collaboration */
  max_price: number | null;
  /** Explicit type label if set */
  type_label: string | null;
  /** Primary social media platforms */
  primary_platforms: string[] | null;
  /** Historical type for matching */
  history_type: string | null;
  /** Historical price category */
  history_price_cat: string | null;
}

/**
 * Result of the matching algorithm for a single influencer.
 */
export interface MatchedInfluencer extends InfluencerForMatching {
  /** Calculated match score (0-100) */
  match_score: number;
  /** Computed type: "Hospitality" or "Paid" */
  computed_type_label: 'Hospitality' | 'Paid';
  /** Whether this influencer was added as part of hospitality bonus */
  is_hospitality_bonus: boolean;
  /** Numeric value of estimated views */
  estimated_views: number;
}

/**
 * Campaign data needed for matching.
 */
export interface CampaignInput {
  /** Campaign unique identifier */
  id: string;
  /** Total budget in SAR */
  budget: number;
  /** Whether to add bonus hospitality influencers */
  add_bonus_hospitality: boolean;
  /** City from the selected branch */
  branch_city: string;
  /** Optional: campaign goal for future scoring enhancements */
  goal?: string;
}

/**
 * Summary statistics from the matching algorithm.
 * Stored in campaign.strategy_summary JSON field.
 */
export interface MatchingSummary {
  /** Total number of selected influencers */
  total_influencers: number;
  /** Number of paid influencers */
  paid_influencers: number;
  /** Number of hospitality (free) influencers */
  hospitality_influencers: number;
  /** Total cost of paid influencers (before service fee) */
  total_cost: number;
  /** Service fee (20% of total_cost) */
  service_fee: number;
  /** Total cost including service fee */
  total_cost_with_fee: number;
  /** Total estimated reach (sum of views) */
  total_reach: number;
  /** Budget remaining after selection */
  remaining_budget: number;
}

/**
 * Response from the match-influencers Edge Function.
 */
export interface MatchingResponse {
  success: boolean;
  message?: string;
  suggestions_count?: number;
  strategy?: MatchingSummary;
  error?: string;
}

/**
 * Row from campaign_influencer_suggestions table.
 */
export interface CampaignInfluencerSuggestion {
  id: string;
  campaign_id: string;
  influencer_id: string;
  match_score: number | null;
  name: string | null;
  city_served: string | null;
  platform: string | null;
  content_type: string | null;
  min_price: number | null;
  avg_views_val: number | null;
  type_label: string | null;
  history_type: string | null;
  history_price_cat: string | null;
  selected: boolean | null;
  created_at: string | null;
  scheduled_date: string | null;
}

/**
 * Request body for handle-invitation-rejection Edge Function.
 */
export interface RejectionHandlerRequest {
  campaign_id: string;
  rejected_influencer_id: string;
}

/**
 * Replacement influencer details returned by the rejection handler.
 */
export interface ReplacementInfluencerDetails {
  invitation_id: string;
  influencer_id: string;
  influencer_name: string | null;
  cost: number;
  match_score: number | null;
  scheduled_date: string | null;
}

/**
 * Response from the handle-invitation-rejection Edge Function.
 */
export interface RejectionHandlerResponse {
  success: boolean;
  replaced: boolean;
  message: string;
  replacement?: ReplacementInfluencerDetails;
  remaining_budget: number;
  error?: string;
}

