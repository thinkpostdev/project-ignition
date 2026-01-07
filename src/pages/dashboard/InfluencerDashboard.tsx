import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Wallet, Briefcase, Mail, CheckCircle2, X, Clock, Calendar, Upload, Link as LinkIcon, AlertCircle, Settings, Info, DollarSign, FileText, Phone, MapPin, ExternalLink, Video } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { AgreementPopup } from '@/components/AgreementPopup';
import { BankInfoPopup } from '@/components/BankInfoPopup';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { AcceptanceConfirmationDialog } from '@/components/AcceptanceConfirmationDialog';

type ProofStatus = Database['public']['Enums']['proof_status'];

interface Invitation {
  id: string;
  campaign_id: string;
  influencer_id: string;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  proof_url: string | null;
  proof_status: ProofStatus | null;
  proof_submitted_at: string | null;
  proof_rejected_reason: string | null;
  offered_price: number | null;
  campaigns: {
    id: string;
    title: string;
    description: string | null;
    budget: number | null;
    duration_days: number | null;
    goal: string | null;
    goal_details: string | null;
    content_requirements: string | null;
    owner_id: string | null;
    owner_profiles: {
      business_name: string | null;
      phone: string | null;
    } | null;
    branches: {
      city: string | null;
      neighborhood: string | null;
      google_map_url: string | null;
    } | null;
  } | null;
}

