import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  owner_id: string;
  add_bonus_hospitality: boolean | null;
}

/**
 * Campaign goals that affect date scheduling behavior.
 */
type CampaignGoal = 'opening' | 'promotions' | 'new_products' | 'other';

/**
 * Determines the next scheduled date for a replacement influencer.
 * For 'opening' goal, use the campaign start date (all visit same day).
 * For other goals, find the next available date after the last scheduled influencer.
 */
function determineScheduledDate(
  campaign: Campaign,
  existingInvitations: Invitation[]
): string | null {
  if (!campaign.start_date) {
    return null;
  }

  const goal = campaign.goal as CampaignGoal | null;
  
  // For opening campaigns, everyone gets the same date
  if (goal === 'opening') {
    return campaign.start_date;
  }

  // For other campaigns, find the latest scheduled date and add 1 day
  const scheduledDates = existingInvitations
    .map(inv => inv.scheduled_date)
    .filter((date): date is string => date !== null)
    .map(date => new Date(date))
    .filter(date => !isNaN(date.getTime()));

  if (scheduledDates.length === 0) {
    // No scheduled dates yet, use campaign start date
    return campaign.start_date;
  }

  // Find the latest date and add 1 day
  const latestDate = new Date(Math.max(...scheduledDates.map(d => d.getTime())));
  const nextDate = new Date(latestDate);
  nextDate.setDate(nextDate.getDate() + 1);
  
  return nextDate.toISOString().split('T')[0];
}

/**
 * Searches for NEW influencers from the entire database.
 * This goes beyond existing suggestions to find fresh candidates.
 */
