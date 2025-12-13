import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==========================================
// CONFIGURATION
// ==========================================

/**
 * Matching algorithm configuration.
 * Adjust these values to tune scoring behavior.
 */
const MATCHING_CONFIG = {
  // Content type scoring weights (max 40 points total)
  weights: {
    foodReviews: 40,
    lifestyle: 15,
    travel: 5,
  },
  // Maximum points from reach/views scoring
  maxReachScore: 60,
  // Number of hospitality influencers to add as bonus
  hospitalityBonusSlots: 5,
  // Score penalty multiplier when city doesn't match (fallback mode)
  fallbackScorePenalty: 0.5,
  // Max influencers to consider in fallback mode
  fallbackLimit: 20,
} as const;

/**
 * Maps avg_views enum ranges to approximate numeric values (midpoints).
 */
const VIEWS_RANGE_MAP: Record<string, number> = {
  '0-10k': 5000,
  '10k-50k': 30000,
  '50k-100k': 75000,
  '100k-500k': 300000,
  '500k+': 750000,
};

const DEFAULT_VIEWS = 5000;

/**
 * City name normalizations for matching.
 * Maps various spellings to canonical Arabic names.
 */
const CITY_NORMALIZATIONS: Record<string, string[]> = {
  'الرياض': ['الرياض', 'رياض', 'riyadh'],
  'جدة': ['جدة', 'جده', 'jeddah', 'jidda'],
  'مكة المكرمة': ['مكة المكرمة', 'مكة', 'مكه', 'mecca', 'makkah'],
  'المدينة المنورة': ['المدينة المنورة', 'المدينة', 'المدينه', 'medina', 'madinah'],
  'الدمام': ['الدمام', 'دمام', 'dammam'],
  'الخبر': ['الخبر', 'خبر', 'khobar', 'al khobar'],
  'الطائف': ['الطائف', 'طائف', 'taif'],
  'بريدة': ['بريدة', 'بريده', 'buraydah'],
  'تبوك': ['تبوك', 'tabuk'],
  'خميس مشيط': ['خميس مشيط', 'خميس', 'khamis mushait'],
  'الهفوف': ['الهفوف', 'هفوف', 'hofuf'],
  'حائل': ['حائل', 'حايل', 'hail'],
  'نجران': ['نجران', 'najran'],
  'الجبيل': ['الجبيل', 'جبيل', 'jubail'],
  'ينبع': ['ينبع', 'yanbu'],
  'أبها': ['أبها', 'ابها', 'abha'],
  'عرعر': ['عرعر', 'arar'],
  'سكاكا': ['سكاكا', 'sakaka'],
  'جازان': ['جازان', 'جيزان', 'jazan', 'jizan'],
  'القطيف': ['القطيف', 'قطيف', 'qatif'],
};

// ==========================================
// TYPES
// ==========================================

interface Influencer {
  id: string;
  display_name: string | null;
  city_served: string | null;
  cities: string[] | null;
  content_type: string | null;
  category: string | null;
  avg_views_val: number | null;
  avg_views_tiktok: string | null;
  accept_hospitality: boolean | null;
  accept_paid: boolean | null;
  min_price: number | null;
  max_price: number | null;
  type_label: string | null;
  primary_platforms: string[] | null;
  history_type: string | null;
  history_price_cat: string | null;
}

interface ScoredInfluencer extends Influencer {
  match_score: number;
  computed_type_label: 'Hospitality' | 'Paid';
  is_hospitality_bonus: boolean;
  estimated_views: number;
}

interface MatchingSummary {
  total_influencers: number;
  paid_influencers: number;
  hospitality_influencers: number;
  total_cost: number;
  total_reach: number;
  remaining_budget: number;
}

/**
 * Campaign goals that affect date scheduling behavior.
 * 'opening' = branch opening, all influencers get the same date
 * Others = sequential dates, one per day
 */
type CampaignGoal = 'opening' | 'promotions' | 'new_products' | 'other';

