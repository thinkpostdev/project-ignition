# Developer Tracking View Documentation

## Overview
The `developer_tracking_view` is a database view that consolidates influencer payment and content submission tracking information from multiple tables into a single, easy-to-query interface.

## Purpose
This view is designed for developers and administrators to:
- Track influencer payments
- Monitor content submission status
- Verify owner approvals
- Manage financial reconciliation

## View Schema

### Columns

| Column Name | Type | Description |
|------------|------|-------------|
| `influencer_id` | UUID | Unique identifier for the influencer |
| `influencer_name` | TEXT | Display name of the influencer |
| `influencer_phone` | TEXT | Phone number of the influencer |
| `campaign_id` | UUID | Unique identifier for the campaign |
| `campaign_name` | TEXT | Name/title of the campaign |
| `business_name` | TEXT | Name of the business/owner |
| `invitation_id` | UUID | Unique identifier for the invitation |
| `invitation_status` | TEXT | Status of the invitation (always 'accepted' in this view) |
| `amount_to_pay` | NUMERIC | Amount the influencer should be paid (in SAR) |
| `uploaded_link` | TEXT | The URL link to the content uploaded by influencer |
| `has_uploaded_link` | BOOLEAN | True if influencer has uploaded a link |
| `payment_completed` | BOOLEAN | **True if payment has been made** (default: false) |
| `owner_approved_link` | BOOLEAN | True if owner approved the content |
| `proof_status` | ENUM | Status of the proof (pending_submission, submitted, approved, rejected) |
| `link_submitted_at` | TIMESTAMP | When the link was submitted |
| `link_approved_at` | TIMESTAMP | When the owner approved the link |
| `visit_date` | DATE | Scheduled visit date for the influencer |
| `invitation_created_at` | TIMESTAMP | When the invitation was created |
| `invitation_responded_at` | TIMESTAMP | When the influencer accepted the invitation |

## Usage Examples

### 1. View All Pending Payments
```sql
SELECT 
  influencer_name,
  influencer_phone,
  campaign_name,
  business_name,
  amount_to_pay,
  has_uploaded_link,
  owner_approved_link,
  payment_completed
FROM developer_tracking_view
WHERE payment_completed = false
  AND owner_approved_link = true
ORDER BY link_approved_at DESC;
```

### 2. View All Unpaid Approved Content
```sql
SELECT 
  influencer_name,
  influencer_phone,
  amount_to_pay,
  campaign_name,
  uploaded_link
FROM developer_tracking_view
WHERE owner_approved_link = true
  AND payment_completed = false
ORDER BY amount_to_pay DESC;
```

### 3. Total Amount Owed to Influencers
```sql
SELECT 
  SUM(amount_to_pay) as total_owed
FROM developer_tracking_view
WHERE owner_approved_link = true
  AND payment_completed = false;
```

### 4. Payment Summary by Influencer
```sql
SELECT 
  influencer_name,
  influencer_phone,
  COUNT(*) as total_campaigns,
  SUM(amount_to_pay) as total_amount,
  SUM(CASE WHEN payment_completed THEN amount_to_pay ELSE 0 END) as paid_amount,
  SUM(CASE WHEN NOT payment_completed THEN amount_to_pay ELSE 0 END) as pending_amount
FROM developer_tracking_view
WHERE owner_approved_link = true
GROUP BY influencer_id, influencer_name, influencer_phone
ORDER BY pending_amount DESC;
```

### 5. Content Awaiting Owner Approval
```sql
SELECT 
  influencer_name,
  campaign_name,
  business_name,
  uploaded_link,
  link_submitted_at
FROM developer_tracking_view
WHERE has_uploaded_link = true
  AND owner_approved_link = false
  AND proof_status = 'submitted'
ORDER BY link_submitted_at ASC;
```

## Marking Payments as Complete

To mark a payment as completed, update the underlying table:

```sql
UPDATE influencer_invitations
SET payment_completed = true
WHERE id = 'invitation_id_here';
```

Or for bulk updates:

```sql
UPDATE influencer_invitations ii
SET payment_completed = true
WHERE ii.id IN (
  SELECT invitation_id 
  FROM developer_tracking_view
  WHERE owner_approved_link = true
    AND payment_completed = false
    AND influencer_id = 'specific_influencer_id'
);
```

## Export to CSV (PostgreSQL)

```sql
COPY (
  SELECT * FROM developer_tracking_view
  WHERE payment_completed = false
) TO '/tmp/pending_payments.csv' WITH CSV HEADER;
```

## Important Notes

1. **View Only Shows Accepted Invitations**: Only invitations with status 'accepted' are included
2. **Payment Tracking**: The `payment_completed` field must be manually updated when payment is made
3. **No Data Modification**: This is a VIEW, so you cannot INSERT/UPDATE/DELETE directly. Modify the underlying tables instead
4. **Real-time Data**: The view always shows current data from the source tables
5. **Zero Amounts**: Hospitality (free) collaborations will have `amount_to_pay = 0` or `NULL`

## Related Tables

- `influencer_invitations`: Source of invitation and proof data
- `influencer_profiles`: Influencer information
- `profiles`: User contact information (phone)
- `campaigns`: Campaign details
- `owner_profiles`: Business owner information

## Access Control

- The view is accessible to authenticated users
- Ensure proper Row Level Security (RLS) policies if needed for production
- Consider creating a specific role for financial/admin access

## Monitoring Dashboard Queries

### Daily Payment Summary
```sql
SELECT 
  DATE(link_approved_at) as approval_date,
  COUNT(*) as approved_count,
  SUM(amount_to_pay) as total_approved_amount,
  SUM(CASE WHEN payment_completed THEN amount_to_pay ELSE 0 END) as paid_amount
FROM developer_tracking_view
WHERE link_approved_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(link_approved_at)
ORDER BY approval_date DESC;
```

### Overdue Payments (Approved > 7 days ago, not paid)
```sql
SELECT 
  influencer_name,
  influencer_phone,
  campaign_name,
  amount_to_pay,
  link_approved_at,
  AGE(CURRENT_TIMESTAMP, link_approved_at) as days_since_approval
FROM developer_tracking_view
WHERE owner_approved_link = true
  AND payment_completed = false
  AND link_approved_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY link_approved_at ASC;
```

