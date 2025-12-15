# Automatic Invitation Expiration Setup Guide

## Overview

This system automatically marks invitations as declined after 48 hours if the influencer hasn't responded, then automatically finds and invites a replacement influencer.

## Components

### 1. Database Migration
- **File**: `supabase/migrations/20251215_add_invitation_expiration.sql`
- **Purpose**: Creates database function and pg_cron job
- **Function**: `process_expired_invitations()`

### 2. Edge Function
- **File**: `supabase/functions/process-expired-invitations/index.ts`
- **Purpose**: Processes expired invitations and triggers replacement logic
- **Can be called**: Via HTTP or scheduled job

## Setup Instructions

### Step 1: Apply the Database Migration

```bash
# Apply the migration to your database
supabase db push

# Or if using Supabase CLI locally
supabase migration up
```

### Step 2: Deploy the Edge Function

```bash
# Deploy the edge function
supabase functions deploy process-expired-invitations

# Verify deployment
supabase functions list
```

### Step 3: Set Up Scheduled Execution

You have **three options** for scheduling:

#### Option A: Supabase Database Cron (Recommended for Supabase Hosted)

The migration already sets up a pg_cron job. However, on Supabase's hosted platform, you may need to use their cron extension:

```sql
-- Enable the pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that calls the Edge Function
SELECT cron.schedule(
  'process-expired-invitations-hourly',
  '0 * * * *',  -- Every hour
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-expired-invitations',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key (from Supabase dashboard > Settings > API)

#### Option B: GitHub Actions (Free & Reliable)

Create `.github/workflows/process-expired-invitations.yml`:

```yaml
name: Process Expired Invitations

on:
  schedule:
    # Runs every hour
    - cron: '0 * * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  process-invitations:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            ${{ secrets.SUPABASE_URL }}/functions/v1/process-expired-invitations \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

Add these secrets to your GitHub repo:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

#### Option C: External Cron Service

Use services like:
- **Cron-job.org** (Free)
- **EasyCron** (Free tier available)
- **Vercel Cron** (If deployed on Vercel)

Set up an hourly HTTP POST request to:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-expired-invitations
```

With header:
```
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

### Step 4: Test the System

#### Manual Test via CLI
```bash
supabase functions invoke process-expired-invitations --no-verify-jwt
```

#### Manual Test via HTTP
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-expired-invitations \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

#### Create a Test Invitation
```sql
-- Create a test invitation that's already expired (backdated by 49 hours)
INSERT INTO influencer_invitations (
  campaign_id,
  influencer_id,
  status,
  created_at
) VALUES (
  'YOUR_CAMPAIGN_ID',
  'YOUR_INFLUENCER_ID',
  'pending',
  NOW() - INTERVAL '49 hours'
);

-- Then run the function and check if it gets marked as declined
```

## How It Works

### Flow Diagram

```
1. Cron Job Triggers (Every Hour)
          ↓
2. Query for Expired Invitations
   (pending for > 48 hours)
          ↓
3. For Each Expired Invitation:
   ├─ Mark as 'declined'
   ├─ Set responded_at timestamp
   └─ Call handle-invitation-rejection
          ↓
4. handle-invitation-rejection:
   ├─ Find next best replacement
   ├─ Send new invitation
   └─ Update budget if needed
          ↓
5. Return Results Summary
```

### What Happens When an Invitation Expires

1. **Invitation Updated**:
   - `status`: `pending` → `declined`
   - `responded_at`: Set to current timestamp

2. **Replacement Process**:
   - System searches for the next best matching influencer
   - Considers same criteria as original match
   - Prioritizes by match score
   - Sends invitation to replacement

3. **Budget Handling**:
   - If replacement costs less, refund goes to campaign surplus
   - If no replacement found, budget freed for other invitations

## Monitoring

### Check Cron Jobs
```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### Check Function Logs
```bash
# View Edge Function logs
supabase functions logs process-expired-invitations --tail

# Or via Dashboard
# Supabase Dashboard > Edge Functions > process-expired-invitations > Logs
```

### Monitor Expired Invitations
```sql
-- View recently declined invitations (including expired ones)
SELECT 
  ii.id,
  ii.campaign_id,
  ii.influencer_id,
  ii.status,
  ii.created_at,
  ii.responded_at,
  c.title as campaign_title,
  ip.display_name as influencer_name
FROM influencer_invitations ii
JOIN campaigns c ON c.id = ii.campaign_id
JOIN influencer_profiles ip ON ip.id = ii.influencer_id
WHERE 
  ii.status = 'declined'
  AND ii.responded_at > NOW() - INTERVAL '7 days'
ORDER BY ii.responded_at DESC;
```

## Configuration

### Change Expiration Time

To change from 48 hours to a different duration:

1. **In the Edge Function** (`process-expired-invitations/index.ts`):
```typescript
// Change this line:
.lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())

// To (for example, 24 hours):
.lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
```

2. **In the Database Function** (via migration):
```sql
-- Change this line:
AND ii.created_at < (NOW() - INTERVAL '48 hours')

-- To (for example, 24 hours):
AND ii.created_at < (NOW() - INTERVAL '24 hours')
```

Then redeploy:
```bash
supabase functions deploy process-expired-invitations
supabase db push
```

## Troubleshooting

### Cron Job Not Running

**Check if pg_cron is enabled:**
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

**Check cron job status:**
```sql
SELECT * FROM cron.job WHERE jobname = 'process-expired-invitations';
```

**Manually trigger the function:**
```sql
SELECT * FROM process_expired_invitations();
```

### No Invitations Being Processed

**Check for pending invitations older than 48 hours:**
```sql
SELECT 
  id,
  campaign_id,
  created_at,
  status,
  responded_at
FROM influencer_invitations
WHERE 
  status = 'pending'
  AND created_at < NOW() - INTERVAL '48 hours'
  AND responded_at IS NULL;
```

### Edge Function Errors

**Check function logs:**
```bash
supabase functions logs process-expired-invitations --tail
```

**Common issues:**
- Service role key not set correctly
- Network timeout (try reducing batch size)
- Database connection issues

## Best Practices

1. **Monitor Regularly**: Check logs weekly to ensure system is working
2. **Set Up Alerts**: Configure alerts for failed cron jobs
3. **Test Before Deploy**: Always test in staging environment first
4. **Backup Strategy**: Keep database backups before major changes
5. **Document Changes**: Log any configuration changes

## Related Files

- `supabase/functions/handle-invitation-rejection/index.ts` - Replacement logic
- `supabase/functions/match-influencers/index.ts` - Original matching algorithm
- `supabase/migrations/20251208_add_approval_system.sql` - Invitation system setup

## Support

If you encounter issues:
1. Check the logs (database and Edge Function)
2. Verify cron job is scheduled correctly
3. Test manually to isolate the problem
4. Check Supabase dashboard for any service issues

