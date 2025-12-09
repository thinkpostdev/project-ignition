# Bug Fix: Invitation Status Display in Campaign Detail

## 🐛 Issue Found

When testing the automatic replacement flow, the following issues were discovered:

1. **Status not updating visually**: When an influencer declined an invitation, the suggestion still showed "تم الإرسال" (Sent) badge instead of showing "مرفوض" (Declined)

2. **No visual distinction**: Declined invitations looked the same as pending/accepted ones

3. **Replacement not visible**: When a replacement influencer was invited, it wasn't immediately obvious in the UI

## 🔍 Root Cause

The `CampaignDetail.tsx` page was displaying **suggestions** (from `campaign_influencer_suggestions` table) with only the `selected` boolean flag, which indicated if an invitation was sent, but didn't reflect the actual invitation status (pending, accepted, declined, cancelled).

**Problem**:
- Suggestions showed `selected: true` even after influencer declined
- The actual invitation status was stored in `influencer_invitations` table but wasn't being displayed
- No join between suggestions and invitations

## ✅ Solution Implemented

### 1. Fetch Invitation Status
Updated `fetchSuggestions()` to also fetch invitation statuses:

```typescript
// Before: Only fetched suggestions
const { data } = await supabase
  .from('campaign_influencer_suggestions')
  .select('*')
  .eq('campaign_id', id);

// After: Fetch suggestions + invitation statuses
const { data: suggestionsData } = await supabase
  .from('campaign_influencer_suggestions')
  .select('*')
  .eq('campaign_id', id);

const { data: invitationsData } = await supabase
  .from('influencer_invitations')
  .select('id, influencer_id, status')
  .eq('campaign_id', id);

// Merge status into suggestions
const invitationMap = new Map(
  (invitationsData || []).map(inv => [inv.influencer_id, inv.status])
);

const suggestionsWithStatus = suggestionsData.map(sug => ({
  ...sug,
  invitation_status: invitationMap.get(sug.influencer_id) || null,
  invitation_id: invitationMap.get(sug.influencer_id)?.id || null
}));
```

### 2. Display Different Status Badges
Replaced single "تم الإرسال" badge with status-specific badges:

```typescript
{/* Pending */}
{suggestion.invitation_status === 'pending' && (
  <Badge variant="outline" className="bg-blue-100 text-blue-700">
    <Clock className="h-3 w-3 me-1" />
    في الانتظار
  </Badge>
)}

{/* Accepted */}
{suggestion.invitation_status === 'accepted' && (
  <Badge variant="default" className="bg-emerald-600">
    <CheckCircle2 className="h-3 w-3 me-1" />
    مقبول
  </Badge>
)}

{/* Declined */}
{suggestion.invitation_status === 'declined' && (
  <Badge variant="outline" className="bg-red-100 text-red-700">
    <X className="h-3 w-3 me-1" />
    مرفوض
  </Badge>
)}

{/* Cancelled */}
{suggestion.invitation_status === 'cancelled' && (
  <Badge variant="outline" className="bg-gray-100 text-gray-700">
    <X className="h-3 w-3 me-1" />
    ملغي
  </Badge>
)}
```

### 3. Visual Styling for Declined Invitations
Added visual feedback for declined invitations:

- **Card opacity**: Declined cards have 60% opacity
- **Red border**: Border changes to red for declined
- **Strikethrough name**: Influencer name gets line-through
- **Strikethrough date**: Visit date also gets strikethrough

```typescript
<Card 
  className={`
    ${suggestion.invitation_status === 'declined' 
      ? 'opacity-60 border-red-200 dark:border-red-800/50' 
      : ''
    }
  `}
>
  <h4 className={`
    ${suggestion.invitation_status === 'declined' 
      ? 'line-through text-muted-foreground' 
      : ''
    }
  `}>
    {suggestion.name}
  </h4>
```

### 4. Updated Button Logic
Fixed "اعتماد الجميع" (Approve All) button to only count uninvited influencers:

```typescript
// Before: Used suggestion.selected
const pendingSuggestions = suggestions.filter(s => !s.selected);

// After: Use invitation_status
const pendingSuggestions = suggestions.filter(s => !s.invitation_status);
```

## 📊 Visual Changes

### Before
```
[✓ تم الإرسال] سعد خالد - مرزيقية
```

### After - Pending
```
[🕐 في الانتظار] سعد خالد - مرزيقية
```

### After - Accepted
```
[✓ مقبول] سعد خالد - مرزيقية
```

### After - Declined
```
[✗ مرفوض] ~~سعد خالد - مرزيقية~~ (faded, red border)
```

## 🧪 Testing the Fix

