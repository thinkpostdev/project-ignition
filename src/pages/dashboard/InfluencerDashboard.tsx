import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Wallet, Briefcase, Mail, CheckCircle2, X, Clock, Calendar, Upload, Link as LinkIcon, AlertCircle, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

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
  campaigns: {
    id: string;
    title: string;
    description: string | null;
    budget: number | null;
    duration_days: number | null;
    goal: string | null;
    owner_id: string | null;
    owner_profiles: {
      business_name: string | null;
    } | null;
    branches: {
      city: string | null;
      neighborhood: string | null;
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
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  useEffect(() => {
    if (user) {
      checkInfluencerProfile();
    }
  }, [user]);

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
      
      // First get invitations with campaign and branch data
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
            owner_id,
            branches (
              city,
              neighborhood
            )
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
      let ownerMap: Record<string, string> = {};
      
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('owner_profiles')
          .select('user_id, business_name')
          .in('user_id', ownerIds);
        
        ownerMap = (owners || []).reduce((acc, o) => {
          acc[o.user_id] = o.business_name || '';
          return acc;
        }, {} as Record<string, string>);
      }

      // Merge owner data into invitations
      const invitationsWithOwners = (data || []).map(inv => ({
        ...inv,
        campaigns: inv.campaigns ? {
          ...inv.campaigns,
          owner_profiles: inv.campaigns.owner_id ? {
            business_name: ownerMap[inv.campaigns.owner_id] || null
          } : null
        } : null
      }));

      console.log('[InfluencerDashboard] Processed invitations:', invitationsWithOwners);

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
      const { error } = await supabase
        .from('influencer_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('تم قبول الدعوة بنجاح!');
      fetchInvitations(influencerProfile.id);
    } catch (error) {
      toast.error('فشل قبول الدعوة');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('influencer_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('تم رفض الدعوة');
      fetchInvitations(influencerProfile.id);
    } catch (error) {
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

  const handleLogout = async () => {
    await signOut();
    toast.success(t('common.logout'));
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            InfluencerHub
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings/influencer">
                <Settings className="h-4 w-4 me-2" />
                الإعدادات
              </Link>
            </Button>
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-success" />
              </div>
              <span className="text-3xl font-bold">{stats.balance.toLocaleString()}</span>
            </div>
            <h3 className="font-semibold text-muted-foreground">
              {t('dashboard.influencer.balance')} ر.س
            </h3>
          </Card>

          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <span className="text-3xl font-bold">{stats.activeCollaborations}</span>
            </div>
            <h3 className="font-semibold text-muted-foreground">
              {t('dashboard.influencer.activeCollaborations')}
            </h3>
          </Card>

          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-3xl font-bold">{stats.pendingInvitations}</span>
            </div>
            <h3 className="font-semibold text-muted-foreground">
              {t('dashboard.influencer.pendingInvitations')}
            </h3>
          </Card>
        </div>

        {/* New Opportunities - Pending Invitations */}
        <Card className="p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">
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
                  <Card key={invitation.id} className="p-4 hover:border-primary transition-colors border-r-4 border-r-primary">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {invitation.campaigns?.owner_profiles?.business_name || invitation.campaigns?.title || 'حملة جديدة'}
                          </h4>
                          {invitation.campaigns?.goal && (
                            <Badge>{invitation.campaigns.goal}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invitation.campaigns?.branches?.neighborhood && `${invitation.campaigns.branches.neighborhood}، `}
                          {invitation.campaigns?.branches?.city || 'غير محدد'}
                          {invitation.campaigns?.duration_days && ` • ${invitation.campaigns.duration_days} يوم`}
                        </p>
                        {invitation.campaigns?.description && (
                          <p className="text-sm text-muted-foreground">
                            {invitation.campaigns.description.slice(0, 100)}
                            {invitation.campaigns.description.length > 100 ? '...' : ''}
                          </p>
                        )}
                        <div className="flex items-center gap-4">
                          {invitation.campaigns?.budget && (
                            <span className="text-lg font-bold text-success">
                              {invitation.campaigns.budget.toLocaleString()} ر.س
                            </span>
                          )}
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(invitation.created_at).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        {/* Scheduled Visit Date */}
                        {invitation.scheduled_date && (
                          <div className="mt-2 flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            <span className="text-purple-700 dark:text-purple-300 font-medium">
                              تاريخ الزيارة: {new Date(invitation.scheduled_date).toLocaleDateString('ar-SA', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRejectInvitation(invitation.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4 me-1" />
                          رفض
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleAcceptInvitation(invitation.id)}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle2 className="h-4 w-4 me-1" />
                          قبول
                        </Button>
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
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            الحملات المقبولة
          </h3>
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
                              {invitation.campaigns?.owner_profiles?.business_name || invitation.campaigns?.title || 'حملة'}
                            </h4>
                            <Badge variant="outline" className="bg-success/10 text-success border-success">
                              <CheckCircle2 className="h-3 w-3 me-1" />
                              نشط
                            </Badge>
                            {getProofStatusBadge(invitation.proof_status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {invitation.campaigns?.branches?.neighborhood && `${invitation.campaigns.branches.neighborhood}، `}
                            {invitation.campaigns?.branches?.city || 'غير محدد'}
                            {invitation.campaigns?.duration_days && ` • ${invitation.campaigns.duration_days} يوم`}
                          </p>
                          {invitation.campaigns?.description && (
                            <p className="text-sm text-muted-foreground">
                              {invitation.campaigns.description.slice(0, 100)}
                              {invitation.campaigns.description.length > 100 ? '...' : ''}
                            </p>
                          )}
                          <div className="flex items-center gap-4">
                            {invitation.campaigns?.budget && (
                              <span className="text-lg font-bold text-success">
                                {invitation.campaigns.budget.toLocaleString()} ر.س
                              </span>
                            )}
                          </div>
                          {/* Scheduled Visit Date */}
                          {invitation.scheduled_date && (
                            <div className="mt-2 flex items-center gap-2 text-sm bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              <span className="text-purple-700 dark:text-purple-300 font-medium">
                                تاريخ الزيارة: {new Date(invitation.scheduled_date).toLocaleDateString('ar-SA', {
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
          <DialogContent className="sm:max-w-[500px]">
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
                    <strong>تاريخ الزيارة المحدد:</strong> {new Date(selectedInvitation.scheduled_date).toLocaleDateString('ar-SA')}
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
      </div>
    </div>
  );
};

export default InfluencerDashboard;