/**
 * Assigns scheduled dates to influencers based on campaign goal.
 * 
 * Rules:
 * - If goal is 'opening' (افتتاح فرع): All influencers get the same date (start_date)
 * - For all other goals: Sequential dates starting from start_date, one per day
 * 
 * @param influencers - Ordered list of matched influencers
 * @param startDate - Campaign start date (ISO string or Date)
 * @param goal - Campaign goal type
 * @returns Array of influencers with scheduled_date assigned
 */
function assignInfluencerDates<T extends { id: string }>(
  influencers: T[],
  startDate: string | Date | null,
  goal: CampaignGoal | string | null
): (T & { scheduled_date: string | null })[] {
  // If no start date provided, return null dates
  if (!startDate) {
    console.log("[SCHEDULING] No start date provided, skipping date assignment");
    return influencers.map(inf => ({ ...inf, scheduled_date: null }));
  }

  const baseDate = new Date(startDate);
  
  // Validate date
  if (isNaN(baseDate.getTime())) {
    console.log("[SCHEDULING] Invalid start date, skipping date assignment");
    return influencers.map(inf => ({ ...inf, scheduled_date: null }));
  }

  const isOpening = goal === 'opening';
  
  console.log(`[SCHEDULING] Assigning dates for ${influencers.length} influencers`);
  console.log(`[SCHEDULING] Goal: "${goal}", Mode: ${isOpening ? 'SAME_DATE' : 'SEQUENTIAL'}`);
  console.log(`[SCHEDULING] Start date: ${baseDate.toISOString().split('T')[0]}`);

  return influencers.map((influencer, index) => {
    let scheduledDate: Date;
    
    if (isOpening) {
      // Branch opening: everyone visits on the same day
      scheduledDate = new Date(baseDate);
    } else {
      // Other goals: sequential dates, one influencer per day
      scheduledDate = new Date(baseDate);
      scheduledDate.setDate(scheduledDate.getDate() + index);
    }
    
    // Format as YYYY-MM-DD for database
    const dateStr = scheduledDate.toISOString().split('T')[0];
    
    return {
      ...influencer,
      scheduled_date: dateStr,
    };
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Normalizes a city name to its canonical Arabic form.
 */
function normalizeCity(city: string): string {
  const lowerCity = city.toLowerCase().trim();
  
  for (const [canonical, variations] of Object.entries(CITY_NORMALIZATIONS)) {
    if (variations.some(v => v.toLowerCase() === lowerCity)) {
      return canonical;
    }
  }
  
  return city.trim();
}

/**
 * Checks if an influencer serves a given target city.
 * Uses exact matching after normalization.
 */
function influencerServesCity(influencer: Influencer, targetCity: string): boolean {
  const normalizedTarget = normalizeCity(targetCity);
  
  // Check city_served field
  if (influencer.city_served) {
    if (normalizeCity(influencer.city_served) === normalizedTarget) {
      return true;
    }
  }
  
  // Check cities array
  if (influencer.cities && influencer.cities.length > 0) {
    for (const city of influencer.cities) {
      if (normalizeCity(city) === normalizedTarget) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Converts avg_views enum to numeric value.
 * Prefers direct numeric value if available.
 */
function getAvgViewsValue(avgViewsEnum: string | null, avgViewsVal: number | null): number {
  if (avgViewsVal && avgViewsVal > 0) {
    return avgViewsVal;
  }
  
  if (avgViewsEnum && avgViewsEnum in VIEWS_RANGE_MAP) {
    return VIEWS_RANGE_MAP[avgViewsEnum];
  }
  
  return DEFAULT_VIEWS;
}

/**
 * Determines the type label for an influencer.
 * "Hospitality" = accepts free collaborations (no min_price or accept_hospitality=true)
 * "Paid" = requires payment
 */
function determineTypeLabel(influencer: Influencer): 'Hospitality' | 'Paid' {
  // Explicit type_label takes precedence
  if (influencer.type_label) {
    const label = influencer.type_label.toLowerCase();
    if (label.includes('hospitality') || label.includes('ضيافة')) {
      return 'Hospitality';
    }
    if (label.includes('paid') || label.includes('مدفوع')) {
      return 'Paid';
    }
  }
  
  // Hospitality if no price or explicitly accepts hospitality
  if ((influencer.min_price === null || influencer.min_price === 0) && 
      influencer.accept_hospitality === true) {
    return 'Hospitality';
  }
  
  // Paid if has a price
  if (influencer.min_price && influencer.min_price > 0) {
    return 'Paid';
  }
  
  // Default to Hospitality if accept_hospitality is true
  if (influencer.accept_hospitality === true) {
    return 'Hospitality';
  }
  
  return 'Paid';
}

/**
 * Calculates match score for an influencer.
 * Score range: 0-100 (40 from content type + 60 from reach)
 */
function calculateMatchScore(influencer: Influencer, maxViews: number): number {
  let score = 0;
  
  // 1. Content Type Relevance Score (max 40 points)
  const contentType = (influencer.content_type || influencer.category || '').toLowerCase();
  
  // Check for food-related content (highest priority for restaurant platform)
  if (contentType.includes('food') || 
      contentType === 'food_reviews' || 
      contentType.includes('طعام') ||
      contentType.includes('مراجعات') ||
      contentType.includes('أكل')) {
    score += MATCHING_CONFIG.weights.foodReviews;
  } 
  // Lifestyle content
  else if (contentType.includes('lifestyle') || 
           contentType === 'lifestyle' ||
           contentType.includes('نمط حياة')) {
    score += MATCHING_CONFIG.weights.lifestyle;
  } 
  // Travel content
  else if (contentType.includes('travel') || 
           contentType === 'travel' ||
           contentType.includes('سفر')) {
    score += MATCHING_CONFIG.weights.travel;
  }
  // Other categories get 0 additional points
  
  // 2. Reach Score based on views (max 60 points)
  const avgViews = getAvgViewsValue(influencer.avg_views_tiktok, influencer.avg_views_val);
  if (maxViews > 0) {
    score += (avgViews / maxViews) * MATCHING_CONFIG.maxReachScore;
  }
  
  return Math.round(score * 100) / 100;
}

// ==========================================
// MATCHING ALGORITHM
// ==========================================

/**
 * Main matching algorithm.
 * 
 * 1. Filters influencers by city
 * 2. Calculates match scores based on content type and reach
 * 3. Selects paid influencers within budget (sorted by score)
 * 4. Optionally adds hospitality bonus influencers
 */
function matchInfluencers(
  campaignBudget: number,
  branchCity: string,
  addBonusHospitality: boolean,
  influencers: Influencer[]
): ScoredInfluencer[] {
  console.log(`[MATCH] Starting match for city: "${branchCity}", budget: ${campaignBudget}, hospitality_bonus: ${addBonusHospitality}`);
  console.log(`[MATCH] Total influencers in pool: ${influencers.length}`);
  
  // A. Filter by City
  const filteredInfluencers = influencers.filter(inf => influencerServesCity(inf, branchCity));
  
  console.log(`[MATCH] Influencers matching city "${branchCity}": ${filteredInfluencers.length}`);
  
  if (filteredInfluencers.length === 0) {
    console.log("[MATCH] No influencers in city, using fallback (all influencers with reduced score)");
    return matchInfluencersFallback(campaignBudget, addBonusHospitality, influencers);
  }
  
  // B. Calculate max views for normalization
  const maxViews = Math.max(
    ...filteredInfluencers.map(inf => getAvgViewsValue(inf.avg_views_tiktok, inf.avg_views_val)),
    1 // Prevent division by zero
  );
  console.log(`[MATCH] Max views in pool: ${maxViews}`);
  
  // C. Score all filtered influencers
  const scoredInfluencers: ScoredInfluencer[] = filteredInfluencers.map(inf => ({
    ...inf,
    match_score: calculateMatchScore(inf, maxViews),
    computed_type_label: determineTypeLabel(inf),
    is_hospitality_bonus: false,
    estimated_views: getAvgViewsValue(inf.avg_views_tiktok, inf.avg_views_val),
  }));
  
  // D. Separate Paid vs Hospitality
  const paidInfluencers = scoredInfluencers
    .filter(inf => inf.computed_type_label === 'Paid' && (inf.min_price || 0) > 0)
    .sort((a, b) => b.match_score - a.match_score);
  
  const hospitalityInfluencers = scoredInfluencers
    .filter(inf => inf.computed_type_label === 'Hospitality' || (inf.min_price || 0) === 0)
    .sort((a, b) => b.match_score - a.match_score);
  
  console.log(`[MATCH] Paid influencers: ${paidInfluencers.length}, Hospitality: ${hospitalityInfluencers.length}`);
  
  // E. Budget Allocation - Select paid influencers within budget
  const selectedInfluencers: ScoredInfluencer[] = [];
  let remainingBudget = campaignBudget;
  
  for (const influencer of paidInfluencers) {
    const cost = influencer.min_price || 0;
    
    if (cost > 0 && remainingBudget >= cost) {
      selectedInfluencers.push({
        ...influencer,
        is_hospitality_bonus: false,
      });
      remainingBudget -= cost;
    }
  }
  
  console.log(`[MATCH] Selected ${selectedInfluencers.length} paid influencers, remaining budget: ${remainingBudget}`);
  
  // Check if we found paid influencers but couldn't afford any
  if (selectedInfluencers.length === 0 && paidInfluencers.length > 0) {
    const cheapestInfluencer = Math.min(...paidInfluencers.map(inf => inf.min_price || Infinity));
    console.log(`[MATCH] WARNING: Budget too low. Cheapest influencer costs ${cheapestInfluencer}, but budget is ${campaignBudget}`);
  }
  
  // F. Add Hospitality Bonus
  if (addBonusHospitality) {
    const alreadySelectedIds = new Set(selectedInfluencers.map(s => s.id));
    
    const bonusPicks = hospitalityInfluencers
      .filter(inf => !alreadySelectedIds.has(inf.id))
      .slice(0, MATCHING_CONFIG.hospitalityBonusSlots);
    
    for (const inf of bonusPicks) {
      selectedInfluencers.push({
        ...inf,
        is_hospitality_bonus: true,
      });
    }
    
    console.log(`[MATCH] Added ${bonusPicks.length} hospitality bonus influencers`);
  }
  
  console.log(`[MATCH] Final selection: ${selectedInfluencers.length} influencers`);
  return selectedInfluencers;
}

/**
 * Fallback matching when no influencers serve the target city.
 * Uses all influencers but applies a score penalty.
 */
function matchInfluencersFallback(
  campaignBudget: number,
  addBonusHospitality: boolean,
  influencers: Influencer[]
): ScoredInfluencer[] {
  console.log("[MATCH-FALLBACK] Running fallback matching with all influencers");
  
  const maxViews = Math.max(
    ...influencers.map(inf => getAvgViewsValue(inf.avg_views_tiktok, inf.avg_views_val)),
    1
  );
  
  const scoredInfluencers: ScoredInfluencer[] = influencers.map(inf => ({
    ...inf,
    match_score: calculateMatchScore(inf, maxViews) * MATCHING_CONFIG.fallbackScorePenalty,
    computed_type_label: determineTypeLabel(inf),
    is_hospitality_bonus: false,
    estimated_views: getAvgViewsValue(inf.avg_views_tiktok, inf.avg_views_val),
  }));
  
  const paidInfluencers = scoredInfluencers
    .filter(inf => inf.computed_type_label === 'Paid' && (inf.min_price || 0) > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, MATCHING_CONFIG.fallbackLimit);
  
  const hospitalityInfluencers = scoredInfluencers
    .filter(inf => inf.computed_type_label === 'Hospitality' || (inf.min_price || 0) === 0)
    .sort((a, b) => b.match_score - a.match_score);
  
  const selectedInfluencers: ScoredInfluencer[] = [];
  let remainingBudget = campaignBudget;
  
  for (const influencer of paidInfluencers) {
    const cost = influencer.min_price || 0;
    if (cost > 0 && remainingBudget >= cost) {
      selectedInfluencers.push(influencer);
      remainingBudget -= cost;
    }
  }
  
  if (addBonusHospitality) {
    const alreadySelectedIds = new Set(selectedInfluencers.map(s => s.id));
    const bonusPicks = hospitalityInfluencers
      .filter(inf => !alreadySelectedIds.has(inf.id))
      .slice(0, MATCHING_CONFIG.hospitalityBonusSlots);
    
    for (const inf of bonusPicks) {
      selectedInfluencers.push({
        ...inf,
        is_hospitality_bonus: true,
      });
    }
  }
  
  console.log(`[MATCH-FALLBACK] Selected ${selectedInfluencers.length} influencers`);
  return selectedInfluencers;
}

// ==========================================
// EDGE FUNCTION HANDLER
// ==========================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();
    
    if (!campaign_id) {
      throw new Error("campaign_id is required");
    }
    
    console.log("[HANDLER] Starting influencer matching for campaign:", campaign_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch campaign details with branch info
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(`
        id,
        budget,
        add_bonus_hospitality,
        branch_id,
        goal,
        start_date,
        branches (
          id,
          city,
          neighborhood
        )
      `)
      .eq("id", campaign_id)
      .single();

    if (campaignError) {
      console.error("[HANDLER] Campaign fetch error:", campaignError);
      throw new Error(`Failed to fetch campaign: ${campaignError.message}`);
    }

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    console.log("[HANDLER] Campaign fetched:", JSON.stringify(campaign, null, 2));

    // Extract campaign parameters
    const branchCity = campaign.branches?.city || 'الرياض';
    const campaignBudget = campaign.budget || 0;
    const addBonusHospitality = campaign.add_bonus_hospitality ?? false;
    const campaignGoal = campaign.goal as CampaignGoal | null;
    const campaignStartDate = campaign.start_date;

    console.log(`[HANDLER] Parameters: budget=${campaignBudget}, city="${branchCity}", hospitality_bonus=${addBonusHospitality}`);
    console.log(`[HANDLER] Scheduling: goal="${campaignGoal}", start_date="${campaignStartDate}"`);

    // Fetch all influencer profiles
    const { data: influencers, error: influencersError } = await supabase
      .from("influencer_profiles")
      .select(`
        id,
        display_name,
        city_served,
        cities,
        content_type,
        category,
        avg_views_val,
        avg_views_tiktok,
        accept_hospitality,
        accept_paid,
        min_price,
        max_price,
        type_label,
        primary_platforms,
        history_type,
        history_price_cat
      `);

    if (influencersError) {
      console.error("[HANDLER] Influencers fetch error:", influencersError);
      throw new Error(`Failed to fetch influencers: ${influencersError.message}`);
    }

    console.log(`[HANDLER] Found ${influencers?.length || 0} total influencers in database`);

    if (!influencers || influencers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No influencers found to match",
          suggestions_count: 0,
          strategy: null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Run the matching algorithm
    const matchedInfluencers = matchInfluencers(
      campaignBudget,
      branchCity,
      addBonusHospitality,
      influencers as Influencer[]
    );

    console.log(`[HANDLER] Algorithm selected ${matchedInfluencers.length} influencers`);

    if (matchedInfluencers.length === 0) {
      // Check if the issue is budget-related
      const allInfluencersInCity = influencers.filter(inf => 
        influencerServesCity(inf as Influencer, branchCity)
      );
      
      const paidInfluencersInCity = allInfluencersInCity.filter(inf => {
        const minPrice = inf.min_price || 0;
        return minPrice > 0;
      });
      
      if (paidInfluencersInCity.length > 0) {
        const cheapestInfluencer = Math.min(...paidInfluencersInCity.map(inf => inf.min_price || Infinity));
        
        if (cheapestInfluencer > campaignBudget) {
          // Budget is too low
          console.log(`[HANDLER] Budget insufficient: cheapest=${cheapestInfluencer}, budget=${campaignBudget}`);
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "BUDGET_TOO_LOW",
              message: `الميزانية غير كافية. أقل سعر للمؤثرين في ${branchCity} هو ${cheapestInfluencer} ر.س، والميزانية المحددة ${campaignBudget} ر.س. يرجى زيادة الميزانية أو تفعيل خيار الضيافة المجانية.`,
              min_required_budget: cheapestInfluencer,
              current_budget: campaignBudget,
              suggestions_count: 0,
              strategy: null,
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
      }
      
      // Generic no match message
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "NO_MATCHES",
          message: "لم يتم العثور على مؤثرين مناسبين لمعايير الحملة. يرجى تعديل الميزانية أو تفعيل خيار الضيافة المجانية.",
          suggestions_count: 0,
          strategy: null,
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Calculate summary statistics
    const paidSelected = matchedInfluencers.filter(i => i.computed_type_label === 'Paid' && !i.is_hospitality_bonus);
    const hospitalitySelected = matchedInfluencers.filter(i => i.is_hospitality_bonus || i.computed_type_label === 'Hospitality');
    
    const totalCost = paidSelected.reduce((sum, inf) => sum + (inf.min_price || 0), 0);
    const totalReach = matchedInfluencers.reduce((sum, inf) => sum + inf.estimated_views, 0);

    const strategySummary: MatchingSummary = {
      total_influencers: matchedInfluencers.length,
      paid_influencers: paidSelected.length,
      hospitality_influencers: hospitalitySelected.length,
      total_cost: totalCost,
      total_reach: totalReach,
      remaining_budget: campaignBudget - totalCost,
    };

    console.log("[HANDLER] Strategy summary:", JSON.stringify(strategySummary, null, 2));

    // Assign scheduled dates to influencers based on campaign goal
    const influencersWithDates = assignInfluencerDates(
      matchedInfluencers,
      campaignStartDate,
      campaignGoal
    );

    // Prepare suggestions for database
    const suggestionsToInsert = influencersWithDates.map(inf => ({
      campaign_id,
      influencer_id: inf.id,
      match_score: inf.match_score,
      name: inf.display_name,
      city_served: inf.city_served || (inf.cities?.[0] ?? null),
      platform: inf.primary_platforms?.[0] || 'TikTok',
      content_type: inf.content_type || inf.category,
      min_price: inf.min_price,
      avg_views_val: inf.estimated_views,
      type_label: inf.computed_type_label,
      history_type: inf.history_type,
      history_price_cat: inf.history_price_cat,
      selected: false,
      scheduled_date: inf.scheduled_date,
    }));

    // Delete existing suggestions for this campaign (in case of re-run)
    const { error: deleteError } = await supabase
      .from("campaign_influencer_suggestions")
      .delete()
      .eq("campaign_id", campaign_id);

    if (deleteError) {
      console.warn("[HANDLER] Warning: Failed to delete old suggestions:", deleteError);
    }

    // Insert new suggestions
    const { error: insertError } = await supabase
      .from("campaign_influencer_suggestions")
      .insert(suggestionsToInsert);

    if (insertError) {
      console.error("[HANDLER] Insert error:", insertError);
      throw new Error(`Failed to save suggestions: ${insertError.message}`);
    }

    console.log(`[HANDLER] Successfully saved ${suggestionsToInsert.length} suggestions`);

    // Update campaign with strategy summary
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ 
        strategy_summary: strategySummary,
        algorithm_version: "v2.1-improved-city-matching"
      })
      .eq("id", campaign_id);

    if (updateError) {
      console.warn("[HANDLER] Warning: Failed to update campaign:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions_count: suggestionsToInsert.length,
        strategy: strategySummary,
        message: "Influencer matching completed successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[HANDLER] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