async function findNewInfluencers(
  supabase: any,
  campaignId: string,
  branchCity: string,
  remainingBudget: number,
  excludedInfluencerIds: Set<string>,
  allowHospitality: boolean
): Promise<CampaignSuggestion[]> {
  console.log(`[REPLACEMENT] Searching all influencers in database`);
  console.log(`[REPLACEMENT] City: ${branchCity}, Budget: ${remainingBudget}, Allow Hospitality: ${allowHospitality}`);
  
  try {
    // Query ALL influencers from the system
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
      `);

    if (error || !allInfluencers) {
      console.error("[REPLACEMENT] Error fetching influencers:", error);
      return [];
    }

    console.log(`[REPLACEMENT] Found ${allInfluencers.length} total influencers in database`);

    // Filter influencers that match criteria
    const matchedInfluencers = allInfluencers.filter((inf: any) => {
      // Exclude already-invited
      if (excludedInfluencerIds.has(inf.id)) {
        return false;
      }

      // Check city match
      const cities = inf.cities || [];
      const cityMatches = 
        inf.city_served === branchCity ||
        cities.includes(branchCity) ||
        cities.some((c: string) => c.toLowerCase().includes(branchCity.toLowerCase()));

      if (!cityMatches) {
        return false;
      }

      // Check if influencer is paid or free
      const cost = inf.min_price || 0;
      const isPaidInfluencer = cost > 0;

      // If campaign doesn't allow hospitality, ONLY include paid influencers (cost > 0)
      if (!allowHospitality && !isPaidInfluencer) {
        console.log(`[REPLACEMENT] Excluding ${inf.display_name} - free influencer, but hospitality not allowed in campaign`);
        return false;
      }

      // NOTE: We don't check the influencer's min_price against budget here
      // because the replacement will be paid the rejected influencer's price,
      // regardless of their usual rate. Budget check is done at the campaign level.

      return true;
    });

    console.log(`[REPLACEMENT] Found ${matchedInfluencers.length} matching new influencers`);

    console.log(`[REPLACEMENT] After filtering: ${matchedInfluencers.length} matching influencers`);

    // Convert to CampaignSuggestion format
    const suggestions: CampaignSuggestion[] = matchedInfluencers.map((inf: any) => ({
      id: `new-${inf.id}`, // Temporary ID
      campaign_id: campaignId,
      influencer_id: inf.id,
      match_score: 75, // Default score for new matches
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

    // Sort by price (lower first) for better budget utilization
    // Paid influencers (min_price > 0) come before free ones
    suggestions.sort((a, b) => {
      const priceA = a.min_price || 0;
      const priceB = b.min_price || 0;
      
      // If campaign doesn't allow hospitality, prioritize paid
      if (!allowHospitality) {
        // Both paid: sort by price
        if (priceA > 0 && priceB > 0) return priceA - priceB;
        // A is paid, B is free: A comes first
        if (priceA > 0 && priceB === 0) return -1;
        // A is free, B is paid: B comes first
        if (priceA === 0 && priceB > 0) return 1;
      }
      
      // Default: sort by price (lower first)
      return priceA - priceB;
    });

    return suggestions;
  } catch (error) {
    console.error("[REPLACEMENT] Exception finding new influencers:", error);
    return [];
  }
}

/**
 * Finds a suitable replacement influencer for a rejected invitation.
 * 
 * NEW Logic:
 * 1. Get the rejected influencer's price (this will be the price for replacement)
 * 2. Calculate remaining budget
 * 3. RE-RUN matching algorithm to get fresh candidates
 * 4. Get list of already-invited influencer IDs
 * 5. Query NEW suggestions, excluding already-invited
 * 6. Pick best-scoring suggestion (ignoring their min_price)
 * 7. Return null if no suitable replacement found
 */
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

  // 1. Fetch the invitation to get the original price
  // NOTE: We don't filter by status because there's a race condition - 
  // the frontend calls this function immediately after updating status,
  // but the DB update might not be committed yet. So we just get any invitation.
  const { data: rejectedInvitations, error: rejectedError } = await supabase
    .from("influencer_invitations")
    .select("offered_price, id, status")
    .eq("campaign_id", campaignId)
    .eq("influencer_id", rejectedInfluencerId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (rejectedError || !rejectedInvitations || rejectedInvitations.length === 0) {
    console.error("[REPLACEMENT] Failed to fetch invitation:", rejectedError);
    console.error("[REPLACEMENT] Campaign ID:", campaignId, "Influencer ID:", rejectedInfluencerId);
    throw new Error("Invitation not found for this influencer in this campaign");
  }

  const rejectedInvitation = rejectedInvitations[0];
  const rejectedInfluencerPrice = rejectedInvitation?.offered_price || 0;
  console.log(`[REPLACEMENT] Found invitation: ID=${rejectedInvitation.id}, Status=${rejectedInvitation.status}, Price=${rejectedInfluencerPrice}`);
  console.log(`[REPLACEMENT] Replacement will be offered the same price: ${rejectedInfluencerPrice} SAR`);

  // 2. Fetch campaign details with branch info
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select(`
      id, 
      budget, 
      goal, 
      start_date, 
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
  console.log(`[REPLACEMENT] Campaign budget: ${totalBudget}, city: ${branchCity}, hospitality: ${allowHospitality}`);

  // 3. Fetch ALL invitations for this campaign (to exclude everyone who ever had an invitation)
  const { data: allInvitations, error: allInvitationsError } = await supabase
    .from("influencer_invitations")
    .select("id, campaign_id, influencer_id, status, offered_price, scheduled_date")
    .eq("campaign_id", campaignId);

  if (allInvitationsError) {
    console.error("[REPLACEMENT] Failed to fetch invitations:", allInvitationsError);
    throw new Error("Failed to fetch invitations");
  }

  // Active invitations are only pending/accepted (for budget calculation)
  const activeInvitations = (allInvitations || []).filter(inv => 
    inv.status === 'pending' || inv.status === 'accepted'
  );
  console.log(`[REPLACEMENT] Active invitations: ${activeInvitations.length}`);
  console.log(`[REPLACEMENT] Total invitations (including rejected): ${allInvitations?.length || 0}`);

  // 4. Calculate remaining budget
  // For each invitation, use offered_price if available, otherwise fetch min_price from suggestion
  let usedBudget = 0;
  
  for (const inv of activeInvitations) {
    if (inv.offered_price && inv.offered_price > 0) {
      usedBudget += inv.offered_price;
    } else {
      // Fetch the suggestion to get the min_price
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

  // Check if we have budget for the rejected influencer's price
  if (remainingBudget < rejectedInfluencerPrice) {
    console.log(`[REPLACEMENT] Insufficient budget. Need ${rejectedInfluencerPrice}, have ${remainingBudget}`);
    return { suggestion: null, remainingBudget, scheduledDate: null, rejectedInfluencerPrice };
  }

  // 5. Get IDs of ALL influencers who ever had an invitation (to exclude from consideration)
  // This prevents sending invitations back to previously rejected influencers!
  const invitedInfluencerIds = new Set(
    (allInvitations || []).map(inv => inv.influencer_id)
  );
  
  // Also ensure the current rejected influencer is excluded
  invitedInfluencerIds.add(rejectedInfluencerId);

  console.log(`[REPLACEMENT] Excluding ${invitedInfluencerIds.size} influencers who ever had an invitation`);

  // 6. Query existing suggestions for this campaign
  const { data: existingSuggestions } = await supabase
    .from("campaign_influencer_suggestions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("match_score", { ascending: false });

  console.log(`[REPLACEMENT] Existing suggestions: ${existingSuggestions?.length || 0}`);

  // 7. Filter existing suggestions (only exclude already-invited, ignore their min_price)
  // We'll pay them the rejected influencer's price regardless of their usual rate
  let candidateSuggestions = (existingSuggestions || []).filter((sug: CampaignSuggestion) => {
    if (invitedInfluencerIds.has(sug.influencer_id)) return false;
    return true;
  });

  console.log(`[REPLACEMENT] Candidates from existing suggestions: ${candidateSuggestions.length}`);

  // 8. If no candidates from existing suggestions, search ALL influencers
  if (candidateSuggestions.length === 0) {
    console.log("[REPLACEMENT] No candidates in existing suggestions, searching entire database...");
    const newInfluencers = await findNewInfluencers(
      supabase,
      campaignId,
      branchCity,
      rejectedInfluencerPrice, // Pass the rejected price for budget display purposes
      invitedInfluencerIds,
      allowHospitality
    );
    candidateSuggestions = newInfluencers;
    console.log(`[REPLACEMENT] Found ${candidateSuggestions.length} new candidates from database`);
  }

  // 9. Check if we have any candidates
  if (candidateSuggestions.length === 0) {
    console.log("[REPLACEMENT] No suitable replacement found after searching database");
    return { suggestion: null, remainingBudget, scheduledDate: null, rejectedInfluencerPrice };
  }

  // Pick the best-scoring candidate (they'll get paid the rejected influencer's price)
  const bestReplacement = candidateSuggestions[0] as CampaignSuggestion;
  console.log(`[REPLACEMENT] Found replacement: ${bestReplacement.name} (score: ${bestReplacement.match_score})`);
  console.log(`[REPLACEMENT] Replacement will be paid: ${rejectedInfluencerPrice} SAR (rejected influencer's price)`);

  // 10. Determine scheduled date for replacement
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id, rejected_influencer_id } = await req.json();

    if (!campaign_id || !rejected_influencer_id) {
      throw new Error("campaign_id and rejected_influencer_id are required");
    }

    console.log(`[HANDLER] Processing rejection: campaign=${campaign_id}, influencer=${rejected_influencer_id}`);

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
      console.log("[HANDLER] No replacement found - budget remains unchanged");
      
      // IMPORTANT: Budget should NEVER change after initial payment!
      // Budget = original matched BASE total (constant)
      // When no replacement found:
      //   - Budget stays the same
      //   - activeCost decreases (fewer active influencers)  
      //   - remaining increases automatically (remaining = budget - activeCost)
      //
      // The rejected amount is NOT "refunded" - it just becomes "unused" 
      // and shows in the "remaining" amount. Owner paid upfront for the 
      // original team × 1.2, and any unused portion stays in campaign scope.
      
      console.log(`[HANDLER] Rejected price ${rejectedInfluencerPrice} SAR will show in 'remaining'`);
      console.log(`[HANDLER] Budget stays constant at original matched BASE total`);
      
      return new Response(
        JSON.stringify({
          success: true,
          replaced: false,
          refunded: false,
          message: `No replacement found. Amount will appear in campaign remaining budget.`,
          rejected_amount: rejectedInfluencerPrice,
          rejected_amount_with_fee: rejectedInfluencerPrice * 1.2,
          remaining_budget: remainingBudget,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new invitation for replacement influencer with the SAME price as rejected influencer
    const { data: newInvitation, error: inviteError } = await supabase
      .from("influencer_invitations")
      .insert({
        campaign_id,
        influencer_id: suggestion.influencer_id,
        status: "pending",
        offered_price: rejectedInfluencerPrice, // Use rejected influencer's price
        scheduled_date: scheduledDate,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("[HANDLER] Failed to create replacement invitation:", inviteError);
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    console.log(`[HANDLER] Successfully created replacement invitation: ${newInvitation.id}`);

    // If this is a NEW influencer (found from database search), create suggestion record
    let suggestionId = suggestion.id;
    if (suggestion.id.startsWith('new-')) {
      console.log("[HANDLER] Creating new suggestion record for newly found influencer");
      const { data: newSuggestion, error: suggestionError } = await supabase
        .from("campaign_influencer_suggestions")
        .insert({
          campaign_id,
          influencer_id: suggestion.influencer_id,
          match_score: suggestion.match_score,
          name: suggestion.name,
          city_served: suggestion.city_served,
          platform: suggestion.platform,
          content_type: suggestion.content_type,
          min_price: rejectedInfluencerPrice, // Use rejected influencer's price for consistency
          avg_views_val: suggestion.avg_views_val,
          type_label: suggestion.type_label,
          selected: true,
          scheduled_date: scheduledDate,
        })
        .select()
        .single();

      if (suggestionError) {
        console.error("[HANDLER] Error creating suggestion:", suggestionError);
        // Continue anyway - invitation is already created
      } else {
        suggestionId = newSuggestion.id;
        console.log(`[HANDLER] Created new suggestion: ${suggestionId}`);
      }
    } else {
      // Mark existing suggestion as selected
      await supabase
        .from("campaign_influencer_suggestions")
        .update({ selected: true })
        .eq("id", suggestion.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        replaced: true,
        message: "Replacement influencer invited successfully with same price as rejected influencer",
        replacement: {
          invitation_id: newInvitation.id,
          influencer_id: suggestion.influencer_id,
          influencer_name: suggestion.name,
          cost: rejectedInfluencerPrice, // Same price as rejected influencer
          match_score: suggestion.match_score,
          scheduled_date: scheduledDate,
        },
        remaining_budget: remainingBudget - rejectedInfluencerPrice,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[HANDLER] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

