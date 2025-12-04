# Create Fake Influencers Script

This script creates 50 fake influencer accounts for testing purposes.

## Quick Start

### Step 1: Get Your Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/nfzndwmccyejwwfbwbpz/settings/api
2. Scroll down to "Project API keys"
3. Copy the **"service_role"** key (⚠️ Keep this secret!)

### Step 2: Set the Service Role Key

In your terminal, run:
```bash
export SUPABASE_SERVICE_ROLE_KEY="paste-your-service-role-key-here"
```

### Step 3: Run the Script

```bash
npm run create-fake-influencers
```

That's it! The script will automatically:
- Read your Supabase URL from the existing `.env` file
- Use the service role key you just exported
- Create 50 fake influencer accounts

## What It Creates

The script will create 50 fake influencer accounts with the following specs:

- **Names**: سعد خالد - مزيف1, سعد خالد - مزيف2, ... سعد خالد - مزيف50
- **Cities**: Random between خميس مشيط and أبها
- **Platform**: TikTok only
- **Collaboration Type**: 
  - 80% accept paid collaborations (with random prices 500-10,000 SAR)
  - 20% accept hospitality only
- **Other Details**: Random categories, content types, and view ranges

## Login Credentials

After creation, you can log in to any fake account using:
- **Email**: `fake-influencer-{1-50}@test.com` (e.g., fake-influencer-1@test.com)
- **Password**: `Test123456!`

## Example Usage

```bash
# Set environment variables
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Run the script
npm run create-fake-influencers
```

## Troubleshooting

### "Missing environment variables" error
Make sure you have set both `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

### Permission errors
The script uses the service role key which has admin permissions to create users.

### Rate limiting
The script includes a small delay between each account creation to avoid rate limiting.

