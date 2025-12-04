import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Users, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Eye, 
  RefreshCw,
  TrendingUp,
  Gift,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  X,
  FileCheck
} from 'lucide-react';
import { formatViewsCount } from '@/domain/matching';
import type { MatchingSummary } from '@/domain/matching';
import { Database } from '@/integrations/supabase/types';

type ProofStatus = Database['public']['Enums']['proof_status'];

interface CampaignSuggestion {
  id: string;
  campaign_id: string;
  influencer_id: string;
  match_score: number | null;
  name: string | null;
  city_served: string | null;
  platform: string | null;
  content_type: string | null;
  min_price: number | null;
  avg_views_val: number | null;
  type_label: string | null;
  selected: boolean | null;
  scheduled_date: string | null;
}

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  status: string;
  budget: number | null;
  duration_days: number | null;
  goal: string | null;
  goal_details: string | null;
  content_requirements: string | null;
  add_bonus_hospitality: boolean | null;
  strategy_summary: MatchingSummary | null;
  owner_id: string;
  owner_profiles?: {
    business_name: string;
    main_type: string | null;
  } | null;
  branches?: {
    city: string;
    neighborhood: string | null;
  } | null;
}

interface InvitationWithProof {
  id: string;
  influencer_id: string;
  status: string;
  scheduled_date: string | null;
  proof_url: string | null;
  proof_status: ProofStatus | null;
  proof_submitted_at: string | null;
  proof_rejected_reason: string | null;
  proof_approved_at: string | null;
  influencer_profiles?: {
    display_name: string | null;
    instagram_handle: string | null;
  } | null;
}

const CampaignDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  // Track edited dates per suggestion (key: suggestion.id, value: date string)
  const [editedDates, setEditedDates] = useState<Record<string, string>>({});
  const [invitations, setInvitations] = useState<InvitationWithProof[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationWithProof | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingProof, setProcessingProof] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchCampaign();
      fetchSuggestions();
      fetchInvitations();
    }
  }, [user, id]);

  const fetchCampaign = async () => {
    try {
      console.log('[CampaignDetail] Fetching campaign:', id);
      
      // Fetch campaign with branch info (has proper FK relationship)
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          branches (
            city,
            neighborhood
          )
        `)
        .eq('id', id)
        .single();

      console.log('[CampaignDetail] Campaign query result:', { data, error });

      if (error) throw error;
      
      // Fetch owner profile separately (no FK relationship with campaigns)
      const { data: ownerProfile } = await supabase
        .from('owner_profiles')
        .select('business_name, main_type')
        .eq('user_id', data.owner_id)
        .single();
      
      setCampaign({
        ...data,
        owner_profiles: ownerProfile,
        strategy_summary: data.strategy_summary as unknown as MatchingSummary | null
      });
    } catch (error: unknown) {
      console.error('[CampaignDetail] Error fetching campaign:', error);
      toast.error('فشل تحميل الحملة');
      navigate('/dashboard/owner');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      console.log('[CampaignDetail] Fetching suggestions for campaign:', id);
      
      // Query suggestions directly - all needed data is stored in the suggestions table
      // No FK relationship to influencer_profiles exists, so we can't join
      const { data, error } = await supabase
        .from('campaign_influencer_suggestions')
        .select('*')
        .eq('campaign_id', id)
        .order('match_score', { ascending: false });

      console.log('[CampaignDetail] Suggestions query result:', { data, error, count: data?.length });

      if (error) {
        console.error('[CampaignDetail] Suggestions query error:', error);
        throw error;
      }
      setSuggestions((data || []) as CampaignSuggestion[]);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const fetchInvitations = async () => {
    try {
      console.log('[CampaignDetail] Fetching invitations for campaign:', id);
      
      const { data, error } = await supabase
        .from('influencer_invitations')
        .select('*')
        .eq('campaign_id', id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      console.log('[CampaignDetail] Invitations query result:', { data, error, count: data?.length });

      if (error) {
        console.error('[CampaignDetail] Invitations query error:', error);
        throw error;
      }

      // Fetch influencer profile data separately
      const influencerIds = (data || []).map(inv => inv.influencer_id);
      let influencerMap: Record<string, { display_name: string | null; instagram_handle: string | null }> = {};
      
      if (influencerIds.length > 0) {
        const { data: influencers } = await supabase
          .from('influencer_profiles')
          .select('id, display_name, instagram_handle')
          .in('id', influencerIds);
        
        influencerMap = (influencers || []).reduce((acc, inf) => {
          acc[inf.id] = {
            display_name: inf.display_name,
            instagram_handle: inf.instagram_handle
          };
          return acc;
        }, {} as Record<string, { display_name: string | null; instagram_handle: string | null }>);
      }

      // Merge influencer data
      const invitationsWithProfiles = (data || []).map(inv => ({
        ...inv,
        influencer_profiles: influencerMap[inv.influencer_id] || null
      }));

      setInvitations(invitationsWithProfiles as InvitationWithProof[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const handleApproveProof = async (invitationId: string) => {
    setProcessingProof(true);
    try {
      const { error } = await supabase
        .from('influencer_invitations')
        .update({
          proof_status: 'approved',
          proof_approved_at: new Date().toISOString(),
          proof_rejected_reason: null,
        })
        .eq('id', invitationId);

      if (error) throw error;

      toast.success('تم اعتماد المحتوى بنجاح!');
      await fetchInvitations();
    } catch (error) {
      toast.error('فشل اعتماد المحتوى');
      console.error('Error approving proof:', error);
    } finally {
      setProcessingProof(false);
    }
  };

  const handleOpenRejectDialog = (invitation: InvitationWithProof) => {
    setSelectedInvitation(invitation);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectProof = async () => {
    if (!selectedInvitation) return;

    setProcessingProof(true);
    try {
      const { error } = await supabase
        .from('influencer_invitations')
        .update({
          proof_status: 'rejected',
          proof_rejected_reason: rejectionReason || 'لم يتم تقديم سبب',
          proof_approved_at: null,
        })
        .eq('id', selectedInvitation.id);

      if (error) throw error;

      toast.success('تم رفض المحتوى');
      setRejectDialogOpen(false);
      setSelectedInvitation(null);
      setRejectionReason('');
      await fetchInvitations();
    } catch (error) {
      toast.error('فشل رفض المحتوى');
      console.error('Error rejecting proof:', error);
    } finally {
      setProcessingProof(false);
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
          معتمد
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

  const handleRerunMatching = async () => {
    if (!id) return;
    
    setRerunning(true);
    try {
      toast.info('جاري إعادة تحليل المؤثرين...');
      
      const { error } = await supabase.functions.invoke('match-influencers', {
        body: { campaign_id: id }
      });

      if (error) throw error;
      
      toast.success('تم إعادة التحليل بنجاح!');
      
      // Refresh data
      await fetchCampaign();
      await fetchSuggestions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل إعادة التحليل';
      toast.error(errorMessage);
    } finally {
      setRerunning(false);
    }
  };

  // Handle date change for a suggestion
  const handleDateChange = (suggestionId: string, newDate: string) => {
    setEditedDates(prev => ({
      ...prev,
      [suggestionId]: newDate
    }));
  };

  // Get the effective date for a suggestion (edited or original)
  const getEffectiveDate = (suggestion: CampaignSuggestion): string | null => {
    return editedDates[suggestion.id] ?? suggestion.scheduled_date;
  };

  // Format date for display in Arabic
  const formatDateArabic = (dateStr: string | null): string => {
    if (!dateStr) return 'غير محدد';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Send invitations to all non-selected influencers at once
  const handleApproveAll = async () => {
    const pendingSuggestions = suggestions.filter(s => !s.selected);
    
    if (pendingSuggestions.length === 0) {
      toast.info('جميع المؤثرين تم إرسال دعوات لهم بالفعل');
      return;
    }

    setApprovingAll(true);
    
    try {
      const loadingToast = toast.loading(`جاري حفظ التواريخ وإرسال ${pendingSuggestions.length} دعوة...`);
      
      // First, update any edited dates in the suggestions table
      const dateUpdates = pendingSuggestions
        .filter(s => editedDates[s.id])
        .map(s => ({
          id: s.id,
          scheduled_date: editedDates[s.id]
        }));
      
      if (dateUpdates.length > 0) {
        // Update dates one by one (Supabase doesn't support bulk upsert easily)
        for (const update of dateUpdates) {
          await supabase
            .from('campaign_influencer_suggestions')
            .update({ scheduled_date: update.scheduled_date })
            .eq('id', update.id);
        }
      }

      // Mark all suggestions as selected
      const suggestionIds = pendingSuggestions.map(s => s.id);
      const { error: updateError } = await supabase
        .from('campaign_influencer_suggestions')
        .update({ selected: true })
        .in('id', suggestionIds);

      if (updateError) throw updateError;

      // Create invitations for all, including the scheduled_date
      const invitations = pendingSuggestions.map(s => ({
        campaign_id: id,
        influencer_id: s.influencer_id,
        status: 'pending' as const,
        scheduled_date: getEffectiveDate(s),
      }));

      const { error: insertError } = await supabase
        .from('influencer_invitations')
        .insert(invitations);

      if (insertError) throw insertError;

      toast.dismiss(loadingToast);
      toast.success(`تم إرسال ${pendingSuggestions.length} دعوة بنجاح!`);
      
      // Clear edited dates and refresh
      setEditedDates({});
      await fetchSuggestions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل إرسال الدعوات';
      toast.error(errorMessage);
    } finally {
      setApprovingAll(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success(t('common.logout'));
    navigate('/auth/login');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      waiting_match_plan: 'bg-warning/20 text-warning-foreground',
      plan_ready: 'bg-primary text-primary-foreground',
      waiting_influencer_responses: 'bg-secondary text-secondary-foreground',
      in_progress: 'bg-success/20 text-success-foreground',
      completed: 'bg-success text-success-foreground',
      cancelled: 'bg-destructive text-destructive-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'مسودة',
      waiting_match_plan: 'جاري التحليل',
      plan_ready: 'جاهزة للإطلاق',
      waiting_influencer_responses: 'في انتظار الردود',
      in_progress: 'نشطة',
      completed: 'مكتملة',
      cancelled: 'ملغاة',
    };
    return labels[status] || status;
  };

  const getGoalLabel = (goal: string) => {
    const labels: Record<string, string> = {
      opening: 'افتتاح',
      promotions: 'عروض ترويجية',
      new_products: 'منتجات جديدة',
      other: 'أخرى',
    };
    return labels[goal] || goal;
  };

  const getTypeColor = (typeLabel: string | null) => {
    if (!typeLabel) return 'bg-muted text-muted-foreground';
    if (typeLabel.toLowerCase() === 'hospitality' || typeLabel.includes('ضيافة')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    }
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) return null;

  const strategy = campaign.strategy_summary;
  const budgetUsedPercent = strategy && campaign.budget 
    ? Math.round((strategy.total_cost / campaign.budget) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            InfluencerHub
          </h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/dashboard/owner')}
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          العودة للوحة التحكم
        </Button>

        {/* Campaign Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">{campaign.title}</h2>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(campaign.status)}>
                  {getStatusLabel(campaign.status)}
                </Badge>
                {campaign.owner_profiles?.business_name && (
                  <span className="text-muted-foreground">
                    {campaign.owner_profiles.business_name}
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleRerunMatching}
              disabled={rerunning}
            >
              <RefreshCw className={`h-4 w-4 me-2 ${rerunning ? 'animate-spin' : ''}`} />
              {rerunning ? 'جاري التحليل...' : 'إعادة التحليل'}
            </Button>
          </div>
        </div>

        {/* Strategy Summary (if available) */}
        {strategy && (
          <Card className="p-6 mb-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">ملخص استراتيجية المطابقة</h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">إجمالي المؤثرين</span>
                </div>
                <p className="text-2xl font-bold">{strategy.total_influencers}</p>
                <p className="text-xs text-muted-foreground">
                  {strategy.paid_influencers} مدفوع • {strategy.hospitality_influencers} ضيافة
                </p>
              </div>

              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">التكلفة المتوقعة</span>
                </div>
                <p className="text-2xl font-bold">{strategy.total_cost.toLocaleString()} ر.س</p>
                <p className="text-xs text-muted-foreground">
                  متبقي: {strategy.remaining_budget.toLocaleString()} ر.س
                </p>
              </div>

              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">الوصول المتوقع</span>
                </div>
                <p className="text-2xl font-bold">{formatViewsCount(strategy.total_reach)}</p>
                <p className="text-xs text-muted-foreground">مشاهدة تقريباً</p>
              </div>

              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-muted-foreground">ضيافة إضافية</span>
                </div>
                <p className="text-2xl font-bold">
                  {campaign.add_bonus_hospitality ? 'مفعّل' : 'غير مفعّل'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {campaign.add_bonus_hospitality ? `${strategy.hospitality_influencers} مؤثر مجاني` : '—'}
                </p>
              </div>
            </div>

            {/* Budget Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>استخدام الميزانية</span>
                <span className="font-medium">{budgetUsedPercent}%</span>
              </div>
              <Progress value={budgetUsedPercent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 ر.س</span>
                <span>{campaign.budget?.toLocaleString()} ر.س</span>
              </div>
            </div>
          </Card>
        )}

        {/* Campaign Details */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الميزانية</p>
                <p className="text-xl font-bold">{campaign.budget?.toLocaleString()} ر.س</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">مؤثرون مقترحون</p>
                <p className="text-xl font-bold">{suggestions.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المدة</p>
                <p className="text-xl font-bold">{campaign.duration_days || 10} أيام</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Description */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">وصف الحملة</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {campaign.description}
          </p>
          
          {campaign.goal && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <strong>الهدف:</strong> {getGoalLabel(campaign.goal)}
              </p>
              {campaign.goal_details && (
                <p className="text-sm text-muted-foreground mt-2">{campaign.goal_details}</p>
              )}
            </div>
          )}
          
          {campaign.content_requirements && (
            <>
              <h4 className="text-lg font-semibold mt-6 mb-3">متطلبات المحتوى</h4>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {campaign.content_requirements}
              </p>
            </>
          )}
        </Card>

        {/* AI-Matched Influencers */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">المؤثرون المقترحون بالذكاء الاصطناعي</h3>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline">{suggestions.length} مقترح</Badge>
              {suggestions.length > 0 && suggestions.some(s => !s.selected) && (
                <Button 
                  onClick={handleApproveAll}
                  disabled={approvingAll}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {approvingAll ? (
                    <>
                      <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 me-2" />
                      اعتماد الجميع ({suggestions.filter(s => !s.selected).length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((suggestion) => {
                const isHospitality = suggestion.type_label?.toLowerCase() === 'hospitality';
                
                return (
                  <Card 
                    key={suggestion.id} 
                    className={`p-5 hover:shadow-elevated transition-shadow ${
                      isHospitality ? 'border-amber-200 dark:border-amber-800/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white font-bold ${
                          isHospitality 
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600' 
                            : 'bg-gradient-to-br from-primary to-secondary'
                        }`}>
                          {suggestion.name?.charAt(0) || 'M'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-lg">
                              {suggestion.name || 'مؤثر'}
                            </h4>
                            
                            {/* Match Score Badge */}
                            <Badge 
                              variant="outline" 
                              className={`${getScoreColor(suggestion.match_score)} border-current`}
                            >
                              <TrendingUp className="h-3 w-3 me-1" />
                              {suggestion.match_score?.toFixed(0)}% تطابق
                            </Badge>
                            
                            {/* Type Badge */}
                            <Badge className={getTypeColor(suggestion.type_label)}>
                              {isHospitality ? (
                                <>
                                  <Gift className="h-3 w-3 me-1" />
                                  ضيافة
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-3 w-3 me-1" />
                                  مدفوع
                                </>
                              )}
                            </Badge>
                            
                            {/* Selected Badge */}
                            {suggestion.selected && (
                              <Badge variant="default" className="bg-emerald-600">
                                <CheckCircle2 className="h-3 w-3 me-1" />
                                تم الإرسال
                              </Badge>
                            )}
                          </div>
                          
                          {suggestion.platform && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {suggestion.platform}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
                            {suggestion.city_served && (
                              <span className="flex items-center gap-1">
                                📍 {suggestion.city_served}
                              </span>
                            )}
                            {suggestion.platform && (
                              <span>• {suggestion.platform}</span>
                            )}
                            {suggestion.content_type && (
                              <span>• {suggestion.content_type}</span>
                            )}
                          </div>
                          
                          {/* Stats Row */}
                          <div className="flex items-center gap-6 text-sm">
                            {/* Price */}
                            {suggestion.min_price && suggestion.min_price > 0 ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                                <span className="font-semibold text-emerald-600">
                                  {suggestion.min_price.toLocaleString()} ر.س
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Gift className="h-4 w-4 text-amber-600" />
                                <span className="font-semibold text-amber-600">مجاني</span>
                              </div>
                            )}
                            
                            {/* Estimated Reach */}
                            {suggestion.avg_views_val && (
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4 text-blue-600" />
                                <span className="text-blue-600">
                                  {formatViewsCount(suggestion.avg_views_val)} مشاهدة
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Scheduled Date - Editable */}
                          <div className="mt-3 pt-3 border-t flex items-center gap-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-purple-600" />
                              <span className="text-muted-foreground">تاريخ الزيارة:</span>
                            </div>
                            {suggestion.selected ? (
                              <span className="text-sm font-medium text-purple-700">
                                {formatDateArabic(getEffectiveDate(suggestion))}
                              </span>
                            ) : (
                              <input
                                type="date"
                                value={getEffectiveDate(suggestion) || ''}
                                onChange={(e) => handleDateChange(suggestion.id, e.target.value)}
                                className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            )}
                            {editedDates[suggestion.id] && !suggestion.selected && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                معدل
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {suggestion.selected && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 me-1" />
                          تم الإرسال
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              {campaign.status === 'draft' || campaign.status === 'waiting_match_plan' ? (
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground">
                    جاري تحليل أفضل المؤثرين المناسبين لحملتك...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto" />
                  <p className="text-muted-foreground">
                    لم يتم العثور على مؤثرين مناسبين بعد.
                  </p>
                  <Button variant="outline" onClick={handleRerunMatching} disabled={rerunning}>
                    <RefreshCw className={`h-4 w-4 me-2 ${rerunning ? 'animate-spin' : ''}`} />
                    إعادة التحليل
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Submitted Content Review Section */}
        <Card className="p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">المحتوى المرفوع من المؤثرين</h3>
            </div>
            <Badge variant="outline">
              {invitations.length} مؤثر مقبول
            </Badge>
          </div>

          {invitations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المؤثر</TableHead>
                    <TableHead>تاريخ الزيارة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>رابط المحتوى</TableHead>
                    <TableHead className="text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {invitation.influencer_profiles?.display_name || 
                             invitation.influencer_profiles?.instagram_handle || 
                             'مؤثر'}
                          </p>
                          {invitation.influencer_profiles?.instagram_handle && (
                            <p className="text-xs text-muted-foreground">
                              @{invitation.influencer_profiles.instagram_handle}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invitation.scheduled_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {new Date(invitation.scheduled_date).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">غير محدد</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getProofStatusBadge(invitation.proof_status)}
                      </TableCell>
                      <TableCell>
                        {invitation.proof_url ? (
                          <a
                            href={invitation.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            فتح الرابط
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">لم يتم الرفع</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {invitation.proof_status === 'submitted' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveProof(invitation.id)}
                                disabled={processingProof}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle2 className="h-4 w-4 me-1" />
                                اعتماد
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenRejectDialog(invitation)}
                                disabled={processingProof}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 me-1" />
                                رفض
                              </Button>
                            </>
                          )}
                          {invitation.proof_status === 'approved' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 me-1" />
                              تم الاعتماد
                            </Badge>
                          )}
                          {invitation.proof_status === 'rejected' && (
                            <div className="text-center">
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 mb-1">
                                <X className="h-3 w-3 me-1" />
                                مرفوض
                              </Badge>
                              {invitation.proof_rejected_reason && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {invitation.proof_rejected_reason.slice(0, 30)}
                                  {invitation.proof_rejected_reason.length > 30 ? '...' : ''}
                                </p>
                              )}
                            </div>
                          )}
                          {invitation.proof_status === 'pending_submission' && (
                            <span className="text-xs text-muted-foreground">
                              في انتظار المؤثر
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">
                لا توجد دعوات مقبولة بعد
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                سيظهر المحتوى المرفوع هنا بعد قبول المؤثرين للدعوات
              </p>
            </div>
          )}
        </Card>

        {/* Rejection Reason Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>رفض المحتوى</DialogTitle>
              <DialogDescription>
                يرجى تقديم سبب الرفض (اختياري). سيتمكن المؤثر من رؤية السبب ورفع محتوى جديد.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">سبب الرفض (اختياري)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="مثال: المحتوى لا يتطابق مع متطلبات الحملة، أو الجودة غير مناسبة..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  disabled={processingProof}
                />
              </div>
              
              {selectedInvitation && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm">
                    <strong>المؤثر:</strong>{' '}
                    {selectedInvitation.influencer_profiles?.display_name ||
                     selectedInvitation.influencer_profiles?.instagram_handle ||
                     'مؤثر'}
                  </p>
                  {selectedInvitation.proof_url && (
                    <p className="text-sm mt-1">
                      <strong>الرابط:</strong>{' '}
                      <a
                        href={selectedInvitation.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        عرض المحتوى
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                  setSelectedInvitation(null);
                }}
                className="flex-1"
                disabled={processingProof}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleRejectProof}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={processingProof}
              >
                {processingProof ? 'جاري الرفض...' : 'تأكيد الرفض'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CampaignDetail;
