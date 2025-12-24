# Influencer Onboarding Updates - Multiple Categories & Verification Document

## Date: December 24, 2025

## Changes Made

### 1. Database Changes

#### New Fields Added to `influencer_profiles` table:
- **`categories`** (TEXT[]): Array field to allow influencers to select multiple content categories
- **`verification_document_url`** (TEXT): URL to store the verification document (موثوق) for paid influencers

#### Migration Applied:
- Migration: `add_verification_document_and_categories`
- Migrated existing single `category` values to the new `categories` array
- Old `category` field retained for backward compatibility

### 2. Storage Bucket Created

#### `influencer-documents` Bucket:
- Public bucket for storing verification documents
- Policies configured to:
  - Allow influencers to upload their own documents
  - Allow public viewing of documents
  - Allow influencers to update/delete only their own documents
  - File path pattern: `verification-documents/{user_id}-verification-{timestamp}.{ext}`

### 3. Frontend Changes

#### `InfluencerOnboarding.tsx` Component Updates:

**Multiple Category Selection (Step 2):**
- Changed from single dropdown to multi-select buttons
- Users can now select multiple content categories (food_reviews, lifestyle, fashion, travel, comedy, general)
- Validation requires at least one category to be selected
- Visual feedback with primary color for selected categories

**Verification Document Upload (Step 3):**
- New upload section appears when "مدفوع" (Paid) collaboration type is selected
- Required field for paid influencers
- Accepts PDF, JPG, JPEG, PNG files (max 5MB)
- Real-time upload feedback with loading and success states
- File uploaded to Supabase storage with proper naming convention
- Validation error if paid influencer doesn't upload document

**New Features:**
- `selectedCategories` state for managing multiple category selections
- `uploadingDocument` state for upload progress tracking
- `handleDocumentUpload` function for secure file upload to Supabase storage
- `toggleCategory` function for multi-select behavior

### 4. Schema Validation Updates

**Step 2 Schema:**
```typescript
categories: z.array(z.string()).min(1, 'اختر تصنيف واحد على الأقل')
```

**Step 3 Schema:**
- Added `verification_document_url` field
- Custom refinement to enforce document upload for paid influencers
- Error message: "يجب رفع وثيقة التوثيق (موثوق) للمؤثرين المدفوعين"

### 5. Database Insert Updated

The profile creation now includes:
```typescript
category: finalData.categories?.[0]  // First category for backward compatibility
categories: finalData.categories      // Array of all selected categories
verification_document_url: finalData.verification_document_url || null
```

### 6. TypeScript Types Updated

- Regenerated `types.ts` with new fields:
  - `categories: string[] | null`
  - `verification_document_url: string | null`

## User Experience Flow

### For All Influencers:
1. **Step 1**: Basic info (name, bio, cities) - unchanged
2. **Step 2**: 
   - Select multiple platforms
   - **NEW**: Select multiple content categories (e.g., food_reviews + lifestyle)
   - Enter social media handles
3. **Step 3**: Average views, collaboration type

### For Paid Influencers:
3. **Step 3** (continued):
   - Enter min/max price
   - **NEW**: Upload verification document (موثوق)
   - File upload with validation
   - Visual confirmation when uploaded successfully

### For Hospitality Influencers:
3. **Step 3** (continued):
   - No additional requirements
   - Submit without document upload

## Security Considerations

- Storage policies ensure influencers can only upload documents with their user ID in the filename
- File type validation (PDF, JPG, JPEG, PNG only)
- File size limit (5MB)
- Public read access for admin review
- Validation enforced both client-side and via schema

## Testing Checklist

- [ ] Multiple category selection works correctly
- [ ] At least one category must be selected
- [ ] Paid influencers are required to upload document
- [ ] Document upload shows loading state
- [ ] Document upload shows success confirmation
- [ ] File type validation works
- [ ] File size validation works (5MB limit)
- [ ] Hospitality influencers can skip document upload
- [ ] Profile is created successfully with all new fields
- [ ] Admin can view verification documents

## Notes

- The old `category` field is still populated with the first selected category for backward compatibility
- The matching algorithm can be updated in the future to leverage multiple categories for better matching
- Verification documents are publicly readable for admin review purposes

