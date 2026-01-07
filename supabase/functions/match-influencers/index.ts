import { createClient } from "jsr:@supabase/supabase-js@2";

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
  matched_city: string;
}

interface MatchingSummary {
  total_influencers: number;
  paid_influencers: number;
  hospitality_influencers: number;
  total_cost: number;
  service_fee: number;
  total_cost_with_fee: number;
  total_reach: number;
  remaining_budget: number;
}

type CampaignGoal = 'opening' | 'promotions' | 'new_products' | 'other';

// ==========================================
// AUTHENTICATION HELPER
// ==========================================

async function authenticateAndValidateOwnership(
  req: Request,
  campaignId: string
): Promise<{ success: true; userId: string } | { success: false; response: Response }> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    console.error("[AUTH] No authorization header provided");
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  // Extract token from header
  const token = authHeader.replace('Bearer ', '');
  
  // Use service role to verify JWT and get user info
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Verify the JWT token and get user
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError || !user) {
    console.error("[AUTH] Invalid or expired token:", authError);
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  console.log(`[AUTH] Authenticated user: ${user.id}`);

  // Verify campaign ownership
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('campaigns')
    .select('owner_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    console.error("[AUTH] Campaign not found:", campaignError);
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Forbidden: Campaign not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  if (campaign.owner_id !== user.id) {
    console.error("[AUTH] User is not the campaign owner");
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Forbidden: Not the campaign owner' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  console.log(`[AUTH] User ${user.id} authorized for campaign ${campaignId}`);
  return { success: true, userId: user.id };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function assignInfluencerDates<T extends { id: string }>(
  influencers: T[],
  startDate: string | Date | null,
  goal: CampaignGoal | string | null,
  durationDays: number | null | undefined
): (T & { scheduled_date: string | null })[] {
  if (!startDate) {
    console.log("[SCHEDULING] No start date provided, skipping date assignment");
    return influencers.map(inf => ({ ...inf, scheduled_date: null }));
  }

  const baseDate = new Date(startDate);
  
  if (isNaN(baseDate.getTime())) {
    console.log("[SCHEDULING] Invalid start date, skipping date assignment");
    return influencers.map(inf => ({ ...inf, scheduled_date: null }));
  }

  console.log(`[SCHEDULING] Assigning dates for ${influencers.length} influencers`);
  console.log(`[SCHEDULING] Duration: ${durationDays} days`);

  if (influencers.length === 0) {
    return [];
  }

  return influencers.map((influencer, index) => {
    let scheduledDate: Date;
    
    if (durationDays && durationDays > 0) {
        const endDate = new Date(baseDate);
        endDate.setDate(endDate.getDate() + (durationDays - 1));
        
        if (influencers.length === 1) {
          scheduledDate = new Date(baseDate);
        } else {
          const interval = (durationDays - 1) / (influencers.length - 1);
          const daysToAdd = Math.round(index * interval);
          
          scheduledDate = new Date(baseDate);
          scheduledDate.setDate(scheduledDate.getDate() + daysToAdd);
          
          const maxDate = new Date(endDate);
          if (scheduledDate > maxDate) {
            scheduledDate = new Date(maxDate);
          }
        }
    } else {
      scheduledDate = new Date(baseDate);
      scheduledDate.setDate(scheduledDate.getDate() + index);
    }
    
    const dateStr = scheduledDate.toISOString().split('T')[0];
    
    return {
      ...influencer,
      scheduled_date: dateStr,
    };
  });
}

function normalizeCity(city: string): string {
  const lowerCity = city.toLowerCase().trim();
  
  for (const [canonical, variations] of Object.entries(CITY_NORMALIZATIONS)) {
    if (variations.some(v => v.toLowerCase() === lowerCity)) {
      return canonical;
    }
  }
  
  return city.trim();
}

function influencerServesCity(influencer: Influencer, targetCity: string): boolean {
  const normalizedTarget = normalizeCity(targetCity);
  
  if (influencer.city_served) {
    if (normalizeCity(influencer.city_served) === normalizedTarget) {
      return true;
    }
  }
  
  if (influencer.cities && influencer.cities.length > 0) {
    for (const city of influencer.cities) {
      if (normalizeCity(city) === normalizedTarget) {
        return true;
      }
    }
  }
  
  return false;
}

function getAvgViewsValue(avgViewsEnum: string | null, avgViewsVal: number | null): number {
  if (avgViewsVal && avgViewsVal > 0) {
    return avgViewsVal;
  }
  
  if (avgViewsEnum && avgViewsEnum in VIEWS_RANGE_MAP) {
    return VIEWS_RANGE_MAP[avgViewsEnum];
  }
  
  return DEFAULT_VIEWS;
}

function determineTypeLabel(influencer: Influencer): 'Hospitality' | 'Paid' {
  if (influencer.type_label) {
    const label = influencer.type_label.toLowerCase();
    if (label.includes('hospitality') || label.includes('ضيافة')) {
      return 'Hospitality';
    }
    if (label.includes('paid') || label.includes('مدفوع')) {
      return 'Paid';
    }
  }
  
  if ((influencer.min_price === null || influencer.min_price === 0) && 
      influencer.accept_hospitality === true) {
    return 'Hospitality';
  }
  
  if (influencer.min_price && influencer.min_price > 0) {
    return 'Paid';
  }
  
  if (influencer.accept_hospitality === true) {
    return 'Hospitality';
  }
  
  return 'Paid';
}

function calculateMatchScore(influencer: Influencer, maxViews: number): number {
  let score = 0;
  
  const contentType = (influencer.content_type || influencer.category || '').toLowerCase();
  
  if (contentType.includes('food') || 
      contentType === 'food_reviews' || 
      contentType.includes('طعام') ||
      contentType.includes('مراجعات') ||
      contentType.includes('أكل')) {
    score += MATCHING_CONFIG.weights.foodReviews;
  } 
  else if (contentType.includes('lifestyle') || 
           contentType === 'lifestyle' ||
           contentType.includes('نمط حياة')) {
    score += MATCHING_CONFIG.weights.lifestyle;
  } 
  else if (contentType.includes('travel') || 
           contentType === 'travel' ||
           contentType.includes('سفر')) {
    score += MATCHING_CONFIG.weights.travel;
  }
  
  const avgViews = getAvgViewsValue(influencer.avg_views_tiktok, influencer.avg_views_val);
  if (maxViews > 0) {
    score += (avgViews / maxViews) * MATCHING_CONFIG.maxReachScore;
  }
  
  return Math.round(score * 100) / 100;
}

// ==========================================
// MATCHING ALGORITHM
// ==========================================

function matchInfluencers(
  campaignBudget: number,
  branchCity: string,
  addBonusHospitality: boolean,
  influencers: Influencer[]
): ScoredInfluencer[] {
  console.log(`[MATCH] Starting match for city: "${branchCity}", budget: ${campaignBudget}, hospitality_bonus: ${addBonusHospitality}`);
  console.log(`[MATCH] Total influencers in pool: ${influencers.length}`);
  
  const filteredInfluencers = influencers.filter(inf => influencerServesCity(inf, branchCity));
  
  console.log(`[MATCH] Influencers matching city "${branchCity}": ${filteredInfluencers.length}`);
  
  if (filteredInfluencers.length === 0) {
    console.log("[MATCH] No influencers in city, using fallback");
    return matchInfluencersFallback(campaignBudget, addBonusHospitality, influencers);
  }
  
  const maxViews = Math.max(
    ...filteredInfluencers.map(inf => getAvgViewsValue(inf.avg_views_tiktok, inf.avg_views_val)),
    1
  );
  
  const scoredInfluencers: ScoredInfluencer[] = filteredInfluencers.map(inf => ({
    ...inf,
    match_score: calculateMatchScore(inf, maxViews),
    computed_type_label: determineTypeLabel(inf),
    is_hospitality_bonus: false,
    estimated_views: getAvgViewsValue(inf.avg_views_tiktok, inf.avg_views_val),
    matched_city: branchCity,
  }));
  
  const paidInfluencers = scoredInfluencers
    .filter(inf => inf.computed_type_label === 'Paid' && (inf.min_price || 0) > 0)
    .sort((a, b) => b.match_score - a.match_score);
  
  const hospitalityInfluencers = scoredInfluencers
    .filter(inf => inf.computed_type_label === 'Hospitality' || (inf.min_price || 0) === 0)
    .sort((a, b) => b.match_score - a.match_score);
  
  console.log(`[MATCH] Paid influencers: ${paidInfluencers.length}, Hospitality: ${hospitalityInfluencers.length}`);
  
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
    matched_city: inf.city_served || (inf.cities?.[0] ?? 'غير محدد'),
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
      selectedInfluencers.push({
        ...influencer,
        is_hospitality_bonus: false,
      });
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

// @ts-ignore - Deno runtime
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();
    
    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[HANDLER] Starting influencer matching for campaign:", campaign_id);

    // SECURITY: Authenticate user and validate campaign ownership
    const authResult = await authenticateAndValidateOwnership(req, campaign_id);
    if (!authResult.success) {
      return authResult.response;
    }

    console.log("[HANDLER] User authenticated and authorized");

    // Use service role for privileged database operations
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
        duration_days,
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

    const branchCity = (campaign.branches as any)?.city || 'الرياض';
    const campaignBudget = campaign.budget || 0;
    const addBonusHospitality = campaign.add_bonus_hospitality ?? false;
    const campaignGoal = campaign.goal as CampaignGoal | null;
    const campaignStartDate = campaign.start_date;
    const campaignDurationDays = campaign.duration_days;

    console.log(`[HANDLER] Parameters: budget=${campaignBudget}, city="${branchCity}", hospitality_bonus=${addBonusHospitality}`);

    // Fetch only APPROVED influencer profiles who have accepted the agreement
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
      `)
      .eq("is_approved", true)
      .eq("agreement_accepted", true);

    if (influencersError) {
      console.error("[HANDLER] Influencers fetch error:", influencersError);
      throw new Error(`Failed to fetch influencers: ${influencersError.message}`);
    }

    if (!influencers || influencers.length === 0) {
      console.warn("[HANDLER] No approved influencers found");
      return new Response(
        JSON.stringify({
          success: true,
          campaign_id: campaign_id,
          message: "No approved influencers available for matching",
          matched_count: 0,
          suggestions: [],
          budget_summary: {
            total_budget: campaignBudget,
            allocated_budget: 0,
            remaining_budget: campaignBudget,
            service_fee: 0,
            total_with_fee: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[HANDLER] Found ${influencers.length} approved influencers`);

    // Run matching algorithm
    const matchedInfluencers = matchInfluencers(
      campaignBudget,
      branchCity,
      addBonusHospitality,
      influencers as Influencer[]
    );

    console.log(`[HANDLER] Matched ${matchedInfluencers.length} influencers`);

    // Assign scheduled dates
    const influencersWithDates = assignInfluencerDates(
      matchedInfluencers,
      campaignStartDate,
      campaignGoal,
      campaignDurationDays
    );

    // Calculate budget summary
    const paidCost = matchedInfluencers
      .filter(inf => inf.computed_type_label === 'Paid')
      .reduce((sum, inf) => sum + (inf.min_price || 0), 0);
    const serviceFee = Math.round(paidCost * 0.15);
    const totalWithFee = paidCost + serviceFee;

    const budgetSummary = {
      total_budget: campaignBudget,
      allocated_budget: paidCost,
      remaining_budget: campaignBudget - paidCost,
      service_fee: serviceFee,
      total_with_fee: totalWithFee,
    };

    // Delete existing suggestions for this campaign
    const { error: deleteError } = await supabase
      .from("campaign_influencer_suggestions")
      .delete()
      .eq("campaign_id", campaign_id);

    if (deleteError) {
      console.warn("[HANDLER] Failed to delete old suggestions:", deleteError);
    }

    // Insert new suggestions
    if (influencersWithDates.length > 0) {
      const suggestions = influencersWithDates.map(inf => ({
        campaign_id: campaign_id,
        influencer_id: inf.id,
        match_score: inf.match_score,
        name: inf.display_name,
        city_served: inf.matched_city,
        platform: inf.primary_platforms?.[0] || 'TikTok',
        content_type: inf.content_type || inf.category,
        min_price: inf.min_price,
        avg_views_val: inf.estimated_views,
        type_label: inf.computed_type_label,
        selected: true,
        scheduled_date: inf.scheduled_date,
        history_type: inf.history_type,
        history_price_cat: inf.history_price_cat,
      }));

      const { error: insertError } = await supabase
        .from("campaign_influencer_suggestions")
        .insert(suggestions);

      if (insertError) {
        console.error("[HANDLER] Failed to insert suggestions:", insertError);
        throw new Error(`Failed to save suggestions: ${insertError.message}`);
      }
    }

    // Update campaign status and budget summary
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        status: "plan_ready",
        budget_summary: budgetSummary,
        algorithm_version: "v2.0",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    if (updateError) {
      console.warn("[HANDLER] Failed to update campaign:", updateError);
    }

    console.log("[HANDLER] Matching completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaign_id,
        matched_count: matchedInfluencers.length,
        budget_summary: budgetSummary,
        suggestions: influencersWithDates.map(inf => ({
          influencer_id: inf.id,
          name: inf.display_name,
          match_score: inf.match_score,
          type_label: inf.computed_type_label,
          min_price: inf.min_price,
          scheduled_date: inf.scheduled_date,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[HANDLER] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
