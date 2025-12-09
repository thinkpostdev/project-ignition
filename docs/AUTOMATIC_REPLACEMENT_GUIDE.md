# Automatic Influencer Replacement - Quick Reference

## 📋 Overview

When an influencer rejects a campaign invitation, the system automatically finds and invites the next best-matching influencer within budget.

---

## 🔄 How It Works

```
Influencer Rejects → System Checks Budget → Finds Best Replacement → Sends New Invitation
```

### Step-by-Step Flow

1. **Influencer Action**: Clicks "رفض" (Reject) button in dashboard
2. **Status Update**: Invitation marked as `declined`
3. **Budget Check**: System calculates remaining budget
4. **Search**: Looks for best-scoring available influencer
5. **Invite**: Creates new invitation automatically
6. **Result**: Owner sees new influencer in campaign list

---

## 💰 Budget Rules

### What Counts Against Budget?
- ✅ **Pending** invitations (awaiting response)
- ✅ **Accepted** invitations (confirmed)
- ❌ **Declined** invitations (rejected - freed up)
- ❌ **Cancelled** invitations (cancelled by owner)

### Replacement Selection
- Must fit within **remaining budget**
- Picks **highest match score** among valid candidates
- Cannot invite someone **already invited** to this campaign

---

## 📅 Scheduling Rules

### Opening Campaigns (`goal = 'opening'`)
All influencers visit on **same day** (campaign start date)
```
Campaign Start: Jan 15
Influencer A: Jan 15
Influencer B: Jan 15
Replacement: Jan 15  ← Same date
```

### Other Campaigns (promotions, new products, etc.)
Influencers visit **sequentially** (one per day)
```
Campaign Start: Jan 15
Influencer A: Jan 15
Influencer B: Jan 16
Influencer C: Jan 17
Replacement: Jan 18  ← Next available day
```

---

## 🎯 Replacement Criteria

An influencer qualifies as a replacement if:

1. ✅ In the campaign's suggestion pool
2. ✅ NOT already invited (any status)
3. ✅ Cost ≤ remaining budget
4. ✅ Highest match score among qualifiers

**Priority Order**:
1. Match score (higher is better)
2. Cost (lower is better, if scores equal)

---

## 🚫 When NO Replacement Happens

Replacement will NOT occur if:

- ❌ No budget remaining
- ❌ All suitable influencers already invited
- ❌ Remaining budget < cheapest available influencer
- ❌ No suggestions generated for campaign

**In these cases**: Rejection still succeeds, but no new invitation sent.

---

## 👁️ Owner View

### Before Rejection
```
Campaign: Grand Opening
Budget: 5,000 SAR
Invited:
  ├─ Ahmad (pending) - 1,500 SAR
  ├─ Sara (accepted) - 2,000 SAR
  └─ Mohammed (pending) - 1,200 SAR
Remaining: 300 SAR
```

### After Mohammed Rejects
```
Campaign: Grand Opening
Budget: 5,000 SAR
Invited:
  ├─ Ahmad (pending) - 1,500 SAR
  ├─ Sara (accepted) - 2,000 SAR
  ├─ Mohammed (declined) - strikethrough
  └─ Fatima (pending) - 1,000 SAR  ← AUTO-INVITED
Remaining: 500 SAR
```

---

## 🔧 Technical Details

### Edge Function
**Name**: `handle-invitation-rejection`
**Trigger**: Called from `InfluencerDashboard.tsx` on rejection
**Runtime**: ~200-500ms
**Permission**: Service role (bypasses RLS)

### Database Tables
- `campaigns` - Budget and goal info
- `influencer_invitations` - All invitations
- `campaign_influencer_suggestions` - Ranked candidates

### Key Code Locations
```
Frontend:
  src/pages/dashboard/InfluencerDashboard.tsx
  → handleRejectInvitation()

Backend:
  supabase/functions/handle-invitation-rejection/index.ts
  → findReplacementInfluencer()
  → determineScheduledDate()

Types:
  src/domain/matching/types.ts
  → RejectionHandlerRequest
  → RejectionHandlerResponse
```

---

## 🐛 Troubleshooting

### "No replacement found" message

**Possible Causes**:
1. Budget exhausted
2. All candidates already invited
3. No suggestions match budget
4. Campaign has no suggestions

**How to Check**:
- View campaign detail page
- Check "Strategy Summary" section
- Look at remaining budget
- See list of suggestions

### Replacement has wrong date

**Check**:
- Campaign goal type (opening vs. other)
- Other invitations' scheduled dates
- Campaign start date is set

**Fix**:
- Update campaign goal if incorrect
- Set campaign start_date
- Manually adjust date if needed

### Duplicate invitations

**Should Not Happen** - protected by unique constraint
- Database prevents duplicate (campaign, influencer) pairs
- If occurs, contact support with campaign ID

---

## 📊 Monitoring

### Success Metrics
- **Replacement Rate**: % of rejections that result in replacement
- **Budget Efficiency**: % of budget utilized with replacements
- **Response Time**: Average time from rejection to new invite

### View Logs
Supabase Dashboard → Edge Functions → `handle-invitation-rejection` → Logs

**Look for**:
```
[REPLACEMENT] Finding replacement for campaign XXX
[REPLACEMENT] Remaining budget: 1500
[REPLACEMENT] Candidate replacements: 5
[REPLACEMENT] Found replacement: Name (score: 85)
```

---

## ✅ Testing Checklist

Before deploying to production:

- [ ] Create test campaign with 5+ matched influencers
- [ ] Invite 3 influencers
- [ ] Have one influencer reject
- [ ] Verify new invitation created automatically
- [ ] Check budget calculation is correct
- [ ] Verify scheduled date is appropriate
- [ ] Test with exhausted budget (no replacement)
- [ ] Test with opening campaign (same date)
- [ ] Test with sequential campaign (next date)

---

## 📞 Support

### For Owners
If automatic replacement isn't working:
1. Refresh campaign detail page
2. Check remaining budget
3. Contact support with campaign ID

### For Developers
- Review Edge Function logs
- Check invitation statuses in database
- Verify campaign has suggestions
- Ensure budget data is accurate

### Contact
- Technical Issues: [your-tech-support]
- Feature Requests: [your-product-team]
- Bug Reports: [your-bug-tracker]

---

## 🎓 FAQs

**Q: Can an influencer be re-invited after declining?**
A: No, not automatically. The system excludes previously invited influencers (any status).

**Q: What if replacement also rejects?**
A: System runs again and finds another replacement (if available).

**Q: Does this cost extra API calls?**
A: Minimal - 4-6 database queries per rejection (~$0.00001 cost).

**Q: Can I disable automatic replacement?**
A: Not currently, but it's fail-safe (never overbudget).

**Q: What happens to unused budget?**
A: Tracked as "remaining budget" - shown in campaign summary. Future feature: allow reallocation.

**Q: Can I see replacement history?**
A: Currently no. Future enhancement: track replacement chains.

---

## 🚀 Future Enhancements

Planned features:
- [ ] Owner notification when replacement happens
- [ ] Influencer notification on auto-invite
- [ ] Replacement analytics dashboard
- [ ] Smart replacement strategies (prefer hospitality, etc.)
- [ ] Bulk replacement for multiple rejections
- [ ] Budget reallocation rules

---

**Last Updated**: December 6, 2024
**Version**: 1.0
**Status**: Production Ready ✅

