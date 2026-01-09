import CampaignDetail from '@/pages/dashboard/owner/CampaignDetail';

/**
 * AdminCampaignDetail - Admin wrapper for viewing campaign details
 * 
 * This component reuses the owner's CampaignDetail component but with admin context.
 * The admin can view any campaign regardless of ownership.
 */
export default function AdminCampaignDetail() {
  return (
    <CampaignDetail 
      backNavigationPath="/admin/campaigns"
      backButtonText="العودة لإدارة الحملات"
      isAdminView={true}
    />
  );
}

