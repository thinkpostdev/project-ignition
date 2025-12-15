#!/bin/bash

# Setup script for automatic invitation expiration system
# This script helps deploy and configure the invitation expiration feature

set -e

echo "🚀 Setting up Invitation Expiration System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it first:${NC}"
    echo "   npm install -g supabase"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Applying database migration...${NC}"
supabase db push
echo -e "${GREEN}✓ Migration applied${NC}"
echo ""

echo -e "${BLUE}🚀 Step 2: Deploying Edge Function...${NC}"
supabase functions deploy process-expired-invitations
echo -e "${GREEN}✓ Edge Function deployed${NC}"
echo ""

echo -e "${BLUE}🔧 Step 3: Getting project details...${NC}"
PROJECT_REF=$(supabase status | grep "API URL" | awk '{print $3}' | sed 's/https:\/\///' | sed 's/.supabase.co//')

if [ -z "$PROJECT_REF" ]; then
    echo -e "${YELLOW}⚠️  Could not auto-detect project ref${NC}"
    echo "Please manually note your project details from: supabase status"
else
    echo -e "${GREEN}✓ Project Ref: $PROJECT_REF${NC}"
fi
echo ""

echo -e "${BLUE}📋 Step 4: Setup Instructions${NC}"
echo ""
echo "Choose one of the following options to schedule the function:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Option A: GitHub Actions (Recommended)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Create file: .github/workflows/process-expired-invitations.yml"
echo "2. Add this content:"
echo ""
cat << 'EOF'
name: Process Expired Invitations
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Call Function
        run: |
          curl -X POST \
            ${{ secrets.SUPABASE_URL }}/functions/v1/process-expired-invitations \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
EOF
echo ""
echo "3. Add GitHub secrets:"
echo "   SUPABASE_URL"
echo "   SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Option B: Database Cron (Supabase Hosted)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run this SQL in your Supabase SQL Editor:"
echo ""
echo "SELECT cron.schedule("
echo "  'process-expired-invitations-hourly',"
echo "  '0 * * * *',"
echo "  \$\$"
echo "    SELECT net.http_post("
echo "      url := 'https://YOUR_PROJECT.supabase.co/functions/v1/process-expired-invitations',"
echo "      headers := jsonb_build_object("
echo "        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'"
echo "      )"
echo "    );"
echo "  \$\$"
echo ");"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}Option C: External Cron Service${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Use a service like cron-job.org and set up an hourly request to:"
if [ ! -z "$PROJECT_REF" ]; then
    echo "  https://$PROJECT_REF.supabase.co/functions/v1/process-expired-invitations"
else
    echo "  https://YOUR_PROJECT.supabase.co/functions/v1/process-expired-invitations"
fi
echo ""
echo "With Authorization header:"
echo "  Bearer YOUR_SERVICE_ROLE_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}🧪 Step 5: Test the function${NC}"
echo ""
echo "To test manually, run:"
echo -e "${YELLOW}  supabase functions invoke process-expired-invitations${NC}"
echo ""
echo "Or via curl:"
if [ ! -z "$PROJECT_REF" ]; then
    echo -e "${YELLOW}  curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/process-expired-invitations \\${NC}"
else
    echo -e "${YELLOW}  curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/process-expired-invitations \\${NC}"
fi
echo -e "${YELLOW}    -H \"Authorization: Bearer YOUR_SERVICE_ROLE_KEY\"${NC}"
echo ""

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📖 For detailed documentation, see:"
echo "   INVITATION_EXPIRATION_SETUP.md"
echo ""
echo "💡 Tips:"
echo "   - Invitations expire after 48 hours of no response"
echo "   - Expired invitations trigger automatic replacement"
echo "   - Monitor logs: supabase functions logs process-expired-invitations"
echo ""

