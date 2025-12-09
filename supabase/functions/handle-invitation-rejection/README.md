# Handle Invitation Rejection Edge Function

## Purpose

This Edge Function automatically handles influencer invitation rejections and attempts to find a suitable replacement influencer.

## Workflow

When an influencer rejects a campaign invitation:

1. **Mark as Declined**: The invitation status is updated to `declined` in the database
2. **Calculate Remaining Budget**: The function calculates how much budget is left after accounting for all active (pending + accepted) invitations
3. **Find Replacement**: Searches for a replacement influencer that:
   - Hasn't already been invited to this campaign
   - Fits within the remaining budget
   - Has the highest match score among available candidates
4. **Create New Invitation**: If a suitable replacement is found:
   - Creates a new invitation record with status `pending`
   - Marks the suggestion as `selected`
   - Assigns an appropriate scheduled date based on campaign goal
5. **Return Result**: Returns information about whether a replacement was found and budget status

## API

### Request

```typescript
{
  campaign_id: string;           // UUID of the campaign
  rejected_influencer_id: string; // UUID of the influencer who rejected
}
```

### Response (Replacement Found)

```typescript
{
  success: true,
  replaced: true,
  message: "Replacement influencer invited successfully",
  replacement: {
    invitation_id: string;
    influencer_id: string;
    influencer_name: string;
    cost: number;
    match_score: number;
    scheduled_date: string | null;
  },
  remaining_budget: number;
}
```

### Response (No Replacement Available)

```typescript
{
  success: true,
  replaced: false,
  message: "No suitable replacement influencer found within budget",
  remaining_budget: number;
}
```

## Budget Logic

The function considers these invitations as "using" budget:
- Status: `pending` (invited but not yet responded)
- Status: `accepted` (confirmed participation)

The cost per invitation is determined by:
1. `offered_price` field if set on the invitation
2. Otherwise, `min_price` from the campaign suggestion

## Scheduling Logic

For replacement influencers, the scheduled date is determined by:
- **Opening campaigns** (`goal = 'opening'`): Use campaign start date (all influencers visit same day)
- **Other campaigns**: Find the latest scheduled date among active invitations and add 1 day (sequential visits)

## Database Tables Used

- `campaigns` - Campaign details and budget
- `influencer_invitations` - Tracks all invitations
- `campaign_influencer_suggestions` - Ranked candidates from matching algorithm
- `influencer_profiles` (indirectly) - Influencer information via suggestions

## RLS Considerations

This function runs with service role key, bypassing RLS. It has full access to:
- Read campaign details
- Read all invitations for a campaign
- Read suggestions for a campaign
- Create new invitation records
- Update suggestion selection status

## Error Handling

The function is designed to be non-blocking:
- If replacement fails, the original rejection is still recorded
- Errors are logged but don't prevent invitation status update
- Returns structured error responses for debugging

## Usage Example

From the influencer dashboard:

```typescript
// When influencer clicks reject
const { error } = await supabase.functions.invoke(
  'handle-invitation-rejection',
  {
    body: {
      campaign_id: invitation.campaign_id,
      rejected_influencer_id: invitation.influencer_id,
    },
  }
);
```

## Testing

To test this function:

1. Create a campaign with multiple matched influencers
2. Send invitations to some influencers
3. Have an influencer reject the invitation
4. Verify:
   - Invitation marked as `declined`
   - New invitation created for next-best influencer (if budget allows)
   - Budget correctly calculated
   - Owner sees the replacement in their campaign detail view

## Future Enhancements

Potential improvements:
- Notification to owner when replacement happens
- Notification to new influencer about invitation
- Track replacement chain (which influencer replaced whom)
- Analytics on rejection/replacement rates
- Configurable replacement strategy (e.g., prefer hospitality influencers for replacements)

