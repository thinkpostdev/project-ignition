// Edge Function: Process Expired Invitations
// This function checks for invitations that have been pending for more than 48 hours
// and automatically marks them as declined, then triggers replacement logic

import { createClient } from "@supabase/supabase-js";

interface ExpiredInvitation {
  id: string;
  campaign_id: string;
  influencer_id: string;
  created_at: string;
  campaign_title?: string;
}

interface ReplacementResult {
  replaced: boolean;
  message?: string;
  replacement?: any;
}

Deno.serve(async (req: Request) => {
  try {
    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('[EXPIRATION] Starting to process expired invitations...');

    // Find invitations that have been pending for more than 48 hours
    const { data: expiredInvitations, error: fetchError } = await supabase
      .from('influencer_invitations')
      .select(`
        id,
        campaign_id,
        influencer_id,
        created_at,
        campaigns!inner(title)
      `)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .is('responded_at', null)
      .limit(50); // Process in batches

    if (fetchError) {
      console.error('[EXPIRATION] Error fetching expired invitations:', fetchError);
      throw fetchError;
    }

    if (!expiredInvitations || expiredInvitations.length === 0) {
      console.log('[EXPIRATION] No expired invitations found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired invitations to process',
          expired_count: 0 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[EXPIRATION] Found ${expiredInvitations.length} expired invitations`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each expired invitation
    for (const invitation of expiredInvitations) {
      try {
        console.log(`[EXPIRATION] Processing invitation ${invitation.id} for campaign ${invitation.campaign_id}`);

        // Mark invitation as declined
        const { error: updateError } = await supabase
          .from('influencer_invitations')
          .update({
            status: 'declined',
            responded_at: new Date().toISOString(),
          })
          .eq('id', invitation.id);

        if (updateError) {
          console.error(`[EXPIRATION] Error updating invitation ${invitation.id}:`, updateError);
          errorCount++;
          results.push({
            invitation_id: invitation.id,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        console.log(`[EXPIRATION] Marked invitation ${invitation.id} as declined`);

        // Call the replacement logic
        try {
          const replacementResponse = await supabase.functions.invoke(
            'handle-invitation-rejection',
            {
              body: {
                campaign_id: invitation.campaign_id,
                rejected_influencer_id: invitation.influencer_id,
              },
            }
          );

          const replacementResult: ReplacementResult = replacementResponse.data;

          if (replacementResponse.error) {
            console.error(`[EXPIRATION] Replacement error for invitation ${invitation.id}:`, replacementResponse.error);
            results.push({
              invitation_id: invitation.id,
              campaign_id: invitation.campaign_id,
              expired: true,
              replacement_attempted: true,
              replacement_success: false,
              replacement_error: replacementResponse.error.message,
            });
          } else if (replacementResult?.replaced) {
            console.log(`[EXPIRATION] Replacement found for invitation ${invitation.id}`);
            successCount++;
            results.push({
              invitation_id: invitation.id,
              campaign_id: invitation.campaign_id,
              expired: true,
              replacement_found: true,
              replacement: replacementResult.replacement,
            });
          } else {
            console.log(`[EXPIRATION] No replacement available for invitation ${invitation.id}`);
            successCount++;
            results.push({
              invitation_id: invitation.id,
              campaign_id: invitation.campaign_id,
              expired: true,
              replacement_found: false,
              message: replacementResult?.message || 'No replacement available',
            });
          }
        } catch (replacementError) {
          console.error(`[EXPIRATION] Exception during replacement for invitation ${invitation.id}:`, replacementError);
          results.push({
            invitation_id: invitation.id,
            campaign_id: invitation.campaign_id,
            expired: true,
            replacement_attempted: true,
            replacement_error: String(replacementError),
          });
        }

      } catch (error) {
        console.error(`[EXPIRATION] Error processing invitation ${invitation.id}:`, error);
        errorCount++;
        results.push({
          invitation_id: invitation.id,
          success: false,
          error: String(error),
        });
      }
    }

    console.log(`[EXPIRATION] Processed ${expiredInvitations.length} invitations: ${successCount} successful, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${expiredInvitations.length} expired invitations`,
        expired_count: expiredInvitations.length,
        successful: successCount,
        errors: errorCount,
        results,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EXPIRATION] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});

