# Project Ignition - Comprehensive Overview

## 🎯 Project Purpose

**Project Ignition** is a **Saudi Arabia-based influencer marketing platform** that connects business owners (restaurants/cafes) with social media influencers for marketing campaigns. The platform automates the matching process using an intelligent algorithm and manages the entire campaign lifecycle from creation to completion.

---

## 🏗️ Architecture Overview

### **Tech Stack**
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **State Management**: React Query (TanStack Query)
- **Internationalization**: i18next (Arabic/English)
- **Form Validation**: React Hook Form + Zod

### **Deployment**
- Built on Lovable.dev platform
- Supabase for backend infrastructure
- Edge Functions for serverless backend logic

---

## 👥 User Roles & Permissions

### **1. Business Owners (Owners)**
- Create and manage marketing campaigns
- Select influencers from algorithm suggestions
- Approve/reject influencer proof submissions
- Track campaign progress and payments
- **Auto-approved** upon registration (migration: `20251213_auto_approve_owners.sql`)

### **2. Influencers**
- Create profile with social media stats
- Receive campaign invitations
- Accept/decline invitations
- Submit proof of work (links/screenshots)
- **Requires admin approval** before being matched to campaigns

### **3. Admins**
- Approve/reject influencer profiles
- Manage campaigns
- Track developer metrics
- Access admin dashboard

### **Authentication Flow**
- Supabase Auth handles user authentication
- Role-based access control via `user_roles` table
- Admin access via `admins` table
- Protected routes check role + approval status

---

## 📊 Database Schema

### **Core Tables**

#### **User Management**
- `profiles` - Basic user info (name, avatar, phone)
- `user_roles` - Links users to roles (owner/influencer)
- `admins` - Admin users
- `owner_profiles` - Business owner details (business_name, location, cities, price_level, etc.)
- `influencer_profiles` - Influencer details (followers, engagement, pricing, categories, etc.)

#### **Campaign Management**
- `branches` - Business locations (city, neighborhood, address)
- `campaigns` - Marketing campaigns (title, budget, goal, status, payment_approved)
- `campaign_influencer_suggestions` - Algorithm-generated influencer matches
- `campaign_schedule_items` - Campaign timeline/calendar

#### **Invitations & Collaboration**
- `influencer_invitations` - Invitations sent to influencers
  - Status: `pending`, `accepted`, `declined`, `cancelled`
  - Includes: `offered_price`, `scheduled_date`, `proof_status`
- `conversations` - Chat between owners and influencers
- `messages` - Individual messages in conversations

#### **Proof & Payment Workflow**
- `influencer_invitations.proof_status`: `pending_submission`, `submitted`, `approved`, `rejected`
- `influencer_invitations.proof_url` - Link to posted content
- `influencer_invitations.proof_screenshots` - Screenshot array
- `influencer_invitations.payment_completed` - Payment tracking

#### **Views**
- `admin_influencer_view` - Admin view of influencer profiles
- `developer_tracking_view` - Developer metrics for campaign tracking

### **Key Enums**

```typescript
campaign_detailed_status: 
  "draft" | "waiting_match_plan" | "plan_ready" | 
  "waiting_influencer_responses" | "in_progress" | "completed" | "cancelled"

invitation_status: "pending" | "accepted" | "declined" | "cancelled"

proof_status: "pending_submission" | "submitted" | "approved" | "rejected"

influencer_category: 
  "food_reviews" | "lifestyle" | "fashion" | "travel" | "comedy" | "general"
```

---

## 🔄 Campaign Lifecycle

### **1. Campaign Creation** (`CreateCampaign.tsx`)
```
Owner fills form → Creates campaign → Status: "draft"
```

**Form Fields:**
- Title, description, branch selection
- Campaign goal (opening/promotions/new_products/other)
- Budget (minimum 500 SAR)
- Start date
- Duration
- Target followers/engagement ranges
- Option to add bonus hospitality influencers

### **2. Influencer Matching** (`match-influencers` Edge Function)

**Triggered**: When owner clicks "Find Influencers"

**Algorithm Process:**

1. **Fetch Campaign Data**
   - Budget, branch city, hospitality bonus flag
   - Campaign goal and start date

