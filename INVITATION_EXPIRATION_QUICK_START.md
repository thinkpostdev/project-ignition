# Invitation Expiration - Quick Start Guide

## What This Does

⏰ Automatically marks invitations as declined after 48 hours if influencer doesn't respond  
🔄 Automatically finds and invites a replacement influencer  
💰 Manages budget adjustments automatically

## Quick Setup (5 minutes)

### 1. Deploy the Code

```bash
# Apply database migration
supabase db push

# Deploy edge function
supabase functions deploy process-expired-invitations
```

### 2. Set Up Automation (Choose One)

#### Option A: GitHub Actions (Recommended) ⭐

1. Add these secrets to your GitHub repository:
   - Go to: Settings → Secrets and variables → Actions
   - Add `SUPABASE_URL`: Your Supabase project URL
   - Add `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

2. The workflow file is already included at `.github/workflows/process-expired-invitations.yml`

3. That's it! It will run automatically every hour.

#### Option B: Manual Cron Setup

Run this SQL in Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'process-expired-invitations-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/process-expired-invitations',
      headers := jsonb_build_object(
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      )
    );
  $$
);
```

Replace `YOUR_PROJECT` and `YOUR_SERVICE_ROLE_KEY` with your values.

### 3. Test It

```bash
# Test the function manually
supabase functions invoke process-expired-invitations
```

## How to Verify It's Working

### Check GitHub Actions (if using Option A)

1. Go to your GitHub repo
2. Click "Actions" tab
3. Look for "Process Expired Invitations" workflow
4. Check that it runs successfully every hour

### Check Database

```sql
-- See recently expired invitations
SELECT 
  id,
  campaign_id,
  status,
  created_at,
  responded_at
FROM influencer_invitations
WHERE 
  status = 'declined'
  AND responded_at > NOW() - INTERVAL '24 hours'
  AND (responded_at - created_at) >= INTERVAL '47 hours';
```

### Check Function Logs

```bash
supabase functions logs process-expired-invitations --tail
```

## Quick Reference

### Expiration Time
- **Default:** 48 hours
- **Change:** Edit `supabase/functions/process-expired-invitations/index.ts`

### Check Frequency
- **Default:** Every hour
- **Change:** Edit `.github/workflows/process-expired-invitations.yml`

### Manual Trigger
```bash
supabase functions invoke process-expired-invitations
```

## What Happens When Invitation Expires

```
1. Invitation marked as "declined"
2. System searches for next best match
3. New invitation sent to replacement
4. Budget adjusted if needed
5. Campaign continues smoothly
```

## Troubleshooting

### GitHub Action Failing?

**Check:**
- ✅ Secrets are set correctly (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- ✅ Edge function is deployed
- ✅ Database migration is applied

### Not Processing Invitations?

**Check:**
```sql
-- Are there any pending invitations older than 48 hours?
SELECT COUNT(*) 
FROM influencer_invitations 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '48 hours';
```

If count is 0, the system is working correctly!

### Need Help?

1. Check logs: `supabase functions logs process-expired-invitations`
2. Review full documentation: `INVITATION_EXPIRATION_SETUP.md`
3. Check feature details: `docs/INVITATION_EXPIRATION_FEATURE.md`

## That's It! 🎉

Your invitation expiration system is now set up and will run automatically.

**Key Points:**
- ⏰ Runs every hour
- 🔄 48-hour expiration window
- 🤖 Fully automatic
- 💰 Budget-aware
- 📊 Logged and trackable

