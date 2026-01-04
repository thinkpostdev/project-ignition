import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  // Create client with user's JWT to validate token and get user
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  
  if (authError || !user) {
    console.error("[AUTH] Invalid or expired token:", authError);
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  console.log(`[AUTH] Authenticated user: ${user.id}`);

  // Verify campaign ownership using user's session (RLS will enforce)
  const { data: campaign, error: campaignError } = await supabaseClient
    .from('campaigns')
    .select('owner_id')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    console.error("[AUTH] Campaign not found or access denied:", campaignError);
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Forbidden: Campaign not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  if (campaign.owner_id !== user.id) {
    console.error("[AUTH] User is not the campaign owner");
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: 'Forbidden: Not the campaign owner' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    };
  }

  console.log(`[AUTH] User ${user.id} authorized for campaign ${campaignId}`);
  return { success: true, userId: user.id };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-approved-invitations] Processing campaign: ${campaign_id}`);

    // SECURITY: Authenticate user and validate campaign ownership
    const authResult = await authenticateAndValidateOwnership(req, campaign_id);
    if (!authResult.success) {
      return authResult.response;
    }

    console.log("[send-approved-invitations] User authenticated and authorized");

    // Use service role for privileged database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verify campaign exists and payment is approved
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, payment_approved, payment_submitted_at')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error('[send-approved-invitations] Campaign not found:', campaignError);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!campaign.payment_approved) {
      console.error('[send-approved-invitations] Payment not approved for campaign:', campaign_id);
      return new Response(
        JSON.stringify({ error: 'Payment not approved for this campaign' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get all selected suggestions that haven't been invited yet
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('campaign_influencer_suggestions')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('selected', true);

    if (suggestionsError) {
      console.error('[send-approved-invitations] Error fetching suggestions:', suggestionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-approved-invitations] Found ${suggestions?.length || 0} selected suggestions`);

    if (!suggestions || suggestions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No suggestions to invite', invitations_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check which influencers already have invitations
    const { data: existingInvitations } = await supabase
      .from('influencer_invitations')
      .select('influencer_id')
      .eq('campaign_id', campaign_id);

    const existingInfluencerIds = new Set(
      (existingInvitations || []).map(inv => inv.influencer_id)
    );

    // 4. Filter out suggestions that already have invitations
    const newSuggestions = suggestions.filter(
      s => !existingInfluencerIds.has(s.influencer_id)
    );

    console.log(`[send-approved-invitations] Sending invitations to ${newSuggestions.length} new influencers`);

    if (newSuggestions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'All invitations already sent', invitations_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Create invitations
    const invitations = newSuggestions.map(s => ({
      campaign_id: campaign_id,
      influencer_id: s.influencer_id,
      status: 'pending' as const,
      scheduled_date: s.scheduled_date,
      offered_price: s.min_price || 0,
    }));

    const { error: insertError } = await supabase
      .from('influencer_invitations')
      .insert(invitations);

    if (insertError) {
      console.error('[send-approved-invitations] Error creating invitations:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitations', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-approved-invitations] Successfully created ${invitations.length} invitations`);

    return new Response(
      JSON.stringify({
        success: true,
        invitations_sent: invitations.length,
        campaign_id: campaign_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-approved-invitations] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