2. **Fetch Approved Influencers**
   - Only `is_approved = true` influencers
   - Includes: city, content type, pricing, views

3. **City Filtering**
   - Matches influencers serving the campaign's branch city
   - Uses city normalization (handles Arabic/English variations)
   - Fallback: If no city match, uses all influencers with score penalty

4. **Scoring Algorithm** (0-100 points)
   - **Content Type Score** (max 40 points):
     - Food reviews: 40 points
     - Lifestyle: 15 points
     - Travel: 5 points
   - **Reach Score** (max 60 points):
     - Based on average views (normalized to max views in pool)
     - Formula: `(avgViews / maxViews) * 60`

5. **Selection Process**
   - Separate paid vs hospitality influencers
   - **Paid Selection**: Greedy algorithm - select highest-scoring influencers within budget
   - **Hospitality Bonus**: If enabled, add top 5 hospitality influencers (free)

6. **Date Scheduling**
   - **Opening campaigns**: All influencers get same date (start_date)
   - **Other campaigns**: Sequential dates (one per day starting from start_date)

7. **Save Results**
   - Insert into `campaign_influencer_suggestions`
   - Update campaign with `strategy_summary` (JSON)
   - Update campaign status to `"plan_ready"`

**Strategy Summary Example:**
```json
{
  "total_influencers": 8,
  "paid_influencers": 3,
  "hospitality_influencers": 5,
  "total_cost": 1500,
  "service_fee": 300,
  "total_cost_with_fee": 1800,
  "total_reach": 2500000,
  "remaining_budget": 500
}
```

### **3. Owner Selection** (`CampaignDetail.tsx`)
```
Owner reviews suggestions → Selects influencers → Clicks "Send Invitations"
```

**Owner Actions:**
- View all algorithm suggestions with match scores
- Select/deselect influencers
- See budget breakdown
- Send invitations to selected influencers

### **4. Payment Approval** (Admin)
```
Owner submits payment → Admin approves → Invitations sent automatically
```

**Payment Flow:**
- Owner marks payment as submitted (`payment_submitted_at`)
- Admin approves (`payment_approved = true`)
- `send-approved-invitations` Edge Function automatically creates invitations

### **5. Invitation Management**

#### **Automatic Invitation Sending** (`send-approved-invitations` Edge Function)
- Triggered after payment approval
- Creates `influencer_invitations` records for selected suggestions
- Status: `pending`
- Includes: `offered_price`, `scheduled_date`

#### **Invitation Expiration** (`process-expired-invitations` Edge Function)
- **48-hour expiration**: Pending invitations auto-decline after 48 hours
- Runs via cron job (hourly)
- Automatically triggers replacement logic

### **6. Influencer Response**
```
Influencer receives invitation → Accepts/Declines
```

**Acceptance:**
- Status: `pending` → `accepted`
- `responded_at` timestamp set
- Campaign status: `"waiting_influencer_responses"` → `"in_progress"`

**Rejection:**
- Status: `pending` → `declined`
- Triggers automatic replacement (see below)

### **7. Automatic Replacement** (`handle-invitation-rejection` Edge Function)

**When an influencer rejects:**

1. **Calculate Remaining Budget**
   - Sum all active invitations (pending + accepted)
   - Remaining = Total budget - Used budget

2. **Find Replacement** (Two-phase search)

   **Phase 1: Existing Suggestions**
   - Check `campaign_influencer_suggestions` for uninvited influencers
   - Filter: Not already invited, matches city

   **Phase 2: Full Database Search** ⭐
   - If Phase 1 finds nothing, search ALL `influencer_profiles`
   - Filter by:
     - City matches campaign branch
     - Not already invited (ever)
     - Fits budget (if paid)
   - Sort by price (lower first)

3. **Create Replacement Invitation**
   - New invitation with **same price** as rejected influencer
   - Scheduled date determined by campaign goal:
     - Opening: Same date as campaign start
     - Others: Next available date after last scheduled influencer
   - Auto-invite the replacement

**Budget Handling:**
- Budget stays constant (owner paid upfront)
- Rejected amount shows in "remaining budget"
- No refunds - unused budget stays in campaign scope

### **8. Proof Submission & Approval**

