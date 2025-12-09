# Quick Start: Automatic Replacement System

## 🚀 Get Started in 5 Minutes

### Step 1: Deploy Database Migration (1 min)
```bash
cd supabase
supabase db push
```

This adds:
- Unique constraint on invitations (prevents duplicates)
- Performance indexes

### Step 2: Deploy Edge Function (2 min)
```bash
supabase functions deploy handle-invitation-rejection
```

Verify in Supabase Dashboard:
- Edge Functions → `handle-invitation-rejection` → Status: Green ✅

### Step 3: Deploy Frontend (2 min)
```bash
npm run build
# Deploy dist/ folder to your hosting
```

### Step 4: Test (5 min)
1. Create test campaign
2. Invite 3 influencers
3. Reject one invitation (as influencer)
4. Verify new invitation created automatically

---

## ✅ Done!

The system is now live. When influencers reject invitations, replacements happen automatically.

---

## 📖 More Info

- **Full Details**: See `AUTOMATIC_REPLACEMENT_SUMMARY_FOR_OWNER.md`
- **User Guide**: See `docs/AUTOMATIC_REPLACEMENT_GUIDE.md`
- **Technical Docs**: See `IMPLEMENTATION_SUMMARY_REPLACEMENT.md`
- **API Reference**: See `supabase/functions/handle-invitation-rejection/README.md`

---

## 🐛 Having Issues?

Check Edge Function logs:
```
Supabase Dashboard → Edge Functions → handle-invitation-rejection → Logs
```

Look for:
```
[REPLACEMENT] Finding replacement...
[REPLACEMENT] Found replacement: Name (score: 85)
```

---

## 📞 Need Help?

Review the troubleshooting section in `AUTOMATIC_REPLACEMENT_SUMMARY_FOR_OWNER.md`