### Test Scenario 1: Rejection Flow
1. **Create campaign** with 5+ matched influencers
2. **Invite influencers** (e.g., 3 influencers)
3. **As influencer**, reject one invitation
4. **As owner**, refresh campaign detail page
5. **Expected Result**:
   - ✅ Declined influencer shows "مرفوض" badge (red)
   - ✅ Name is crossed out
   - ✅ Card is faded (60% opacity)
   - ✅ If replacement found: New influencer shows "في الانتظار" badge (blue)

### Test Scenario 2: Acceptance Flow
1. **As influencer**, accept an invitation
2. **As owner**, refresh campaign detail page
3. **Expected Result**:
   - ✅ Accepted influencer shows "مقبول" badge (green)
   - ✅ Name is normal (not crossed out)
   - ✅ Card is normal opacity

### Test Scenario 3: Multiple Statuses
1. Have campaign with:
   - 2 pending invitations
   - 1 accepted invitation
   - 1 declined invitation
   - 2 uninvited suggestions
2. **Expected Result**:
   - ✅ Pending: Blue "في الانتظار" badge
   - ✅ Accepted: Green "مقبول" badge
   - ✅ Declined: Red "مرفوض" badge, faded, crossed out
   - ✅ Uninvited: No badge, editable date
   - ✅ "اعتماد الجميع" button shows count of 2 uninvited

### Test Scenario 4: Replacement Chain
1. Start with 5 influencers, invite 3
2. Influencer A declines → Replacement D invited
3. Influencer D declines → Replacement E invited
4. **Expected Result**:
   - ✅ A: مرفوض (faded, crossed out)
   - ✅ D: مرفوض (faded, crossed out)
   - ✅ E: في الانتظار (normal, blue badge)
   - ✅ Other 2: Still pending or accepted

## 📁 Files Modified

1. **`src/pages/dashboard/owner/CampaignDetail.tsx`**
   - Updated `CampaignSuggestion` interface (added `invitation_status`, `invitation_id`)
   - Modified `fetchSuggestions()` to fetch and merge invitation statuses
   - Replaced status badge logic (4 different statuses instead of 1)
   - Added visual styling for declined invitations
   - Updated `handleApproveAll()` logic
   - Updated button count logic

## 🎯 Status Enum Values

From `invitation_status` enum:
- `'pending'` - Invited, awaiting influencer response
- `'accepted'` - Influencer accepted invitation
- `'declined'` - Influencer rejected invitation
- `'cancelled'` - Owner cancelled invitation

## 🔄 Data Flow

```
1. Influencer Dashboard
   └─> Clicks "رفض" (Reject)
   └─> Updates invitation: status = 'declined'
   └─> Calls Edge Function: handle-invitation-rejection
   
2. Edge Function
   └─> Calculates remaining budget
   └─> Finds best replacement
   └─> Creates new invitation: status = 'pending'
   
3. Owner Campaign Detail (BEFORE FIX)
   └─> Fetches suggestions only
   └─> Shows: suggestion.selected ? "تم الإرسال" : nothing
   └─> ❌ Doesn't show actual invitation status
   
4. Owner Campaign Detail (AFTER FIX)
   └─> Fetches suggestions + invitation statuses
   └─> Merges data
   └─> Shows correct status badge:
       - pending → "في الانتظار" (blue)
       - accepted → "مقبول" (green)
       - declined → "مرفوض" (red, faded, crossed out)
       - cancelled → "ملغي" (gray)
```

## 🚀 Deployment

No migration needed - this is a frontend-only fix.

**Deploy**:
```bash
npm run build
# Deploy dist/ folder
```

**Test**:
1. Create test campaign
2. Invite influencers
3. Reject invitation (as influencer)
4. Refresh campaign detail (as owner)
5. Verify statuses display correctly

## ✅ Success Criteria

- [x] Declined invitations show "مرفوض" badge
- [x] Accepted invitations show "مقبول" badge
- [x] Pending invitations show "في الانتظار" badge
- [x] Declined invitations are visually distinct (faded, crossed out)
- [x] Replacement invitations appear with "في الانتظار" badge
- [x] "اعتماد الجميع" button only counts uninvited influencers
- [x] No linter errors
- [x] Backward compatible (no breaking changes)

## 📝 Notes

- **Real-time updates**: Owner needs to refresh page to see status changes
  - Future enhancement: Add real-time subscription using Supabase Realtime
  
- **Multiple replacements**: If multiple influencers decline, each will show "مرفوض" and their replacements will show "في الانتظار"

- **Budget display**: The strategy summary still reflects the total budget allocation - declined invitations free up budget which is used for replacements

---

**Fixed**: December 6, 2024
**Status**: ✅ Ready for Testing
**Impact**: Frontend only, no database changes

