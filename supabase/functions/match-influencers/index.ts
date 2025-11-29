import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_id } = await req.json();
    console.log("Starting influencer matching for campaign:", campaign_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(`
        *,
        owner_profiles (
          business_name,
          main_type,
          sub_category,
          price_level,
          cities,
          target_audience
        )
      `)
      .eq("id", campaign_id)
      .single();

    if (campaignError) {
      console.error("Campaign fetch error:", campaignError);
      throw new Error(`Failed to fetch campaign: ${campaignError.message}`);
    }

    console.log("Campaign fetched:", campaign.title);

    // Fetch all influencer profiles
    const { data: influencers, error: influencersError } = await supabase
      .from("influencer_profiles")
      .select("*");

    if (influencersError) {
      console.error("Influencers fetch error:", influencersError);
      throw new Error(`Failed to fetch influencers: ${influencersError.message}`);
    }

    console.log(`Found ${influencers?.length || 0} influencers to analyze`);

    if (!influencers || influencers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No influencers found to match",
          suggestions: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare data for AI analysis
    const campaignContext = {
      title: campaign.title,
      description: campaign.description,
      goal: campaign.goal,
      budget: campaign.budget,
      duration_days: campaign.duration_days,
      business_type: campaign.owner_profiles?.main_type,
      sub_category: campaign.owner_profiles?.sub_category,
      price_level: campaign.owner_profiles?.price_level,
      target_cities: campaign.owner_profiles?.cities,
      target_audience: campaign.owner_profiles?.target_audience,
      target_followers_min: campaign.target_followers_min,
      target_followers_max: campaign.target_followers_max,
      target_engagement_min: campaign.target_engagement_min,
      add_bonus_hospitality: campaign.add_bonus_hospitality,
    };

    const influencersData = influencers.slice(0, 50).map(inf => ({
      id: inf.id,
      name: inf.display_name,
      instagram_handle: inf.instagram_handle,
      cities: inf.cities,
      city_served: inf.city_served,
      category: inf.category,
      content_type: inf.content_type,
      primary_platforms: inf.primary_platforms,
      avg_views_val: inf.avg_views_val,
      min_price: inf.min_price,
      max_price: inf.max_price,
      accept_hospitality: inf.accept_hospitality,
      accept_paid: inf.accept_paid,
      type_label: inf.type_label,
      history_type: inf.history_type,
      history_price_cat: inf.history_price_cat,
      avg_views_instagram: inf.avg_views_instagram,
      avg_views_tiktok: inf.avg_views_tiktok,
      avg_views_snapchat: inf.avg_views_snapchat,
    }));

    console.log("Calling AI for matching analysis...");

    // Call Lovable AI for intelligent matching
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert influencer marketing analyst specializing in matching restaurants/cafes with food influencers in Saudi Arabia. 
Analyze campaign requirements and influencer profiles to suggest the top 5-15 best matches based on:
1. Location/city compatibility (highest priority)
2. Budget alignment (very important)
3. Content category and type fit
4. Platform match
5. Historical performance and price category
6. Engagement levels and reach

Consider:
- If campaign offers hospitality bonus, include influencers who accept hospitality
- Match business type (restaurant/cafe) with influencer experience
- Consider price level compatibility
- Prefer influencers in the same cities as the business

Return suggestions ordered by match quality (best first).`
          },
          {
            role: "user",
            content: `Campaign Details:\n${JSON.stringify(campaignContext, null, 2)}\n\nAvailable Influencers:\n${JSON.stringify(influencersData, null, 2)}\n\nAnalyze and return the top 5-15 best influencer matches for this campaign.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_influencers",
              description: "Return 5-15 top influencer suggestions ranked by match quality",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        influencer_id: { type: "string", description: "The influencer's UUID" },
                        match_score: { type: "number", description: "Match score 0-100" },
                        reason: { type: "string", description: "Why this influencer is a good match" }
                      },
                      required: ["influencer_id", "match_score", "reason"],
                      additionalProperties: false
                    },
                    minItems: 5,
                    maxItems: 15
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_influencers" } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits depleted. Please add credits to continue.");
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    console.log("AI analysis complete");

    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_influencers") {
      throw new Error("AI did not return expected tool call");
    }

    const aiSuggestions = JSON.parse(toolCall.function.arguments).suggestions;
    console.log(`AI suggested ${aiSuggestions.length} influencers`);

    // Prepare suggestions for database with full influencer details
    const suggestionsToInsert = aiSuggestions.map((suggestion: any) => {
      const influencer = influencers.find(inf => inf.id === suggestion.influencer_id);
      if (!influencer) return null;

      return {
        campaign_id,
        influencer_id: influencer.id,
        match_score: suggestion.match_score,
        name: influencer.display_name,
        city_served: influencer.city_served,
        platform: influencer.primary_platforms?.[0] || null,
        content_type: influencer.content_type,
        min_price: influencer.min_price,
        avg_views_val: influencer.avg_views_val,
        type_label: influencer.type_label,
        history_type: influencer.history_type,
        history_price_cat: influencer.history_price_cat,
        selected: false,
      };
    }).filter(Boolean);

    // Insert suggestions into database
    const { error: insertError } = await supabase
      .from("campaign_influencer_suggestions")
      .insert(suggestionsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save suggestions: ${insertError.message}`);
    }

    console.log(`Successfully saved ${suggestionsToInsert.length} suggestions`);

    // Update campaign status to plan_ready
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({ 
        status: "plan_ready",
        algorithm_version: "v1.0-ai-gemini"
      })
      .eq("id", campaign_id);

    if (updateError) {
      console.error("Campaign update error:", updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        suggestions_count: suggestionsToInsert.length,
        message: "Influencer matching completed successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Match influencers error:", error);
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
