# Bug Fix: Respect Hospitality Setting When Finding Replacements

## 🐛 Issue Identified

**Problem**: When finding replacement influencers, the system was including hospitality (free) influencers even when the campaign owner did NOT check the "add hospitality bonus" checkbox.

### User's Test Case:
```
Campaign settings:
- Budget: 800 SAR
- Add hospitality bonus: ❌ NOT CHECKED

First influencer (paid, 685 SAR) rejects

System found 2 replacements:
- ❌ Both were FREE (hospitality) influencers
- ✅ Paid influencers existed in database but were not selected

Expected: Should only invite PAID influencers
Actual: Invited FREE influencers instead
```

## 🔍 Root Cause

The `findNewInfluencers()` function in the Edge Function was:
1. ✅ Fetching all influencers from database
2. ✅ Filtering by city
3. ✅ Filtering by budget
4. ❌ **NOT checking the campaign's `add_bonus_hospitality` setting**

**The missing piece**: The function didn't know whether the campaign allowed hospitality influencers or not!

## ✅ Solution Implemented

### 1. Added Hospitality Setting to Campaign Interface

```typescript
interface Campaign {
  id: string;
  budget: number | null;
  goal: string | null;
  start_date: string | null;
  owner_id: string;
  add_bonus_hospitality: boolean | null; // ← ADDED
}
```

### 2. Fetch Campaign's Hospitality Setting

```typescript
const { data: campaign } = await supabase
  .from("campaigns")
  .select(`
    id, 
    budget, 
    goal, 
    start_date, 
    owner_id,
    add_bonus_hospitality,  // ← ADDED
    branches (city, neighborhood)
  `)
  .eq("id", campaignId)
  .single();

const allowHospitality = campaign.add_bonus_hospitality || false;
```

### 3. Pass Setting to Search Function

```typescript
const newInfluencers = await findNewInfluencers(
  supabase,
  campaignId,
  branchCity,
  remainingBudget,
  invitedInfluencerIds,
  allowHospitality  // ← ADDED
);
```

### 4. Filter Based on Hospitality Setting

```typescript
// In findNewInfluencers():
const matchedInfluencers = allInfluencers.filter((inf: any) => {
  // ... city checks ...

  // Check if influencer is paid or free
  const cost = inf.min_price || 0;
  const isPaidInfluencer = cost > 0;

  // ⭐ KEY FIX: If campaign doesn't allow hospitality, exclude free influencers
  if (!allowHospitality && !isPaidInfluencer) {
    console.log(`Excluding ${inf.display_name} - free influencer, but hospitality not allowed`);
    return false;
  }

  // Check budget fit
  if (cost > remainingBudget) {
    return false;
  }

  return true;
});
```

### 5. Improved Sorting Logic

```typescript
// Prioritize paid influencers when hospitality is not allowed
suggestions.sort((a, b) => {
  const priceA = a.min_price || 0;
  const priceB = b.min_price || 0;
  
  // If campaign doesn't allow hospitality, paid influencers come first
  if (!allowHospitality) {
    // Both paid: sort by price (lower first)
    if (priceA > 0 && priceB > 0) return priceA - priceB;
    // A is paid, B is free: A comes first
    if (priceA > 0 && priceB === 0) return -1;
    // A is free, B is paid: B comes first
    if (priceA === 0 && priceB > 0) return 1;
  }
  
  // Default: sort by price
  return priceA - priceB;
});
```

---

## 🎯 How It Works Now

### Campaign WITHOUT Hospitality Bonus

**Setup**:
```
Campaign:
- Budget: 800 SAR
- Add hospitality bonus: ❌ NOT CHECKED
- City: الرياض

Database has:
- Influencer A: 685 SAR (paid) ← Initially matched & invited
- Influencer B: 500 SAR (paid)
- Influencer C: 400 SAR (paid)
- Influencer D: 0 SAR (free/hospitality)
- Influencer E: 0 SAR (free/hospitality)
```

**After A rejects**:
```
Phase 1: Check existing suggestions → None
Phase 2: Search database with allowHospitality = false
  
Filters:
✓ City match: B, C, D, E all in الرياض
✓ Budget fit (≤ 800): All fit
✗ Hospitality check:
  - B (500 SAR): isPaid = true ✓ INCLUDE
  - C (400 SAR): isPaid = true ✓ INCLUDE
  - D (0 SAR): isPaid = false ✗ EXCLUDE (hospitality not allowed)
  - E (0 SAR): isPaid = false ✗ EXCLUDE (hospitality not allowed)

Final candidates: B, C
Sort by price: C (400), B (500)
Pick: C (400 SAR) ✅

Result: Paid influencer C is invited!
```

### Campaign WITH Hospitality Bonus

**Setup**:
```
Campaign:
- Budget: 800 SAR  
- Add hospitality bonus: ✅ CHECKED
- City: الرياض

Database: Same as above
```

