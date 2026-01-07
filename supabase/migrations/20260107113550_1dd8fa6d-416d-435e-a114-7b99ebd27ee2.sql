-- Add DELETE policy for campaign_influencer_suggestions table
-- Allows owners to delete suggestions for their own campaigns before payment

CREATE POLICY "Owners can delete suggestions for own campaigns" 
ON public.campaign_influencer_suggestions 
FOR DELETE 
USING (
  auth.uid() IN (
    SELECT campaigns.owner_id
    FROM campaigns
    WHERE campaigns.id = campaign_influencer_suggestions.campaign_id
  )
);