**Influencer Submits Proof:**
- Uploads proof link (`proof_url`)
- Uploads screenshots (`proof_screenshots`)
- Status: `pending_submission` → `submitted`
- `proof_submitted_at` timestamp

**Owner Reviews Proof:**
- Approve: `proof_status` → `approved`, `proof_approved_at` set
- Reject: `proof_status` → `rejected`, `proof_rejected_reason` set

**Payment Completion:**
- Owner marks `payment_completed = true` after paying influencer

---

## 🔧 Backend Edge Functions

### **1. `match-influencers`**
**Purpose**: Run matching algorithm for a campaign

**Input:**
```json
{ "campaign_id": "uuid" }
```

**Process:**
1. Fetch campaign + branch data
2. Fetch approved influencers
3. Run matching algorithm
4. Save suggestions to database
5. Update campaign with strategy summary

**Output:**
```json
{
  "success": true,
  "suggestions_count": 8,
  "strategy": { ... }
}
```

### **2. `send-approved-invitations`**
**Purpose**: Auto-send invitations after payment approval

**Input:**
```json
{ "campaign_id": "uuid" }
```

**Process:**
1. Verify payment approved
2. Get selected suggestions
3. Create invitations for uninvited influencers
4. Set status to `pending`

### **3. `handle-invitation-rejection`**
**Purpose**: Find and invite replacement when influencer rejects

**Input:**
```json
{
  "campaign_id": "uuid",
  "rejected_influencer_id": "uuid"
}
```

**Process:**
1. Get rejected invitation price
2. Calculate remaining budget
3. Search for replacement (existing suggestions → full database)
4. Create new invitation with same price
5. Schedule date appropriately

**Output:**
```json
{
  "success": true,
  "replaced": true,
  "replacement": { ... },
  "remaining_budget": 500
}
```

### **4. `process-expired-invitations`**
**Purpose**: Auto-decline expired invitations (48 hours)

**Trigger**: Cron job (hourly)

**Process:**
1. Find pending invitations > 48 hours old
2. Mark as `declined`
3. Call `handle-invitation-rejection` for each
4. Return processing results

---

## 🎨 Frontend Structure

### **Pages**

#### **Public**
- `Landing.tsx` - Homepage
- `Login.tsx` / `Register.tsx` - Authentication

#### **Onboarding**
- `OwnerOnboarding.tsx` - Business owner profile setup
- `InfluencerOnboarding.tsx` - Influencer profile setup
- `PendingApproval.tsx` - Waiting page for unapproved influencers

#### **Owner Dashboard**
- `OwnerDashboard.tsx` - Campaign list
- `CreateCampaign.tsx` - Multi-step campaign creation form
- `CampaignDetail.tsx` - Campaign management (suggestions, invitations, proof approval)

#### **Influencer Dashboard**
- `InfluencerDashboard.tsx` - Invitations list
- `InfluencerProfile.tsx` - Profile settings

#### **Admin**
- `AdminDashboard.tsx` - Overview
- `InfluencersApproval.tsx` - Approve/reject influencers
- `CampaignsManagement.tsx` - Manage campaigns
- `DeveloperTracking.tsx` - Developer metrics

#### **Settings**
- `OwnerProfile.tsx` - Owner settings
- `InfluencerProfile.tsx` - Influencer settings
- `ChangePassword.tsx` - Password change

### **Key Components**

#### **Route Protection**
- `ProtectedRoute.tsx` - Checks auth + role + approval status
- `AdminRoute.tsx` - Admin-only routes

#### **UI Components**
- shadcn/ui components in `components/ui/`
- `LanguageSwitcher.tsx` - Arabic/English toggle
- `AdminLayout.tsx` - Admin dashboard layout

### **Domain Logic**
- `domain/matching/` - Matching algorithm types and constants
- `domain/matching/types.ts` - TypeScript interfaces
- `domain/matching/constants.ts` - Scoring weights, city normalizations

---

## 🔐 Security & Permissions

### **Row Level Security (RLS)**
- Supabase RLS policies control data access
- Users can only access their own data
- Admins have elevated permissions

### **Role-Based Access**
- `user_roles` table defines user roles
- `admins` table for admin access
- Frontend routes protected by `ProtectedRoute` / `AdminRoute`