**After A rejects**:
```
Phase 2: Search database with allowHospitality = true

Filters:
✓ All pass (including D and E)

Final candidates: B, C, D, E
Sort by price: D (0), E (0), C (400), B (500)
Pick: D (0 SAR) ✅

Result: Free influencer D is invited (budget saved!)
```

---

## 📊 Test Scenarios

### Test 1: Hospitality NOT Allowed

**Steps**:
1. Create campaign (budget: 800, hospitality: ❌)
2. Create influencers:
   - Paid: 500 SAR, 400 SAR
   - Free: 0 SAR (2 influencers)
3. First influencer (685) rejects
4. System searches for replacement

**Expected**:
✅ Finds only paid influencers (500, 400)
✅ Picks cheapest paid one (400 SAR)
✅ Free influencers are excluded from search
✅ Logs show: "Excluding [name] - free influencer, but hospitality not allowed"

### Test 2: Hospitality Allowed

**Steps**:
1. Create campaign (budget: 800, hospitality: ✅)
2. Same influencers as Test 1
3. First influencer rejects

**Expected**:
✅ Finds all influencers (paid + free)
✅ Picks cheapest overall (0 SAR free influencer)
✅ Saves budget for more invitations

### Test 3: No Paid Influencers Available

**Steps**:
1. Create campaign (budget: 800, hospitality: ❌)
2. Only free influencers in database
3. First influencer rejects

**Expected**:
❌ No replacement found
✅ Budget returns to full amount
✅ Logs show: "Found 0 matching new influencers"

---

## 🔍 Debugging

### Check Edge Function Logs

**Look for these lines**:

**Campaign Settings**:
```
[REPLACEMENT] Campaign budget: 800, city: الرياض, hospitality: false
```

**Filtering Process**:
```
[REPLACEMENT] Searching all influencers in database
[REPLACEMENT] City: الرياض, Budget: 800, Allow Hospitality: false
[REPLACEMENT] Found 50 total influencers in database
[REPLACEMENT] Excluding Fatima - free influencer, but hospitality not allowed
[REPLACEMENT] Excluding Sara - free influencer, but hospitality not allowed
[REPLACEMENT] After filtering: 3 matching influencers
```

**Result**:
```
[REPLACEMENT] Found replacement: Ahmad (price: 400)
```

---

## 🎯 Influencer Types Explained

### Paid Influencer
```
min_price: > 0 (e.g., 500 SAR)
Result: Costs money, counted in budget
```

### Hospitality (Free) Influencer
```
min_price: 0 or null
Result: No cost, only included if campaign allows hospitality
```

### Campaign Setting Impact

**`add_bonus_hospitality = false`**:
- Only invites paid influencers (min_price > 0)
- Free influencers are excluded
- All invited influencers cost money

**`add_bonus_hospitality = true`**:
- Invites both paid AND free influencers
- Free influencers are prioritized (sorted first due to 0 cost)
- Better budget utilization

---

## 📋 Logic Summary

### Replacement Search Flow

```typescript
1. Calculate remaining budget
2. Fetch campaign settings (including add_bonus_hospitality)
3. Search for replacements:
   
   Phase 1: Check existing suggestions
   
   Phase 2: Search database
     a. Query all influencers
     b. Filter by city ✓
     c. Filter by budget ✓
     d. Filter by hospitality setting ⭐ NEW
        - If !allowHospitality: Only include min_price > 0
        - If allowHospitality: Include all
     e. Sort by price
     f. Pick best match

4. Create invitation + suggestion
```

---

## ✅ Files Modified

**`supabase/functions/handle-invitation-rejection/index.ts`**:

1. **Added to Campaign interface**:
   - `add_bonus_hospitality: boolean | null`

2. **Updated campaign query**:
   - Fetches `add_bonus_hospitality` field

3. **Updated `findNewInfluencers()` signature**:
   - Added `allowHospitality: boolean` parameter

4. **Added hospitality filtering**:
   - Checks `!allowHospitality && !isPaidInfluencer`
   - Excludes free influencers when not allowed

5. **Improved sorting**:
   - Prioritizes paid influencers when hospitality disabled

6. **Added detailed logging**:
   - Shows why influencers are excluded
   - Shows hospitality setting in logs

---

## 🚀 Deployment

```bash
cd supabase
supabase functions deploy handle-invitation-rejection
```

---

## 🎉 Result

Now the system:
- ✅ Respects campaign's hospitality setting
- ✅ Only invites paid influencers when hospitality is disabled
- ✅ Properly filters by min_price > 0
- ✅ Saves budget by preferring cheaper paid options
- ✅ Shows clear logs explaining filtering decisions

**Your issue is now fixed!** When you create a campaign WITHOUT checking hospitality, only PAID influencers will be invited as replacements. 🎯

---

**Fixed**: December 6, 2024  
**Status**: ✅ Production Ready  
**Breaking Changes**: None  
**Impact**: Behavior now matches user expectations

