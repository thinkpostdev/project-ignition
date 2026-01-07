import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==========================================
// TYPES
// ==========================================

interface CampaignSuggestion {
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
  selected: boolean | null;
  scheduled_date: string | null;
}

interface Invitation {
  id: string;
  campaign_id: string;
  influencer_id: string;
  status: string | null;
  offered_price: number | null;
  scheduled_date: string | null;
}

interface Campaign {
  id: string;
  budget: number | null;
  goal: string | null;
  start_date: string | null;
  duration_days: number | null;
  owner_id: string;
  add_bonus_hospitality: boolean | null;
}

// ==========================================
// AUTHENTICATION HELPER
// ==========================================

async function authenticateInfluencer(
  req: Request,
  rejectedInfluencerId: string
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

  // Verify the user owns the influencer profile that's rejecting
  const { data: influencerProfile, error: profileError } = await supabaseAdmin
    .from('influencer_profiles')
    .select('id, user_id')
    .eq('id', rejectedInfluencerId)
    .single();

  if (profileError || !influencerProfile) {
    console.error("[AUTH] Influencer profile not found:", profileError);
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Forbidden: Influencer profile not found' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  if (influencerProfile.user_id !== user.id) {
    console.error("[AUTH] User is not the influencer profile owner");
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Forbidden: Not the influencer profile owner' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    };
  }

  console.log(`[AUTH] User ${user.id} authorized for influencer ${rejectedInfluencerId}`);
  return { success: true, userId: user.id };
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function determineScheduledDate(
  campaign: Campaign,
  existingInvitations: Invitation[]
): string | null {
  if (!campaign.start_date) {
    return null;
  }

  const durationDays = campaign.duration_days;
  const startDate = new Date(campaign.start_date);
  
  if (isNaN(startDate.getTime())) {
    return null;
  }

  const scheduledDates = existingInvitations
    .map(inv => inv.scheduled_date)
    .filter((date): date is string => date !== null)
    .map(date => new Date(date))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (scheduledDates.length === 0) {
    return campaign.start_date;
  }

  const endDate = durationDays && durationDays > 0
    ? new Date(startDate)
    : null;
  
  if (endDate && durationDays) {
    endDate.setDate(endDate.getDate() + (durationDays - 1));
  }

  if (durationDays && durationDays > 0 && endDate) {
    const latestScheduled = new Date(Math.max(...scheduledDates.map(d => d.getTime())));
    
    if (latestScheduled < endDate) {
      const nextDate = new Date(latestScheduled);
      nextDate.setDate(nextDate.getDate() + 1);
      
      if (nextDate <= endDate) {
        return nextDate.toISOString().split('T')[0];
      }
    }
    
    return endDate.toISOString().split('T')[0];
  } else {
    const latestDate = new Date(Math.max(...scheduledDates.map(d => d.getTime())));
    const nextDate = new Date(latestDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return nextDate.toISOString().split('T')[0];
  }
}

async function findNewInfluencers(
  supabase: any,
  campaignId: string,
  branchCity: string,
  remainingBudget: number,
  excludedInfluencerIds: Set<string>,
  allowHospitality: boolean
): Promise<CampaignSuggestion[]> {
  console.log(`[REPLACEMENT] Searching all APPROVED influencers in database`);
  console.log(`[REPLACEMENT] City: ${branchCity}, Budget: ${remainingBudget}, Allow Hospitality: ${allowHospitality}`);
  
  try {
    const { data: allInfluencers, error } = await supabase
      .from("influencer_profiles")
      .select(`
        id,
        display_name,
        city_served,
        cities,
        content_type,
        category,
        avg_views_val,
        min_price,
        max_price,
        type_label,
        primary_platforms,
        accept_hospitality,
        accept_paid
      `)
      .eq("is_approved", true)
      .eq("agreement_accepted", true);

    if (error || !allInfluencers) {
      console.error("[REPLACEMENT] Error fetching influencers:", error);
      return [];
    }

    console.log(`[REPLACEMENT] Found ${allInfluencers.length} approved influencers in database`);

    const matchedInfluencers = allInfluencers.filter((inf: any) => {
      if (excludedInfluencerIds.has(inf.id)) {
        return false;
      }

      const cities = inf.cities || [];
      const cityMatches = 
        inf.city_served === branchCity ||
        cities.includes(branchCity) ||
        cities.some((c: string) => c.toLowerCase().includes(branchCity.toLowerCase()));

      if (!cityMatches) {
        return false;
      }

      const cost = inf.min_price || 0;
      const isPaidInfluencer = cost > 0;

      if (!allowHospitality && !isPaidInfluencer) {
        console.log(`[REPLACEMENT] Excluding ${inf.display_name} - free influencer, but hospitality not allowed`);
        return false;
      }

      return true;
    });

    console.log(`[REPLACEMENT] Found ${matchedInfluencers.length} matching new influencers`);

    const suggestions: CampaignSuggestion[] = matchedInfluencers.map((inf: any) => ({
      id: `new-${inf.id}`,
      campaign_id: campaignId,
      influencer_id: inf.id,
      match_score: 75,
      name: inf.display_name,
      city_served: inf.city_served,
      platform: inf.primary_platforms?.[0] || 'TikTok',
      content_type: inf.content_type || inf.category,
      min_price: inf.min_price,
      avg_views_val: inf.avg_views_val,
      type_label: inf.type_label,
      selected: false,
      scheduled_date: null,
    }));

    suggestions.sort((a, b) => {
      const priceA = a.min_price || 0;
      const priceB = b.min_price || 0;
      
      if (!allowHospitality) {
        if (priceA > 0 && priceB > 0) return priceA - priceB;
        if (priceA > 0 && priceB === 0) return -1;
        if (priceA === 0 && priceB > 0) return 1;
      }
      
      return priceA - priceB;
    });

    return suggestions;
  } catch (error) {
    console.error("[REPLACEMENT] Exception finding new influencers:", error);
    return [];
  }
}

async function findReplacementInfluencer(
  supabase: any,
  campaignId: string,
  rejectedInfluencerId: string
): Promise<{
  suggestion: CampaignSuggestion | null;
  remainingBudget: number;
  scheduledDate: string | null;
  rejectedInfluencerPrice: number;
}> {
  console.log(`[REPLACEMENT] Finding replacement for campaign ${campaignId}, rejected influencer ${rejectedInfluencerId}`);

  const { data: rejectedInvitations, error: rejectedError } = await supabase
    .from("influencer_invitations")
    .select("offered_price, id, status")
    .eq("campaign_id", campaignId)
    .eq("influencer_id", rejectedInfluencerId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (rejectedError || !rejectedInvitations || rejectedInvitations.length === 0) {
    console.error("[REPLACEMENT] Failed to fetch invitation:", rejectedError);
    throw new Error("Invitation not found for this influencer in this campaign");
  }

  const rejectedInvitation = rejectedInvitations[0];
  const rejectedInfluencerPrice = rejectedInvitation?.offered_price || 0;
  console.log(`[REPLACEMENT] Found invitation: ID=${rejectedInvitation.id}, Price=${rejectedInfluencerPrice}`);

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select(`
      id, 
      budget, 
      goal, 
      start_date,
      duration_days,
      owner_id,
      add_bonus_hospitality,
      branches (
        city,
        neighborhood
      )
    `)
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    console.error("[REPLACEMENT] Failed to fetch campaign:", campaignError);
    throw new Error("Campaign not found");
  }

  const totalBudget = campaign.budget || 0;
  const branchCity = (campaign as any).branches?.city || 'الرياض';
  const allowHospitality = campaign.add_bonus_hospitality || false;
  console.log(`[REPLACEMENT] Campaign budget: ${totalBudget}, city: ${branchCity}`);

  const { data: allInvitations, error: allInvitationsError } = await supabase
    .from("influencer_invitations")
    .select("id, campaign_id, influencer_id, status, offered_price, scheduled_date")
    .eq("campaign_id", campaignId);

  if (allInvitationsError) {
    console.error("[REPLACEMENT] Failed to fetch invitations:", allInvitationsError);
    throw new Error("Failed to fetch invitations");
  }

  const activeInvitations = (allInvitations || []).filter((inv: Invitation) => 
    inv.status === 'pending' || inv.status === 'accepted'
  );
  console.log(`[REPLACEMENT] Active invitations: ${activeInvitations.length}`);

  let usedBudget = 0;
  
  for (const inv of activeInvitations) {
    if (inv.offered_price && inv.offered_price > 0) {
      usedBudget += inv.offered_price;
    } else {
      const { data: suggestion } = await supabase
        .from("campaign_influencer_suggestions")
        .select("min_price")
        .eq("campaign_id", campaignId)
        .eq("influencer_id", inv.influencer_id)
        .single();
      
      if (suggestion && suggestion.min_price) {
        usedBudget += suggestion.min_price;
      }
    }
  }

  const remainingBudget = totalBudget - usedBudget;
  console.log(`[REPLACEMENT] Used budget: ${usedBudget}, Remaining: ${remainingBudget}`);

  if (remainingBudget < rejectedInfluencerPrice) {
    console.log(`[REPLACEMENT] Insufficient budget. Need ${rejectedInfluencerPrice}, have ${remainingBudget}`);
    return { suggestion: null, remainingBudget, scheduledDate: null, rejectedInfluencerPrice };
  }

  const invitedInfluencerIds = new Set<string>(
    (allInvitations || []).map((inv: Invitation) => inv.influencer_id)
  );
  invitedInfluencerIds.add(rejectedInfluencerId);

  console.log(`[REPLACEMENT] Excluding ${invitedInfluencerIds.size} influencers who ever had an invitation`);

  const { data: existingSuggestions } = await supabase
    .from("campaign_influencer_suggestions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("match_score", { ascending: false });

  console.log(`[REPLACEMENT] Existing suggestions: ${existingSuggestions?.length || 0}`);

  let candidateSuggestions = (existingSuggestions || []).filter((sug: CampaignSuggestion) => {
    if (invitedInfluencerIds.has(sug.influencer_id)) return false;
    return true;
  });

  console.log(`[REPLACEMENT] Candidates from existing suggestions: ${candidateSuggestions.length}`);

  if (candidateSuggestions.length === 0) {
    console.log("[REPLACEMENT] No candidates in existing suggestions, searching entire database...");
    const newInfluencers = await findNewInfluencers(
      supabase,
      campaignId,
      branchCity,
      rejectedInfluencerPrice,
      invitedInfluencerIds,
      allowHospitality
    );
    candidateSuggestions = newInfluencers;
    console.log(`[REPLACEMENT] Found ${candidateSuggestions.length} new candidates from database`);
  }

  if (candidateSuggestions.length === 0) {
    console.log("[REPLACEMENT] No suitable replacement found after searching database");
    return { suggestion: null, remainingBudget, scheduledDate: null, rejectedInfluencerPrice };
  }

  const bestReplacement = candidateSuggestions[0] as CampaignSuggestion;
  console.log(`[REPLACEMENT] Found replacement: ${bestReplacement.name} (score: ${bestReplacement.match_score})`);
  console.log(`[REPLACEMENT] Replacement will be paid: ${rejectedInfluencerPrice} SAR`);

  const scheduledDate = determineScheduledDate(campaign, activeInvitations);
  console.log(`[REPLACEMENT] Scheduled date for replacement: ${scheduledDate}`);

  return {
    suggestion: bestReplacement,
    remainingBudget,
    scheduledDate,
    rejectedInfluencerPrice,
  };
}

// ==========================================
// EDGE FUNCTION HANDLER
// ==========================================

// @ts-ignore - Deno runtime
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id, rejected_influencer_id } = await req.json();

    if (!campaign_id || !rejected_influencer_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id and rejected_influencer_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[HANDLER] Processing rejection: campaign=${campaign_id}, influencer=${rejected_influencer_id}`);

    // SECURITY: Authenticate user and validate they own the influencer profile
    const authResult = await authenticateInfluencer(req, rejected_influencer_id);
    if (!authResult.success) {
      return authResult.response;
    }

    console.log("[HANDLER] User authenticated and authorized");

    // Use service role for privileged database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find replacement influencer
    const { suggestion, remainingBudget, scheduledDate, rejectedInfluencerPrice } = await findReplacementInfluencer(
      supabase,
      campaign_id,
      rejected_influencer_id
    );

    if (!suggestion) {
      console.log("[HANDLER] No replacement found");
      
      return new Response(
        JSON.stringify({
          replaced: false,
          message: "No suitable replacement influencer available within budget or criteria",
          remaining_budget: remainingBudget,
          rejected_influencer_price: rejectedInfluencerPrice,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invitation for replacement influencer
    const { data: newInvitation, error: inviteError } = await supabase
      .from("influencer_invitations")
      .insert({
        campaign_id: campaign_id,
        influencer_id: suggestion.influencer_id,
        status: "pending",
        scheduled_date: scheduledDate,
        offered_price: rejectedInfluencerPrice,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("[HANDLER] Failed to create invitation for replacement:", inviteError);
      throw new Error(`Failed to invite replacement: ${inviteError.message}`);
    }

    console.log(`[HANDLER] Created invitation for replacement: ${newInvitation.id}`);

    // If this is a new influencer not in suggestions, add them
    if (suggestion.id.startsWith('new-')) {
      const { error: suggestionError } = await supabase
        .from("campaign_influencer_suggestions")
        .insert({
          campaign_id: campaign_id,
          influencer_id: suggestion.influencer_id,
          match_score: suggestion.match_score,
          name: suggestion.name,
          city_served: suggestion.city_served,
          platform: suggestion.platform,
          content_type: suggestion.content_type,
          min_price: rejectedInfluencerPrice,
          avg_views_val: suggestion.avg_views_val,
          type_label: suggestion.type_label,
          selected: true,
          scheduled_date: scheduledDate,
        });

      if (suggestionError) {
        console.warn("[HANDLER] Failed to add replacement to suggestions:", suggestionError);
      }
    } else {
      // Update existing suggestion to mark as selected
      const { error: updateError } = await supabase
        .from("campaign_influencer_suggestions")
        .update({
          selected: true,
          scheduled_date: scheduledDate,
        })
        .eq("id", suggestion.id);

      if (updateError) {
        console.warn("[HANDLER] Failed to update suggestion:", updateError);
      }
    }

    console.log("[HANDLER] Successfully processed replacement");

    return new Response(
      JSON.stringify({
        replaced: true,
        replacement: {
          influencer_id: suggestion.influencer_id,
          name: suggestion.name,
          scheduled_date: scheduledDate,
          offered_price: rejectedInfluencerPrice,
          invitation_id: newInvitation.id,
        },
        remaining_budget: remainingBudget,
        message: "Replacement influencer found and invited",
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
