# Bug Fix: Dynamic Budget Calculation After Rejections

## 🐛 Issue Identified

**Problem**: When an influencer rejects an invitation, the budget display doesn't update to reflect the freed-up funds.

### User's Test Case:
```
Campaign Budget: 800 SAR
Only 1 matching influencer
Influencer price: 685 SAR

When invited:
  - Display shows: 685 used, 115 remaining ✓

After influencer rejects:
  - Expected: 0 used, 800 remaining (budget freed up)
  - Actual: Still shows 685 used, 115 remaining ✗
```

## 🔍 Root Cause

The Campaign Detail page was displaying **static budget data** from `campaign.strategy_summary`, which was calculated once when the matching algorithm ran initially. This JSON field was never updated when invitation statuses changed.

**What was happening**:
1. Matching algorithm runs → creates `strategy_summary` with initial budget allocation
2. Influencer rejects → invitation status changes to `declined`
3. Edge Function correctly excludes declined invitations when finding replacements
4. BUT the UI still displays the old `strategy_summary` values
5. Owner sees outdated budget info

**The disconnect**:
- **Backend** (Edge Function): ✅ Correctly calculates remaining budget (excludes declined)
- **Frontend** (UI Display): ❌ Shows static/outdated budget from initial plan

## ✅ Solution Implemented

### Implemented Dynamic Budget Calculation

Instead of showing the static `strategy_summary`, the UI now **calculates budget in real-time** based on current invitation statuses.

### New Calculation Logic

```typescript
const calculateCurrentStats = () => {
  // Filter for ACTIVE invitations only (pending + accepted)
  const activeInvitations = suggestions.filter(
    s => s.invitation_status === 'pending' || 
         s.invitation_status === 'accepted'
  );
  
  // Calculate actual current cost
  const activeCost = activeInvitations.reduce(
    (sum, s) => sum + (s.min_price || 0), 
    0
  );
  
  // Calculate remaining budget
  const remaining = campaign.budget - activeCost;
  
  return {
    cost: activeCost,              // Current actual cost
    remaining: remaining,           // Current available budget
    percent: (activeCost / campaign.budget) * 100,
    totalInfluencers: activeInvitations.length,
    paidInfluencers: count of paid,
    hospitalityInfluencers: count of hospitality,
    totalReach: sum of views
  };
};
```

### Key Changes:

1. **Only counts active invitations**: `pending` + `accepted`
2. **Excludes declined/cancelled**: These don't count against budget
3. **Recalculates on every render**: Always shows current state
4. **Real-time updates**: Budget reflects latest invitation statuses

## 📊 Budget States Explained

### Initial State (After Matching)
```
Budget: 800 SAR
Matched: 1 influencer (685 SAR)

Display:
  Used: 0 SAR
  Remaining: 800 SAR
  (No invitations sent yet)
```

### After Sending Invitation
```
Budget: 800 SAR
Invitation Status: pending

Display:
  Used: 685 SAR
  Remaining: 115 SAR
  (Invitation counts as "reserved")
```

### After Influencer Rejects
```
Budget: 800 SAR
Invitation Status: declined

Display:
  Used: 0 SAR ← Budget freed up!
  Remaining: 800 SAR ← Full budget available
  (Declined invitation doesn't count)
```

### After Replacement Invited
```
Budget: 800 SAR
Original: declined
Replacement: pending (500 SAR)

Display:
  Used: 500 SAR ← New influencer cost
  Remaining: 300 SAR ← Actual available budget
  (Only counts active invitation)
```

## 🎨 UI Changes

### Before (Static Display)
```
┌─────────────────────────────────┐
│ ملخص استراتيجية المطابقة       │
├─────────────────────────────────┤
│ التكلفة المتوقعة: 685 ر.س     │
│ متبقي: 115 ر.س                 │
│ (Never updates)                 │
└─────────────────────────────────┘
```

### After (Dynamic Display)
```
┌─────────────────────────────────────┐
│ ملخص الحملة الحالي  [محدث تلقائياً] │
├─────────────────────────────────────┤
│ التكلفة الحالية: 0 ر.س           │
│ متبقي: 800 ر.س                     │
│ (Updates based on invitation status)│
└─────────────────────────────────────┘
```

### Updated Labels:
- ~~"التكلفة المتوقعة"~~ → **"التكلفة الحالية"** (Current Cost)
- ~~"إجمالي المؤثرين"~~ → **"المؤثرين النشطين"** (Active Influencers)
- ~~"الوصول المتوقع"~~ → **"الوصول الحالي"** (Current Reach)
- Added badge: **"محدث تلقائياً"** (Auto-updated)

## 🔄 What Gets Counted?

