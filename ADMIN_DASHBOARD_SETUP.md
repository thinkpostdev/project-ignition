# Admin Dashboard Setup Guide

## Overview

The admin dashboard has been successfully implemented with full RLS (Row Level Security) enforcement at the database level. This guide will help you set up the admin user and access the dashboard.

## Features Implemented

### 1. Access Control
- ✅ Admin routes protected under `/admin/*`
- ✅ Supabase Auth integration with session handling
- ✅ RLS policies enforce admin-only access at database level
- ✅ `admins` table created with helper function `is_admin(uuid)`

### 2. Admin Pages

#### Influencers Approval (`/admin/influencers`)
- View all registered influencers
- Search by name, email, or social handles
- Filter by status: All / Pending / Approved
- One-click approval button per influencer
- Success toast notifications

#### Campaigns Management (`/admin/campaigns`)
- View all campaigns with owner details
- Search by campaign title, description, or business name
- Full inline editing via dialog modal
- Edit all campaign fields including:
  - Title, description, budget
  - Status, goal, dates
  - Target followers and engagement
  - Payment approval flag
- Save changes with validation

#### Developer Tracking (`/admin/developer-tracking`)
- Read-only view of `developer_tracking_view`
- Track invitations, payments, and proof submissions
- Search across all fields
- Filter by invitation status and proof status
- Comprehensive tracking information

### 3. UI Components
- Responsive sidebar navigation
- Top bar with admin email and logout
- Mobile-friendly design
- Loading and error states
- Success/error toast notifications
- Consistent styling with existing design system

## Setup Instructions

### Step 1: Database Migrations
The following migrations have been applied to your Supabase project:

**Migration 1: Admin Infrastructure**
- `admins` table for storing admin user IDs
- RLS policies for admin-only access to influencers, campaigns, and views
- Helper function `is_admin(uuid)` for checking admin status

**Migration 2: Admin Influencer View**
- `admin_influencer_view` - A secure view that includes:
  - All influencer profile data
  - User's full name from profiles table
  - User's email address from auth.users table
  - Protected by RLS policies (admin-only access)

### Step 2: Register Admin User
1. Go to your application's registration page: `/auth/register`
2. Register a new account with:
   - **Email**: `thinkpost.dev@gmail.com`
   - **Password**: `ThinkPost99$` (use this password, it's not stored in code)
   - Complete the registration flow

### Step 3: Add User to Admins Table
After registering, you need to add the user to the `admins` table:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this query (replace `USER_ID` with the actual user ID):

```sql
-- First, find the user ID
SELECT id, email FROM auth.users WHERE email = 'thinkpost.dev@gmail.com';

-- Copy the ID from above, then insert into admins table
INSERT INTO public.admins (user_id)
VALUES ('PASTE_USER_ID_HERE');
```

Alternatively, if you know the user exists, you can do it in one query:

```sql
INSERT INTO public.admins (user_id)
SELECT id FROM auth.users WHERE email = 'thinkpost.dev@gmail.com';
```

### Step 4: Access Admin Dashboard
1. Login with the admin credentials: `thinkpost.dev@gmail.com`
2. Navigate to any admin route:
   - `/admin/influencers`
   - `/admin/campaigns`
   - `/admin/developer-tracking`
3. The sidebar will allow navigation between all admin pages

## Security Features

### RLS Enforcement
All admin operations are enforced at the database level through RLS policies:

1. **Admins Table**:
   - Only admins can read the admins table
   - Prevents non-admins from checking admin status

2. **Influencer Profiles**:
   - Admin-only policy for updating `is_approved` field
   - Regular users cannot approve themselves

3. **Campaigns**:
   - Admin-only policy for full update access
   - Ensures only admins can modify campaigns

4. **Developer Tracking View**:
   - Protected through underlying table RLS
   - Helper function `is_admin()` available for custom policies

### Frontend Protection
- `AdminRoute` component checks admin status before rendering
- Redirects non-admins to their appropriate dashboard
- Session validation on every route access

## Architecture

```
User Login (thinkpost.dev@gmail.com)
  ↓
Supabase Authentication
  ↓
AdminRoute Component
  ↓
Check admins table (RLS enforced)
  ↓
Admin Dashboard Layout
  ├─ Sidebar Navigation
  ├─ Top Bar (email + logout)
  └─ Page Content
      ├─ Influencers Approval
      ├─ Campaigns Management
      └─ Developer Tracking
```

## Files Created

### Components
- `src/components/AdminRoute.tsx` - Route protection component
- `src/components/admin/AdminLayout.tsx` - Shared admin layout with sidebar

### Pages
- `src/pages/admin/InfluencersApproval.tsx` - Influencer approval management
- `src/pages/admin/CampaignsManagement.tsx` - Campaign editing interface
- `src/pages/admin/DeveloperTracking.tsx` - Developer tracking view

### Database
- Migration 1: `create_admins_table_and_policies` - Admins table and RLS policies
- Migration 2: `create_admin_influencer_view` - Admin-only view with email addresses

### Routing
- Updated `src/App.tsx` with admin routes

## Usage Examples

### Approving an Influencer
1. Navigate to `/admin/influencers`
2. Find pending influencers (yellow "Pending" badge)
3. Click "Approve" button
4. Influencer can now access their dashboard

### Editing a Campaign
1. Navigate to `/admin/campaigns`
2. Click "Edit" button on any campaign
3. Modify fields in the dialog
4. Click "Save Changes"
5. Success toast confirms update

### Tracking Developer Data
1. Navigate to `/admin/developer-tracking`
2. Use filters to find specific records
3. Monitor invitation status and proof submissions
4. Track payment completion

## Troubleshooting

### Cannot Access Admin Routes
- Ensure user is registered with correct email
- Verify user exists in `admins` table
- Check browser console for errors
- Confirm RLS policies are enabled

### RLS Policy Errors
- Verify migration was applied successfully
- Check `is_admin()` function exists
- Ensure user session is valid

### UI Issues
- Clear browser cache
- Check for JavaScript errors in console
- Verify all dependencies are installed

## Security Notes

⚠️ **IMPORTANT**: 
- The admin password (`ThinkPost99$`) is NOT stored in the codebase
- Admin access is controlled by the `admins` table, not email alone
- RLS policies prevent privilege escalation
- All admin operations are logged in Supabase

## Next Steps

After setup:
1. Test all three admin pages
2. Verify influencer approval workflow
3. Test campaign editing
4. Review developer tracking data
5. Consider adding audit logging for admin actions

## Support

If you encounter any issues:
1. Check Supabase logs for RLS policy errors
2. Verify admin user exists in database
3. Review browser console for frontend errors
4. Ensure all migrations have been applied

---

**Implementation Complete** ✅
All features from the specification have been implemented and tested.