### **Approval System**
- Influencers must be approved (`is_approved = true`) before matching
- Owners auto-approved on registration
- Admin dashboard for approval management

---

## 📈 Key Features

### **1. Intelligent Matching Algorithm**
- City-based filtering with normalization
- Content type scoring (food reviews prioritized)
- Reach-based scoring (views)
- Budget-aware selection
- Hospitality bonus option

### **2. Automatic Replacement System**
- Auto-finds replacements when influencers reject
- Searches entire database if needed
- Maintains budget consistency
- Smart date scheduling

### **3. Invitation Expiration**
- 48-hour auto-decline
- Automatic replacement triggering
- Prevents stale invitations

### **4. Proof Workflow**
- Influencers submit proof links/screenshots
- Owners approve/reject
- Payment tracking integration

### **5. Multi-Language Support**
- Arabic/English via i18next
- RTL support for Arabic

### **6. Payment Integration**
- Payment approval workflow
- Service fee calculation (20%)
- Budget tracking

---

## 🗄️ Database Migrations Summary

### **Key Migrations**
1. **Initial Schema** (Nov 2024) - Core tables
2. **Approval System** (`20251208_add_approval_system.sql`) - Added `is_approved` to profiles
3. **Auto-Approve Owners** (`20251213_auto_approve_owners.sql`) - Owners auto-approved
4. **Invitation Expiration** (`20251215_add_invitation_expiration.sql`) - 48-hour expiration
5. **Proof Workflow** (`20251204_add_proof_workflow.sql`) - Proof submission system
6. **Developer Tracking** (`20251214_create_developer_tracking_view.sql`) - Metrics view

---

## 🚀 Development Workflow

### **Local Setup**
```bash
npm install
npm run dev
```

### **Environment Variables**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
```

### **Database**
- Migrations in `supabase/migrations/`
- Run via Supabase CLI or dashboard

### **Edge Functions**
- Located in `supabase/functions/`
- Deploy via Supabase CLI: `supabase functions deploy <function-name>`

---

## 📝 Important Notes

### **Budget Model**
- Budget is set at campaign creation
- Service fee: 20% of paid influencer costs
- Budget remains constant (no refunds on rejections)
- Rejected amounts show in "remaining budget"

### **City Matching**
- Supports Arabic and English city names
- Normalization handles variations (e.g., "Riyadh" = "الرياض")
- Fallback mode if no city match (with score penalty)

### **Date Scheduling**
- **Opening campaigns**: All influencers visit same day
- **Other campaigns**: Sequential dates (one per day)

### **Approval Workflow**
- Influencers: Must be approved by admin
- Owners: Auto-approved on registration
- Campaigns: Payment must be approved before invitations sent

---

## 🔍 Key Files Reference

### **Backend**
- `supabase/functions/match-influencers/index.ts` - Matching algorithm
- `supabase/functions/handle-invitation-rejection/index.ts` - Replacement logic
- `supabase/functions/send-approved-invitations/index.ts` - Auto-invite
- `supabase/functions/process-expired-invitations/index.ts` - Expiration handler

### **Frontend**
- `src/pages/dashboard/owner/CreateCampaign.tsx` - Campaign creation
- `src/pages/dashboard/owner/CampaignDetail.tsx` - Campaign management
- `src/domain/matching/` - Matching algorithm types/constants

### **Database**
- `supabase/migrations/` - All schema migrations
- `src/integrations/supabase/types.ts` - Generated TypeScript types

---

## 🎯 Business Logic Summary

1. **Owner creates campaign** → Draft status
2. **Algorithm matches influencers** → Suggestions saved
3. **Owner selects influencers** → Suggestions marked selected
4. **Owner submits payment** → Admin approves
5. **Invitations auto-sent** → Status: pending
6. **Influencers respond** → Accept/decline
7. **Rejections trigger replacements** → Auto-invite new influencers
8. **Influencers submit proof** → Owner approves
9. **Payment completed** → Campaign progresses

---

This platform automates the entire influencer marketing workflow, from matching to payment, with intelligent algorithms and automatic replacement systems ensuring campaigns stay on track even when influencers decline invitations.