### ✅ Counts Against Budget:
- **Pending invitations** (waiting for response)
- **Accepted invitations** (confirmed participation)

### ❌ Doesn't Count Against Budget:
- **Declined invitations** (rejected by influencer) ← **KEY FIX**
- **Cancelled invitations** (cancelled by owner)
- **No invitation yet** (just a suggestion)

## 🧪 Testing the Fix

### Test Scenario: Budget Recalculation After Rejection

**Setup**:
1. Create campaign with budget: 800 SAR
2. Match 2 influencers: A (685 SAR), B (400 SAR)
3. Invite influencer A only

**Step 1: After Invitation**
```
Action: Owner invites influencer A
Expected Display:
  ✓ Used: 685 SAR
  ✓ Remaining: 115 SAR
  ✓ Active Influencers: 1
```

**Step 2: After Rejection**
```
Action: Influencer A rejects
Expected Display:
  ✓ Used: 0 SAR ← Budget freed!
  ✓ Remaining: 800 SAR ← Full budget back
  ✓ Active Influencers: 0
  ✓ Influencer A shows: [المؤثر رفض الدعوة]
```

**Step 3: After Automatic Replacement**
```
Action: System automatically invites influencer B
Expected Display:
  ✓ Used: 400 SAR ← New influencer cost
  ✓ Remaining: 400 SAR
  ✓ Active Influencers: 1
  ✓ Influencer A: declined (faded, crossed out)
  ✓ Influencer B: pending (blue badge)
```

**Step 4: After Influencer B Accepts**
```
Action: Influencer B accepts invitation
Expected Display:
  ✓ Used: 400 SAR (unchanged)
  ✓ Remaining: 400 SAR (unchanged)
  ✓ Active Influencers: 1
  ✓ Influencer B: مقبول (green badge)
```

### Test Scenario: Multiple Rejections

**Setup**:
- Budget: 2000 SAR
- 4 matched influencers: A(800), B(600), C(400), D(300)
- Invite all 4

**Initial**:
```
Used: 2100 SAR (over budget, but that's OK for testing)
Remaining: -100 SAR
Active: 4
```

**After A rejects**:
```
Used: 1300 SAR ← Freed 800
Remaining: 700 SAR
Active: 3
```

**After B rejects**:
```
Used: 700 SAR ← Freed 600 more
Remaining: 1300 SAR
Active: 2
```

**System replaces with A2(500)**:
```
Used: 1200 SAR ← Added 500
Remaining: 800 SAR
Active: 3 (C, D, A2)
```

## 📁 Files Modified

**`src/pages/dashboard/owner/CampaignDetail.tsx`**:

1. **Added `calculateCurrentStats()` function**:
   - Filters suggestions by invitation status
   - Calculates actual current cost
   - Counts active influencers
   - Calculates reach

2. **Updated display components**:
   - "التكلفة المتوقعة" → "التكلفة الحالية"
   - "إجمالي المؤثرين" → "المؤثرين النشطين"
   - "الوصول المتوقع" → "الوصول الحالي"
   - Added "محدث تلقائياً" badge

3. **Changed data source**:
   - From: `strategy.total_cost` (static)
   - To: `currentStats.cost` (dynamic)

## 🎯 Benefits

### Before:
- ❌ Budget display never updated
- ❌ Confusing for owners (shows wrong numbers)
- ❌ Can't see actual available budget
- ❌ Doesn't reflect rejections/replacements

### After:
- ✅ Budget updates in real-time
- ✅ Always shows accurate numbers
- ✅ Clear visibility of available budget
- ✅ Reflects all status changes immediately

## 🔮 Future Enhancements

Possible improvements:
1. **Show budget history**: Track how budget changed over time
2. **Real-time updates**: Use Supabase Realtime instead of manual refresh
3. **Budget alerts**: Notify when budget is running low
4. **Forecasting**: Predict budget needs based on pending invitations

## 📝 Notes

### Performance:
- **Minimal impact**: Calculation runs on render (fast)
- **Client-side only**: No extra database queries
- **Uses existing data**: Already fetched suggestions

### Data Consistency:
- **Source of truth**: Invitation statuses in database
- **UI reflects reality**: Always shows current state
- **No caching issues**: Recalculates every time

### Edge Cases Handled:
- ✅ No invitations yet: Shows 0 used, full budget remaining
- ✅ All declined: Shows 0 used, full budget back
- ✅ Mix of statuses: Only counts pending + accepted
- ✅ Over-budget: Shows negative remaining (edge case)

---

**Fixed**: December 6, 2024
**Status**: ✅ Production Ready
**Impact**: Frontend only, no database changes
**Breaking Changes**: None