const InfluencerDashboard = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [influencerProfile, setInfluencerProfile] = useState<any>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    balance: 0,
    activeCollaborations: 0,
    pendingInvitations: 0,
  });
  const [proofUploadDialogOpen, setProofUploadDialogOpen] = useState(false);
  const [campaignDetailsDialogOpen, setCampaignDetailsDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [bankInfoDialogOpen, setBankInfoDialogOpen] = useState(false);
  const [checkingAgreement, setCheckingAgreement] = useState(true);
  const [acceptanceDialogOpen, setAcceptanceDialogOpen] = useState(false);
  const [acceptedInvitationDetails, setAcceptedInvitationDetails] = useState<{
    title: string;
    scheduledDate: string | null;
    location: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      checkInfluencerProfile();
    }
  }, [user]);

  useEffect(() => {
    // Check agreement status after profile is loaded
    if (influencerProfile && user) {
      checkAgreementStatus();
    }
  }, [influencerProfile, user]);

  const checkInfluencerProfile = async () => {
    // Check if influencer profile exists
    const { data: infProfile } = await supabase
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (!infProfile) {
      toast.info('يرجى إكمال ملفك الشخصي');
      navigate('/onboarding/influencer');
      return;
    }

    setInfluencerProfile(infProfile);
    fetchProfile();
    fetchInvitations(infProfile.id);
  };

  const checkAgreementStatus = async () => {
    if (!influencerProfile || !user) return;

    setCheckingAgreement(true);
    try {
      // Only check if influencer is approved
      if (!influencerProfile.is_approved) {
        setCheckingAgreement(false);
        return;
      }

      // Check if agreement is accepted
      if (!influencerProfile.agreement_accepted) {
        setAgreementDialogOpen(true);
      }
    } catch (error) {
      console.error('Error checking agreement status:', error);
    } finally {
      setCheckingAgreement(false);
    }
  };

  const handleAcceptAgreement = async () => {
    if (!influencerProfile || !user) return;

    try {
      const { error } = await supabase
        .from('influencer_profiles')
        .update({ 
          agreement_accepted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', influencerProfile.id);

      if (error) throw error;

      // Update local state
      setInfluencerProfile({ ...influencerProfile, agreement_accepted: true });
      setAgreementDialogOpen(false);
      toast.success('تم قبول الاتفاقية بنجاح');
      
      // Check if bank info is missing, show bank info popup
      if (!influencerProfile.bank_name || !influencerProfile.iban) {
        setBankInfoDialogOpen(true);
      }
    } catch (error) {
      console.error('Error accepting agreement:', error);
      toast.error('فشل حفظ الموافقة. يرجى المحاولة مرة أخرى');
      throw error;
    }
  };

  const handleBankInfoSuccess = () => {
    // Refresh the profile to get updated bank info
    checkInfluencerProfile();
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(data);
  };

  const fetchInvitations = async (influencerProfileId: string) => {
    setLoading(true);
    try {
      console.log('[InfluencerDashboard] Fetching invitations for profile:', influencerProfileId);
      
      // First get invitations with campaign data
      const { data, error } = await supabase
        .from('influencer_invitations')
        .select(`
          *,
          campaigns (
            id,
            title,
            description,
            budget,
            duration_days,
            goal,
            goal_details,
            content_requirements,
            owner_id,
            branch_id
          )
        `)
        .eq('influencer_id', influencerProfileId)
        .order('created_at', { ascending: false });

      console.log('[InfluencerDashboard] Raw invitations:', { data, error });

      if (error) {
        console.error('Error fetching invitations:', error);
        throw error;
      }

      // Fetch owner profiles separately for each unique owner_id
      const ownerIds = [...new Set((data || []).map(inv => inv.campaigns?.owner_id).filter(Boolean))];
      let ownerMap: Record<string, { business_name: string | null; phone: string | null }> = {};
      
      if (ownerIds.length > 0) {
        // Fetch owner profiles (business name)
        const { data: owners } = await supabase
          .from('owner_profiles')
          .select('user_id, business_name')
          .in('user_id', ownerIds);
        
        // Fetch owner phone numbers from profiles table
        const { data: ownerProfiles } = await supabase
          .from('profiles')
          .select('id, phone')
          .in('id', ownerIds);
        
        // Create map of owner data
        const phoneMap = (ownerProfiles || []).reduce((acc, p) => {
          acc[p.id] = p.phone;
          return acc;
        }, {} as Record<string, string | null>);
        
        ownerMap = (owners || []).reduce((acc, o) => {
          acc[o.user_id] = {
            business_name: o.business_name || null,
            phone: phoneMap[o.user_id] || null
          };
          return acc;
        }, {} as Record<string, { business_name: string | null; phone: string | null }>);
      }

      // Fetch branch details for each unique branch_id
      const branchIds = [...new Set((data || []).map(inv => inv.campaigns?.branch_id).filter(Boolean))] as string[];
      let branchMap: Record<string, { city: string | null; neighborhood: string | null; google_map_url: string | null }> = {};
      
      if (branchIds.length > 0) {
        const { data: branches } = await supabase
          .from('branches')
          .select('id, city, neighborhood, google_map_url')
          .in('id', branchIds);
        
        branchMap = (branches || []).reduce((acc, b) => {
          acc[b.id] = {
            city: b.city,
            neighborhood: b.neighborhood,
            google_map_url: b.google_map_url
          };
          return acc;
        }, {} as Record<string, { city: string | null; neighborhood: string | null; google_map_url: string | null }>);
      }

      // Merge owner and branch data into invitations
      const invitationsWithOwners = (data || []).map(inv => ({
        ...inv,
        campaigns: inv.campaigns ? {
          ...inv.campaigns,
          owner_profiles: inv.campaigns.owner_id ? ownerMap[inv.campaigns.owner_id] || null : null,
          branches: inv.campaigns.branch_id ? branchMap[inv.campaigns.branch_id] : null
        } : null
      }));

      console.log('[InfluencerDashboard] Processed invitations:', invitationsWithOwners);
      console.log('[InfluencerDashboard] Sample invitation campaigns data:', invitationsWithOwners[0]?.campaigns);
      console.log('[InfluencerDashboard] Branch map:', branchMap);
      console.log('[InfluencerDashboard] First campaign branch_id:', invitationsWithOwners[0]?.campaigns?.branch_id);
      console.log('[InfluencerDashboard] First campaign branches:', invitationsWithOwners[0]?.campaigns?.branches);

      setInvitations(invitationsWithOwners as Invitation[]);

      // Calculate stats
      const pending = (data || []).filter(inv => inv.status === 'pending').length;
      const active = (data || []).filter(inv => inv.status === 'accepted').length;

      setStats({
        balance: 0,
        activeCollaborations: active,
        pendingInvitations: pending,
      });
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      // Find the invitation to get details for the confirmation dialog
      const invitation = invitations.find(inv => inv.id === invitationId);
      
      const { error } = await supabase
        .from('influencer_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (error) throw error;

      // Show confirmation dialog with next steps
      if (invitation) {
        const location = invitation.campaigns?.branches?.neighborhood 
          ? `${invitation.campaigns.branches.neighborhood}، ${invitation.campaigns.branches.city || ''}`
          : invitation.campaigns?.branches?.city || '';
        
        setAcceptedInvitationDetails({
          title: invitation.campaigns?.title || invitation.campaigns?.owner_profiles?.business_name || '',
          scheduledDate: invitation.scheduled_date,
          location,
        });
        setAcceptanceDialogOpen(true);
      }

      fetchInvitations(influencerProfile.id);
    } catch (error) {
      toast.error('فشل قبول الدعوة');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      // Find the invitation to get campaign_id and influencer_id
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) {
        toast.error('الدعوة غير موجودة');
        return;
      }

      // Update invitation status to declined
      const { error: updateError } = await supabase
        .from('influencer_invitations')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Call Edge Function to handle automatic replacement
      const { data: replacementData, error: replacementError } = await supabase.functions.invoke(
        'handle-invitation-rejection',
        {
          body: {
            campaign_id: invitation.campaign_id,
            rejected_influencer_id: invitation.influencer_id,
          },
        }
      );

      console.log('[REJECTION] Replacement result:', replacementData);

      if (replacementError) {
        console.error('[REJECTION] Replacement error:', replacementError);
        toast.success('تم رفض الدعوة');
      } else if (replacementData) {
        if (replacementData.replaced) {
          toast.success('تم رفض الدعوة وإرسال دعوة لمؤثر بديل');
          console.log('[REJECTION] Replacement found:', replacementData.replacement);
        } else {
          toast.success('تم رفض الدعوة');
          console.log('[REJECTION] No replacement available:', replacementData.message);
        }
      } else {
        toast.success('تم رفض الدعوة');
      }

      fetchInvitations(influencerProfile.id);
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error('فشل رفض الدعوة');
    }
  };

  const handleOpenProofUpload = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setProofUrl(invitation.proof_url || '');
    setProofUploadDialogOpen(true);
  };

  const handleSubmitProof = async () => {
    if (!selectedInvitation || !proofUrl.trim()) {
      toast.error('يرجى إدخال رابط المحتوى');
      return;
    }

    // Basic URL validation
    try {
      new URL(proofUrl);
    } catch {
      toast.error('الرابط غير صالح. يرجى إدخال رابط صحيح');
      return;
    }

    setSubmittingProof(true);
    try {
      const { error } = await supabase
        .from('influencer_invitations')
        .update({
          proof_url: proofUrl,
          proof_submitted_at: new Date().toISOString(),
          proof_status: 'submitted',
        })
        .eq('id', selectedInvitation.id);

      if (error) throw error;

      toast.success('تم رفع رابط المحتوى بنجاح!');
      setProofUploadDialogOpen(false);
      setProofUrl('');
      setSelectedInvitation(null);
      fetchInvitations(influencerProfile.id);
    } catch (error) {
      toast.error('فشل رفع الرابط');
      console.error('Error submitting proof:', error);
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleOpenCampaignDetails = (invitation: Invitation) => {
    console.log('[Campaign Details] Opening dialog for invitation:', invitation);
    console.log('[Campaign Details] Campaign data:', invitation.campaigns);
    setSelectedInvitation(invitation);
    setCampaignDetailsDialogOpen(true);
  };

  const getGoalLabel = (goal: string | null) => {
    if (!goal) return null;
    const labels: Record<string, string> = {
      opening: 'افتتاح',
      promotions: 'عروض ترويجية',
      new_products: 'منتجات جديدة',
      other: 'أخرى',
    };
    return labels[goal] || goal;
  };

  const getProofStatusBadge = (status: ProofStatus | null) => {
    if (!status || status === 'pending_submission') {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
          <Clock className="h-3 w-3 me-1" />
          بانتظار الرفع
        </Badge>
      );
    }
    if (status === 'submitted') {
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
          <Clock className="h-3 w-3 me-1" />
          بانتظار المراجعة
        </Badge>
      );
    }
    if (status === 'approved') {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle2 className="h-3 w-3 me-1" />
          تم الاعتماد
        </Badge>
      );
    }
    if (status === 'rejected') {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
          <X className="h-3 w-3 me-1" />
          مرفوض
        </Badge>
      );
    }
    return null;
  };

  // Calculate time remaining for invitation expiration (48 hours from creation)
  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    const expiresAt = created + (48 * 60 * 60 * 1000); // 48 hours in milliseconds
    const now = Date.now();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) {
      return { expired: true, hours: 0, minutes: 0, urgency: 'expired' };
    }
    
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    
    let urgency: 'high' | 'medium' | 'low' = 'low';
    if (hours < 6) urgency = 'high';
    else if (hours < 24) urgency = 'medium';
    
    return { expired: false, hours, minutes, urgency };
  };

  const getExpirationDisplay = (createdAt: string) => {
    const { expired, hours, minutes, urgency } = getTimeRemaining(createdAt);
    
    if (expired) {
      return (
        <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-red-700 dark:text-red-300 font-semibold">منتهية الصلاحية</span>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              سيتم رفض هذه الدعوة تلقائياً قريباً
            </p>
          </div>
        </div>
      );
    }
    
    const bgColor = urgency === 'high' 
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
      : urgency === 'medium' 
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    
    const textColor = urgency === 'high'
      ? 'text-red-700 dark:text-red-300'
      : urgency === 'medium'
        ? 'text-yellow-700 dark:text-yellow-300'
        : 'text-green-700 dark:text-green-300';
    
    const iconColor = urgency === 'high'
      ? 'text-red-600'
      : urgency === 'medium'
        ? 'text-yellow-600'
        : 'text-green-600';
    
    return (
      <div className={`flex items-center gap-2 text-sm border rounded-lg px-3 py-2 ${bgColor}`}>
        <Clock className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
        <div className="flex-1">
          <span className={`${textColor} font-semibold`}>
            {hours > 0 && `${hours} ساعة`}
            {hours > 0 && minutes > 0 && ' و '}
            {minutes > 0 && `${minutes} دقيقة`}
            {hours === 0 && minutes === 0 && 'أقل من دقيقة'}
          </span>
          <span className={`${textColor} text-xs`}> متبقية للرد</span>
          <p className="text-xs opacity-75 mt-0.5">
            {urgency === 'high' && '⚠️ يرجى الرد بسرعة!'}
            {urgency === 'medium' && '⏰ الوقت ينفد'}
            {urgency === 'low' && '✓ لديك وقت كافٍ للرد'}
          </p>
        </div>
      </div>
    );
  };

  const handleLogout = async () => {
    await signOut();
    toast.success(t('common.logout'));
    navigate('/auth/login');
  };

  // Block access if agreement not accepted
  if (checkingAgreement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show agreement popup if not accepted
  if (agreementDialogOpen) {
    return (
      <AgreementPopup
        open={agreementDialogOpen}
        onAccept={handleAcceptAgreement}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            InfluencerHub
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3" asChild>
              <Link to="/settings/influencer">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 sm:me-2" />
                <span className="hidden sm:inline">الإعدادات</span>
              </Link>
            </Button>
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold">{stats.balance.toLocaleString()}</span>
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-muted-foreground">
              {t('dashboard.influencer.balance')} ر.س
            </h3>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold">{stats.activeCollaborations}</span>
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-muted-foreground">
              {t('dashboard.influencer.activeCollaborations')}
            </h3>
          </Card>

          <Card className="p-4 sm:p-6 hover:shadow-elevated transition-shadow sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold">{stats.pendingInvitations}</span>
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-muted-foreground">
              {t('dashboard.influencer.pendingInvitations')}
            </h3>
          </Card>
        </div>

        {/* New Opportunities - Pending Invitations */}
        <Card className="p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">
            {t('dashboard.influencer.newOpportunities')}
          </h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : invitations.filter(inv => inv.status === 'pending').length > 0 ? (
            <div className="space-y-4">
              {invitations
                .filter(inv => inv.status === 'pending')
                .map((invitation) => (
                  <Card key={invitation.id} className="p-3 sm:p-4 hover:border-primary transition-colors border-r-4 border-r-primary">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-base sm:text-lg break-words">
                              {invitation.campaigns?.title || invitation.campaigns?.owner_profiles?.business_name || 'حملة جديدة'}
                            </h4>
                            {invitation.campaigns?.goal && (
                              <Badge variant="secondary" className="text-xs">{getGoalLabel(invitation.campaigns.goal)}</Badge>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            📍 {invitation.campaigns?.branches?.neighborhood && `${invitation.campaigns.branches.neighborhood}، `}
                            {invitation.campaigns?.branches?.city || 'غير محدد'}
                          </p>
                          {invitation.campaigns?.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {invitation.campaigns.description.slice(0, 150)}
                              {invitation.campaigns.description.length > 150 ? '...' : ''}
                            </p>
                          )}
                          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                            {invitation.offered_price && invitation.offered_price > 0 ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-success" />
                                <span className="text-base sm:text-lg font-bold text-success">
                                  {invitation.offered_price.toLocaleString()} ر.س
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                ضيافة مجانية
                              </Badge>
                            )}
                            <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">{new Date(invitation.created_at).toLocaleDateString('ar-SA', { calendar: 'gregory' })}</span>
                              <span className="sm:hidden">{new Date(invitation.created_at).toLocaleDateString('ar-SA', { calendar: 'gregory', month: 'short', day: 'numeric' })}</span>
                            </span>
                          </div>
                          {/* Scheduled Visit Date */}
                          {invitation.scheduled_date && (
                            <div className="flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              <span className="text-purple-700 dark:text-purple-300 font-medium">
                                تاريخ الزيارة: {new Date(invitation.scheduled_date).toLocaleDateString('ar-SA', {
                                  calendar: 'gregory',
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          )}
                          
                          {/* Expiration Countdown */}
                          {getExpirationDisplay(invitation.created_at)}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-2 border-t">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenCampaignDetails(invitation)}
                          className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                        >
                          <Info className="h-3 w-3 sm:h-4 sm:w-4 me-1" />
                          <span className="hidden sm:inline">عرض التفاصيل</span>
                          <span className="sm:hidden">التفاصيل</span>
                        </Button>
                        <div className="flex gap-2 sm:flex-none">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRejectInvitation(invitation.id)}
                            className="text-destructive hover:bg-destructive/10 flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4 sm:me-1" />
                            <span className="hidden sm:inline">رفض</span>
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            className="bg-success hover:bg-success/90 flex-1 sm:flex-none text-xs sm:text-sm h-9 sm:h-10"
                          >
                            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 sm:me-1" />
                            <span className="hidden sm:inline">قبول</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد دعوات جديدة حالياً</p>
            </div>
          )}
        </Card>

        {/* My Collaborations - Accepted Invitations with Proof Submission */}
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">
            الحملات المقبولة
          </h3>
          
          {/* Workflow Reminder Note */}
          {invitations.filter(inv => inv.status === 'accepted').length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Info className="h-4 w-4" />
                خطوات إكمال التعاون
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <MapPin className="h-3 w-3 text-blue-600" />
                  </div>
                  <span>زُر الموقع</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                    <Video className="h-3 w-3 text-purple-600" />
                  </div>
                  <span>صوّر وانشر</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <Upload className="h-3 w-3 text-amber-600" />
                  </div>
                  <span>ارفع الرابط</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <DollarSign className="h-3 w-3 text-green-600" />
                  </div>
                  <span>استلم خلال 24س</span>
                </div>
              </div>
            </div>
          )}
          
          {invitations.filter(inv => inv.status === 'accepted').length > 0 ? (
            <div className="space-y-4">
              {invitations
                .filter(inv => inv.status === 'accepted')
                .map((invitation) => (
                  <Card key={invitation.id} className="p-4 border-r-4 border-r-success bg-success/5">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">
                              {invitation.campaigns?.title || invitation.campaigns?.owner_profiles?.business_name || 'حملة'}
                            </h4>
                            <Badge variant="outline" className="bg-success/10 text-success border-success">
                              <CheckCircle2 className="h-3 w-3 me-1" />
                              نشط
                            </Badge>
                            {getProofStatusBadge(invitation.proof_status)}
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            📍 {invitation.campaigns?.branches?.neighborhood && `${invitation.campaigns.branches.neighborhood}، `}
                            {invitation.campaigns?.branches?.city || 'غير محدد'}
                          </p>
                          {invitation.campaigns?.description && (
                            <p className="text-sm text-muted-foreground">
                              {invitation.campaigns.description.slice(0, 100)}
                              {invitation.campaigns.description.length > 100 ? '...' : ''}
                            </p>
                          )}
                          <div className="flex items-center gap-4 flex-wrap">
                            {invitation.offered_price && invitation.offered_price > 0 ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-success" />
                                <span className="text-lg font-bold text-success">
                                  {invitation.offered_price.toLocaleString()} ر.س
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                ضيافة مجانية
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenCampaignDetails(invitation)}
                              className="text-primary hover:text-primary/80"
                            >
                              <Info className="h-4 w-4 me-1" />
                              عرض التفاصيل
                            </Button>
                          </div>
                          {/* Scheduled Visit Date */}
                        {invitation.scheduled_date && (
                          <div className="flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span className="text-purple-700 dark:text-purple-300 font-medium">
                              تاريخ الزيارة: {new Date(invitation.scheduled_date).toLocaleDateString('ar-SA', {
                                calendar: 'gregory',
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        </div>
                      </div>
                      
                      {/* Proof Upload Section */}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            رابط المحتوى المنشور:
                          </span>
                          {invitation.proof_url && (
                            <a 
                              href={invitation.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <LinkIcon className="h-3 w-3" />
                              عرض الرابط
                            </a>
                          )}
                        </div>
                        
                        {/* Show rejection reason if rejected */}
                        {invitation.proof_status === 'rejected' && invitation.proof_rejected_reason && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-900 dark:text-red-100">سبب الرفض:</p>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                  {invitation.proof_rejected_reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Show upload button if pending or rejected */}
                        {(invitation.proof_status === 'pending_submission' || invitation.proof_status === 'rejected') && (
                          <Button
                            onClick={() => handleOpenProofUpload(invitation)}
                            className="w-full"
                            variant="outline"
                          >
                            <Upload className="h-4 w-4 me-2" />
                            {invitation.proof_status === 'rejected' ? 'رفع رابط جديد' : 'رفع رابط المحتوى'}
                          </Button>
                        )}
                        
                        {/* Show message if submitted or approved */}
                        {invitation.proof_status === 'submitted' && (
                          <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                            تم رفع الرابط بنجاح. في انتظار مراجعة صاحب المطعم.
                          </div>
                        )}
                        {invitation.proof_status === 'approved' && (
                          <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            تم اعتماد المحتوى بنجاح!
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد تعاونات نشطة حالياً</p>
              <p className="text-sm mt-1">اقبل دعوة للبدء في التعاون</p>
            </div>
          )}
        </Card>

        {/* Proof Upload Dialog */}
        <Dialog open={proofUploadDialogOpen} onOpenChange={setProofUploadDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[500px] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>رفع رابط المحتوى</DialogTitle>
              <DialogDescription>
                الرجاء إدخال رابط الفيديو المنشور على المنصة (TikTok، Instagram، Snapchat، إلخ)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="proof-url">رابط الفيديو *</Label>
                <Input
                  id="proof-url"
                  type="url"
                  placeholder="https://www.tiktok.com/@username/video/..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  disabled={submittingProof}
                />
                <p className="text-xs text-muted-foreground">
                  مثال: https://www.tiktok.com/@username/video/123456789
                </p>
              </div>
              
              {selectedInvitation?.scheduled_date && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>تاريخ الزيارة المحدد:</strong> {new Date(selectedInvitation.scheduled_date).toLocaleDateString('ar-SA', { calendar: 'gregory' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    يرجى التأكد من نشر المحتوى في الموعد المحدد أو بعده
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setProofUploadDialogOpen(false);
                  setProofUrl('');
                }}
                className="flex-1"
                disabled={submittingProof}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitProof}
                className="flex-1"
                disabled={submittingProof || !proofUrl.trim()}
              >
                {submittingProof ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Campaign Details Dialog */}
        <Dialog open={campaignDetailsDialogOpen} onOpenChange={setCampaignDetailsDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-[700px] max-h-[85vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl">تفاصيل الحملة</DialogTitle>
              <DialogDescription>
                اطلع على جميع تفاصيل الحملة ومتطلباتها
              </DialogDescription>
            </DialogHeader>
            
            {selectedInvitation?.campaigns && (
              <div className="space-y-6 py-4">
                {/* Business Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    {selectedInvitation.campaigns.owner_profiles?.business_name || selectedInvitation.campaigns.title}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {getGoalLabel(selectedInvitation.campaigns.goal)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      📍 {selectedInvitation.campaigns.branches?.neighborhood && `${selectedInvitation.campaigns.branches.neighborhood}، `}
                      {selectedInvitation.campaigns.branches?.city || 'غير محدد'}
                    </span>
                  </div>
                </div>

                {/* Offered Price */}
                <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-success/20 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">المبلغ المعروض</p>
                      {selectedInvitation.offered_price && selectedInvitation.offered_price > 0 ? (
                        <p className="text-2xl font-bold text-success">
                          {selectedInvitation.offered_price.toLocaleString()} ر.س
                        </p>
                      ) : (
                        <p className="text-xl font-bold text-amber-600">
                          ضيافة مجانية
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Scheduled Date */}
                {selectedInvitation.scheduled_date && (
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">تاريخ الزيارة المطلوب</p>
                        <p className="font-semibold text-purple-700 dark:text-purple-300">
                          {new Date(selectedInvitation.scheduled_date).toLocaleDateString('ar-SA', {
                            calendar: 'gregory',
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Branch Location */}
                {selectedInvitation.campaigns.branches?.google_map_url && (
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">موقع الفرع</p>
                        <a 
                          href={selectedInvitation.campaigns.branches.google_map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-green-700 dark:text-green-300 hover:underline flex items-center gap-2"
                        >
                          عرض الموقع على خرائط جوجل
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Owner Contact Info - Show phone number */}
                {selectedInvitation.campaigns.owner_profiles?.phone && (
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">رقم التواصل مع صاحب المنشأة</p>
                        <a 
                          href={`tel:${selectedInvitation.campaigns.owner_profiles.phone}`}
                          className="font-semibold text-blue-700 dark:text-blue-300 hover:underline"
                          dir="ltr"
                        >
                          {selectedInvitation.campaigns.owner_profiles.phone}
                        </a>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Campaign Description */}
                {selectedInvitation.campaigns.description && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      وصف الحملة
                    </h4>
                    <Card className="p-4 bg-muted/50">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedInvitation.campaigns.description}
                      </p>
                    </Card>
                  </div>
                )}

                {/* Goal Details */}
                {selectedInvitation.campaigns.goal_details && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      تفاصيل الهدف
                    </h4>
                    <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-blue-900 dark:text-blue-100">
                        {selectedInvitation.campaigns.goal_details}
                      </p>
                    </Card>
                  </div>
                )}

                {/* Content Requirements */}
                {selectedInvitation.campaigns.content_requirements && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      متطلبات المحتوى
                    </h4>
                    <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-amber-900 dark:text-amber-100">
                        {selectedInvitation.campaigns.content_requirements}
                      </p>
                    </Card>
                  </div>
                )}

                {/* Important Notice */}
                <Card className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-1">ملاحظة مهمة:</p>
                      <p className="text-muted-foreground leading-relaxed">
                        عند قبولك لهذه الدعوة، يجب عليك زيارة الموقع في التاريخ المحدد وإنشاء محتوى وفقاً للمتطلبات المذكورة أعلاه. بعد نشر المحتوى، يرجى رفع رابط المنشور للمراجعة والاعتماد.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setCampaignDetailsDialogOpen(false);
                }}
                className="flex-1"
              >
                إغلاق
              </Button>
              {selectedInvitation?.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCampaignDetailsDialogOpen(false);
                      handleRejectInvitation(selectedInvitation.id);
                    }}
                    className="flex-1 text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4 me-1" />
                    رفض
                  </Button>
                  <Button
                    onClick={() => {
                      setCampaignDetailsDialogOpen(false);
                      handleAcceptInvitation(selectedInvitation.id);
                    }}
                    className="flex-1 bg-success hover:bg-success/90"
                  >
                    <CheckCircle2 className="h-4 w-4 me-1" />
                    قبول
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <FloatingWhatsApp />

      {/* Bank Info Popup */}
      {influencerProfile && (
        <BankInfoPopup
          open={bankInfoDialogOpen}
          onOpenChange={setBankInfoDialogOpen}
          influencerProfileId={influencerProfile.id}
          onSuccess={handleBankInfoSuccess}
        />
      )}

      {/* Acceptance Confirmation Dialog */}
      <AcceptanceConfirmationDialog
        open={acceptanceDialogOpen}
        onOpenChange={setAcceptanceDialogOpen}
        campaignTitle={acceptedInvitationDetails?.title}
        scheduledDate={acceptedInvitationDetails?.scheduledDate}
        location={acceptedInvitationDetails?.location}
      />
    </div>
  );
};

export default InfluencerDashboard;
