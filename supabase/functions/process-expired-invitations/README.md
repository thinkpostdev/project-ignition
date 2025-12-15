# Process Expired Invitations Edge Function

## Overview

This Edge Function automatically processes invitations that have been pending for more than 48 hours without a response from the influencer. When an invitation expires, it:

1. Marks the invitation as `declined`
2. Updates the `responded_at` timestamp
3. Triggers the automatic replacement logic to find and invite a new influencer

## How It Works

### Expiration Logic

An invitation is considered expired when:
- Status is `pending`
- Created more than 48 hours ago
- No response from influencer (`responded_at` is NULL)

### Automatic Processing

The function:
1. Queries for all expired invitations (up to 50 at a time for batch processing)
2. For each expired invitation:
   - Updates status to `declined`
   - Sets `responded_at` to current timestamp
   - Calls `handle-invitation-rejection` to find a replacement influencer
3. Returns a summary of all processed invitations

## Scheduling

This function should be called periodically. You can set it up to run:

### Option 1: Using Supabase Cron (Recommended)
```sql
-- Runs every hour
SELECT cron.schedule(
  'process-expired-invitations-edge',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/process-expired-invitations',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
  $$
);
```

### Option 2: External Cron Service
Use a service like:
- GitHub Actions
- Vercel Cron
- EasyCron
- Your own server cron

To call:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/process-expired-invitations \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Processed 5 expired invitations",
  "expired_count": 5,
  "successful": 4,
  "errors": 1,
  "results": [
    {
      "invitation_id": "uuid",
      "campaign_id": "uuid",
      "expired": true,
      "replacement_found": true,
      "replacement": {
        "new_influencer_id": "uuid",
        "new_invitation_id": "uuid"
      }
    }
  ]
}
```

### No Expired Invitations
```json
{
  "success": true,
  "message": "No expired invitations to process",
  "expired_count": 0
}
```

## Deployment

Deploy this function using:

```bash
supabase functions deploy process-expired-invitations
```

## Testing

Test manually by calling:

```bash
supabase functions invoke process-expired-invitations --no-verify-jwt
```

Or via HTTP:
```bash
curl -X POST \
  http://localhost:54321/functions/v1/process-expired-invitations \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Monitoring

Check function logs:
```bash
supabase functions logs process-expired-invitations
```

## Configuration

- **Expiration Time**: 48 hours (hardcoded in the function)
- **Batch Size**: 50 invitations per run (to prevent timeouts)
- **Recommended Schedule**: Every hour

## Related Functions

- `handle-invitation-rejection`: Called to find replacement influencers
- `match-influencers`: Original matching algorithm
- `send-approved-invitations`: Sends invitations to influencers

## Notes

- The function uses the service role key for admin access
- Invitations are processed in batches to avoid timeouts
- Failed replacements are logged but don't stop the entire process
- Each expired invitation triggers the same replacement logic as manual rejections

