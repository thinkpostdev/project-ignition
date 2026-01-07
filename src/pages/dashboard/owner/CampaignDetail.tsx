import { useTranslation } from 'react-i18next';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import { useState, useEffect, useMemo } from 'react';
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
  TrendingUp,
  Gift,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  X,
  FileCheck,
  MessageCircle,
  CreditCard,
  Trash2,
  RefreshCw,
  Instagram,
  User
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
  invitation_status?: string | null;
  invitation_id?: string | null;
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
  payment_approved: boolean | null;
  payment_submitted_at: string | null;
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
  const [approvingAll, setApprovingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  // Track edited dates per suggestion (key: suggestion.id, value: date string)
  const [editedDates, setEditedDates] = useState<Record<string, string>>({});
  const [invitations, setInvitations] = useState<InvitationWithProof[]>([]);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationWithProof | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingProof, setProcessingProof] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [selectedInfluencer, setSelectedInfluencer] = useState<CampaignSuggestion | null>(null);
  const [influencerDetails, setInfluencerDetails] = useState<{
    instagram_handle: string | null;
    tiktok_username: string | null;
    snapchat_username: string | null;
  } | null>(null);
  const [loadingInfluencerDetails, setLoadingInfluencerDetails] = useState(false);
  const [deletingSuggestionId, setDeletingSuggestionId] = useState<string | null>(null);

  // Calculate actual payment amount (sum of pending influencers' prices + 20% service fee)
  const actualPaymentAmount = useMemo(() => {
    const pendingSuggestions = suggestions.filter(s => !s.invitation_status);
    const totalCost = pendingSuggestions.reduce((sum, s) => sum + (s.min_price || 0), 0);
    const serviceFee = totalCost * 0.20; // 20% service fee
    return totalCost + serviceFee;
  }, [suggestions]);

  // Calculate influencers cost (without service fee) for breakdown display
  const influencersCost = useMemo(() => {
    const pendingSuggestions = suggestions.filter(s => !s.invitation_status);
    return pendingSuggestions.reduce((sum, s) => sum + (s.min_price || 0), 0);
  }, [suggestions]);

  // Calculate the actual number of unique dates from suggestions (selected influencers)
  // Exclude rejected invitations from the calculation
  const actualDuration = useMemo(() => {
    // First check if we have suggestions with scheduled dates (excluding declined/rejected)
    const suggestionsWithDates = suggestions.filter(s => 
      s.scheduled_date && s.invitation_status !== 'declined'
    );
    
    if (suggestionsWithDates.length === 0) {
      // Fall back to invitations if no suggestions with dates
      // invitations are already filtered to 'accepted' only in fetchInvitations
      const invitationsWithDates = invitations.filter(inv => inv.scheduled_date);
      
      if (invitationsWithDates.length === 0) {
        return campaign?.duration_days || 10;
      }
      
      const uniqueDates = new Set(
        invitationsWithDates.map(inv => inv.scheduled_date!.split('T')[0])
      );
      
      return uniqueDates.size;
    }
    
    // Get unique dates from suggestions (excluding declined)
    const uniqueDates = new Set(
      suggestionsWithDates.map(s => {
        // Extract just the date part (YYYY-MM-DD)
        return s.scheduled_date!.split('T')[0];
      })
    );
    
    return uniqueDates.size || campaign?.duration_days || 10;
  }, [suggestions, invitations, campaign?.duration_days]);

  useEffect(() => {
    if (user && id) {
      fetchCampaign();
      fetchSuggestions();
      fetchInvitations();
    }
  }, [user, id]);

  // Auto-refresh suggestions if campaign is still in draft/waiting state
  useEffect(() => {
    if (!campaign || !id) return;
    
    // Limit polling to 20 attempts (60 seconds total) to prevent infinite loops
    const MAX_POLLING_ATTEMPTS = 20;
    
    // If campaign is still processing and has no suggestions, poll for updates
    if ((campaign.status === 'draft' || campaign.status === 'waiting_match_plan') && 
        suggestions.length === 0 && 
        pollingAttempts < MAX_POLLING_ATTEMPTS) {
      console.log(`[CampaignDetail] Campaign still processing (attempt ${pollingAttempts + 1}/${MAX_POLLING_ATTEMPTS}), will refresh in 3 seconds...`);
      
      const refreshTimer = setTimeout(() => {
        console.log('[CampaignDetail] Auto-refreshing suggestions...');
        setPollingAttempts(prev => prev + 1);
        fetchSuggestions();
        fetchCampaign();
      }, 3000);

      return () => clearTimeout(refreshTimer);
    } else if (pollingAttempts >= MAX_POLLING_ATTEMPTS && suggestions.length === 0) {
      console.log('[CampaignDetail] Max polling attempts reached, stopping auto-refresh');
    }
  }, [campaign?.status, suggestions.length, id, pollingAttempts]);

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
      
      // Query suggestions
      const { data: suggestionsData, error } = await supabase
        .from('campaign_influencer_suggestions')
        .select('*')
        .eq('campaign_id', id)
        .order('match_score', { ascending: false });

      console.log('[CampaignDetail] Suggestions query result:', { data: suggestionsData, error, count: suggestionsData?.length });

      if (error) {
        console.error('[CampaignDetail] Suggestions query error:', error);
        throw error;
      }

      // Fetch all invitations for this campaign (all statuses)
      const { data: invitationsData } = await supabase
        .from('influencer_invitations')
        .select('id, influencer_id, status')
        .eq('campaign_id', id);

      console.log('[CampaignDetail] Invitations for status:', { invitations: invitationsData });

      // Create a map of influencer_id -> invitation status
      const invitationMap = new Map(
        (invitationsData || []).map(inv => [inv.influencer_id, { status: inv.status, id: inv.id }])
      );

      // Merge invitation status into suggestions
      const suggestionsWithStatus = (suggestionsData || []).map(suggestion => ({
        ...suggestion,
        invitation_status: invitationMap.get(suggestion.influencer_id)?.status || null,
        invitation_id: invitationMap.get(suggestion.influencer_id)?.id || null,
      }));

      setSuggestions(suggestionsWithStatus as CampaignSuggestion[]);
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

  const handleViewInfluencer = async (suggestion: CampaignSuggestion) => {
    setSelectedInfluencer(suggestion);
    setInfluencerDetails(null);
    setLoadingInfluencerDetails(true);
    
    try {
      const { data, error } = await supabase
        .from('influencer_profiles')
        .select('instagram_handle, tiktok_username, snapchat_username')
        .eq('id', suggestion.influencer_id)
        .single();

      if (error) throw error;
      
      setInfluencerDetails({
        instagram_handle: data?.instagram_handle || null,
        tiktok_username: data?.tiktok_username || null,
        snapchat_username: data?.snapchat_username || null,
      });
    } catch (error) {
      console.error('Error fetching influencer details:', error);
      toast.error('فشل تحميل بيانات المؤثر');
    } finally {
      setLoadingInfluencerDetails(false);
    }
  };

  const handleDeleteSuggestion = async (suggestionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the influencer details dialog
    
    setDeletingSuggestionId(suggestionId);
    try {
      const { error } = await supabase
        .from('campaign_influencer_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) throw error;

      // Remove from local state
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      toast.success('تم حذف المؤثر من القائمة');
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      toast.error('فشل حذف المؤثر');
    } finally {
      setDeletingSuggestionId(null);
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
          بانتظار رفع المحتوى
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

  const handleDeleteCampaign = async () => {
    if (!id || !campaign) return;
    
    setDeleting(true);
    try {
      // Check if campaign can be deleted (payment not approved)
      if (campaign.payment_approved === true) {
        toast.error('لا يمكن حذف الحملة بعد الموافقة على الدفع');
        setDeleteDialogOpen(false);
        return;
      }

      // Check if there are any accepted invitations
      const { data: acceptedInvitations } = await supabase
        .from('influencer_invitations')
        .select('id')
        .eq('campaign_id', id)
        .eq('status', 'accepted')
        .limit(1);

      if (acceptedInvitations && acceptedInvitations.length > 0) {
        toast.error('لا يمكن حذف الحملة لأن هناك مؤثرين قبلوا الدعوة');
        setDeleteDialogOpen(false);
        return;
      }

      // Delete related records first (due to foreign key constraints)
      // 1. Delete invitations
      await supabase
        .from('influencer_invitations')
        .delete()
        .eq('campaign_id', id);

      // 2. Delete suggestions
      await supabase
        .from('campaign_influencer_suggestions')
        .delete()
        .eq('campaign_id', id);

      // 3. Delete schedule items
      await supabase
        .from('campaign_schedule_items')
        .delete()
        .eq('campaign_id', id);

      // 4. Delete conversations
      await supabase
        .from('conversations')
        .delete()
        .eq('campaign_id', id);

      // 5. Delete offers
      await supabase
        .from('offers')
        .delete()
        .eq('campaign_id', id);

      // 6. Finally, delete the campaign
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('تم حذف الحملة بنجاح');
      navigate('/dashboard/owner');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل حذف الحملة';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
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

  // Get minimum date (3 days from now)
  const getMinimumDate = (): string => {
    const today = new Date();
    today.setDate(today.getDate() + 3); // Add 3 days
    return today.toISOString().split('T')[0];
  };

  // Format date for display in Arabic (Gregorian calendar)
  const formatDateArabic = (dateStr: string | null): string => {
    if (!dateStr) return 'غير محدد';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      calendar: 'gregory',
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Mark payment as submitted (admin will review and approve)
  const handleApproveAll = async () => {
    // Filter out suggestions that haven't been invited yet (no invitation_status)
    const pendingSuggestions = suggestions.filter(s => !s.invitation_status);
    
    if (pendingSuggestions.length === 0) {
      toast.info('جميع المؤثرين تم إرسال دعوات لهم بالفعل');
      return;
    }

    setApprovingAll(true);
    
    try {
      const loadingToast = toast.loading(`جاري حفظ التواريخ...`);
      
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

      // Calculate actual payment amount
      const actualPayment = pendingSuggestions.reduce((sum, s) => sum + (s.min_price || 0), 0);
      
      // Mark payment as submitted and update budget to actual amount
      const { error: paymentError } = await supabase
        .from('campaigns')
        .update({ 
          payment_submitted_at: new Date().toISOString(),
          budget: actualPayment  // Update budget to actual cost
        })
        .eq('id', id);

      if (paymentError) throw paymentError;

      toast.dismiss(loadingToast);
      toast.success('تم تسجيل الدفع بنجاح!');
      
      // Clear edited dates and refresh
      setEditedDates({});
      await fetchCampaign();
      await fetchSuggestions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'فشل تسجيل الدفع';
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
  
  // Calculate ACTUAL current budget and stats based on invitation statuses
  const calculateCurrentStats = () => {
    if (!campaign.budget) return { 
      cost: 0, 
      remaining: 0, 
      percent: 0,
      totalInfluencers: 0,
      paidInfluencers: 0,
      hospitalityInfluencers: 0,
      totalReach: 0
    };
    
    // Filter for active invitations (pending + accepted)
    const activeInvitations = suggestions.filter(
      s => s.invitation_status === 'pending' || s.invitation_status === 'accepted'
    );
    
    // Calculate costs
    const activeCost = activeInvitations.reduce((sum, s) => sum + (s.min_price || 0), 0);
    const remaining = campaign.budget - activeCost;
    const percent = Math.round((activeCost / campaign.budget) * 100);
    
    // Count influencers by type
    const paidCount = activeInvitations.filter(s => 
      s.type_label?.toLowerCase() === 'paid' || (s.min_price && s.min_price > 0)
    ).length;
    
    const hospitalityCount = activeInvitations.filter(s => 
      s.type_label?.toLowerCase() === 'hospitality' || !s.min_price || s.min_price === 0
    ).length;
    
    // Calculate total reach
    const totalReach = activeInvitations.reduce((sum, s) => sum + (s.avg_views_val || 0), 0);
    
    return {
      cost: activeCost,
      remaining: remaining,
      percent: percent,
      totalInfluencers: activeInvitations.length,
      paidInfluencers: paidCount,
      hospitalityInfluencers: hospitalityCount,
      totalReach: totalReach
    };
  };
  
  const currentStats = calculateCurrentStats();
  const budgetUsedPercent = currentStats.percent;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            InfluencersHub
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
            {/* Show delete button only if payment is not approved */}
            {campaign.payment_approved !== true && (
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 me-2" />
                {deleting ? 'جاري الحذف...' : 'حذف الحملة'}
              </Button>
            )}
          </div>
        </div>

        {/* Strategy Summary (if available) */}
        {strategy && (
          <Card className="p-6 mb-8 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">ملخص الحملة الحالي</h3>
              <Badge variant="outline" className="text-xs">محدث تلقائياً</Badge>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">المؤثرين النشطين</span>
                </div>
                <p className="text-2xl font-bold">{currentStats.totalInfluencers}</p>
                <p className="text-xs text-muted-foreground">
                  {currentStats.paidInfluencers} مدفوع • {currentStats.hospitalityInfluencers} ضيافة
                </p>
              </div>

              <div className="bg-background rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-muted-foreground">التكلفة الحالية</span>
                </div>
                <p className="text-2xl font-bold">{currentStats.cost.toLocaleString()} ر.س</p>
                <p className="text-xs text-muted-foreground">
                  متبقي: {currentStats.remaining.toLocaleString()} ر.س
                </p>
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
                <p className="text-xl font-bold">{campaign?.duration_days || 10} أيام</p>
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
              {suggestions.length > 0 && suggestions.some(s => !s.invitation_status) && !campaign.payment_submitted_at && (
                <Button 
                  onClick={() => setPaymentDialogOpen(true)}
                  disabled={approvingAll}
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  {approvingAll ? (
                    <>
                      <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 me-2" />
                      المتابعة للدفع ({suggestions.filter(s => !s.invitation_status).length})
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Payment Submitted Notice */}
          {campaign.payment_submitted_at && !campaign.payment_approved && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-1">
                    سيتم مراجعة الدفع ومن ثم إرسال الدعوات إلى المؤثرين
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    تم تسجيل تأكيد الدفع بنجاح. سيقوم فريقنا بمراجعة الدفع وإرسال الدعوات للمؤثرين خلال أقرب وقت ممكن.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Approved & Invitations Sent Notice */}
          {campaign.payment_approved && suggestions.some(s => s.invitation_status) && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-green-800 dark:text-green-200 mb-1">
                    تم اعتماد الدفع وإرسال الدعوات
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    تم إرسال الدعوات للمؤثرين المختارين. يمكنك متابعة حالة الدعوات أدناه.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Red Notice */}
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed">
              <strong className="text-red-800 dark:text-red-200">ملاحظة:</strong>في حال عدم قبول الدعوة من المؤثّر، تُرسل الدعوة لمؤثر بديل.</p>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((suggestion) => {
                const isHospitality = suggestion.type_label?.toLowerCase() === 'hospitality';
                
                return (
                  <Card 
                    key={suggestion.id} 
                    className={`p-5 hover:shadow-elevated transition-shadow cursor-pointer ${
                      isHospitality ? 'border-amber-200 dark:border-amber-800/50' : ''
                    } ${
                      suggestion.invitation_status === 'declined' ? 'opacity-60 border-red-200 dark:border-red-800/50' : ''
                    }`}
                    onClick={() => handleViewInfluencer(suggestion)}
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
                            <h4 className={`font-semibold text-lg ${
                              suggestion.invitation_status === 'declined' ? 'line-through text-muted-foreground' : ''
                            }`}>
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
                            
                            {/* Invitation Status Badge */}
                            {suggestion.invitation_status === 'pending' && (
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                <Clock className="h-3 w-3 me-1" />
                                في الانتظار
                              </Badge>
                            )}
                            {suggestion.invitation_status === 'accepted' && (
                              <Badge variant="default" className="bg-emerald-600">
                                <CheckCircle2 className="h-3 w-3 me-1" />
                                مقبول
                              </Badge>
                            )}
                            {suggestion.invitation_status === 'declined' && (
                              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                <X className="h-3 w-3 me-1" />
                                المؤثر رفض الدعوة
                              </Badge>
                            )}
                            {suggestion.invitation_status === 'cancelled' && (
                              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                                <X className="h-3 w-3 me-1" />
                                ملغي
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
                                  {formatViewsCount(suggestion.avg_views_val)} المشاهدات المتوقعة
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
                            {suggestion.invitation_status ? (
                              <span className={`text-sm font-medium ${
                                suggestion.invitation_status === 'declined' 
                                  ? 'text-red-700 line-through' 
                                  : 'text-purple-700'
                              }`}>
                                {formatDateArabic(getEffectiveDate(suggestion))}
                              </span>
                            ) : (
                              <input
                                type="date"
                                value={getEffectiveDate(suggestion) || ''}
                                onChange={(e) => handleDateChange(suggestion.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                min={getMinimumDate()}
                              />
                            )}
                            {editedDates[suggestion.id] && !suggestion.invitation_status && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                معدل
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Delete button - only show before payment is submitted */}
                      {!suggestion.invitation_status && !campaign?.payment_submitted_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => handleDeleteSuggestion(suggestion.id, e)}
                          disabled={deletingSuggestionId === suggestion.id}
                        >
                          {deletingSuggestionId === suggestion.id ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </Button>
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
                                calendar: 'gregory',
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

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-primary" />
                إتمام عملية الدفع
              </DialogTitle>
              <DialogDescription>
                اتبع الخطوات التالية لإتمام الدفع وإرسال الدعوات للمؤثرين
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5 py-4">
              {/* Payment Amount - Prominent Display */}
              <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-6 text-white text-center shadow-lg">
                <p className="text-sm opacity-90 mb-2">المبلغ المطلوب تحويله</p>
                <p className="text-5xl font-bold mb-1">{actualPaymentAmount.toLocaleString()}</p>
                <p className="text-xl">ريال سعودي</p>
                <div className="mt-4 pt-4 border-t border-white/20 space-y-2">
                  <div className="flex justify-between items-center text-sm opacity-90">
                    <span>تكلفة المؤثرين ({suggestions.filter(s => !s.invitation_status).length} مؤثر):</span>
                    <span className="font-semibold">{influencersCost.toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between items-center text-sm opacity-90">
                    <span>رسوم الخدمة (20%):</span>
                    <span className="font-semibold">{(influencersCost * 0.20).toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>

              {/* Step 1 */}
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      حوّل المبلغ إلى الحساب البنكي التالي لإعتماد الحملة
                    </h4>
                    
                    <div className="space-y-3 bg-background rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b pb-3">
                        <span className="text-muted-foreground font-medium">اسم الشركة:</span>
                        <span className="font-bold text-lg">شركة فكرة مبرمج</span>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <span className="text-muted-foreground font-medium">رقم الآيبان:</span>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 font-mono text-base sm:text-lg font-bold bg-muted px-3 py-2 rounded border-2 border-primary/20">
                            SA 74 8000 0470 6080 1921 4569
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText('SA7480000470608019214569');
                              toast.success('تم نسخ رقم الآيبان');
                            }}
                            className="flex-shrink-0"
                          >
                            نسخ
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <span className="text-muted-foreground font-medium">رقم السجل التجاري:</span>
                        <span className="font-bold text-lg">7052473522</span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-t pt-3">
                        <span className="text-muted-foreground font-medium">المبلغ المطلوب:</span>
                        <span className="font-bold text-2xl text-primary">{actualPaymentAmount.toLocaleString()} ر.س</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2 text-green-800 dark:text-green-300">
                      <MessageCircle className="h-5 w-5" />
                      تواصل معنا عبر واتساب
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      بعد إتمام التحويل، تواصل معنا مباشرة عبر واتساب لتأكيد الدفع وإرسال إثبات التحويل
                    </p>
                    
                    <Button
                      onClick={() => {
                        window.open('https://wa.me/966550281271', '_blank');
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="lg"
                    >
                      <MessageCircle className="h-5 w-5 me-2" />
                      التواصل عبر واتساب (+966 55 028 1271)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                      <CheckCircle2 className="h-5 w-5" />
                      انقر على زر "تم الدفع"
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      بعد التحويل والتواصل معنا، اضغط على زر "تم الدفع" أدناه. سنراجع الدفع ونرسل الدعوات للمؤثرين فوراً
                    </p>
                  </div>
                </div>
              </div>

              
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
                className="flex-1"
                disabled={approvingAll}
              >
                <ArrowLeft className="h-4 w-4 me-2" />
                العودة
              </Button>
              <Button
                onClick={async () => {
                  await handleApproveAll();
                  setPaymentDialogOpen(false);
                }}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:opacity-90"
                disabled={approvingAll || campaign?.payment_submitted_at !== null}
                size="lg"
              >
                {approvingAll ? (
                  <>
                    <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : campaign?.payment_submitted_at ? (
                  <>
                    <Clock className="h-4 w-4 me-2" />
                    بانتظار مراجعة الدفع
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 me-2" />
                    تم الدفع
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Campaign Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>حذف الحملة</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف هذه الحملة؟ سيتم حذف جميع البيانات المرتبطة بها بما في ذلك الاقتراحات والدعوات.
                <br />
                <strong className="text-destructive">لا يمكن التراجع عن هذا الإجراء.</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {campaign && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm">
                    <strong>عنوان الحملة:</strong> {campaign.title}
                  </p>
                  <p className="text-sm mt-1">
                    <strong>الحالة:</strong> {getStatusLabel(campaign.status)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteCampaign}
                disabled={deleting}
                className="flex-1"
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Influencer Info Dialog */}
        <Dialog open={selectedInfluencer !== null} onOpenChange={(open) => !open && setSelectedInfluencer(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                معلومات المؤثر
              </DialogTitle>
            </DialogHeader>
            {selectedInfluencer && (
              <div className="space-y-6 py-4">
                {/* Influencer Name & Match Score */}
                <div className="flex items-center gap-4">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                    selectedInfluencer.type_label?.toLowerCase() === 'hospitality'
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                      : 'bg-gradient-to-br from-primary to-secondary'
                  }`}>
                    {selectedInfluencer.name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedInfluencer.name || 'مؤثر'}</h3>
                    <Badge 
                      variant="outline" 
                      className={`${getScoreColor(selectedInfluencer.match_score)} border-current mt-1`}
                    >
                      <TrendingUp className="h-3 w-3 me-1" />
                      {selectedInfluencer.match_score?.toFixed(0)}% تطابق
                    </Badge>
                  </div>
                </div>

                {/* Social Media Accounts */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">حسابات التواصل الاجتماعي</h4>
                  {loadingInfluencerDetails ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري التحميل...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {influencerDetails?.instagram_handle && (
                        <div className="flex items-center gap-2 text-sm">
                          <Instagram className="h-4 w-4 text-pink-600" />
                          <span className="font-medium">Instagram:</span>
                          <a 
                            href={`https://instagram.com/${influencerDetails.instagram_handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{influencerDetails.instagram_handle.replace('@', '')}
                          </a>
                        </div>
                      )}
                      {influencerDetails?.tiktok_username && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                          <span className="font-medium">TikTok:</span>
                          <a 
                            href={`https://tiktok.com/@${influencerDetails.tiktok_username.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{influencerDetails.tiktok_username.replace('@', '')}
                          </a>
                        </div>
                      )}
                      {influencerDetails?.snapchat_username && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="h-4 w-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.32.32 0 0 1 .114-.023c.193 0 .355.104.437.263.096.189.068.394-.075.545-.36.38-.858.716-1.441.983-.115.052-.184.114-.224.183.078.38.268.818.469 1.287.154.362.32.753.454 1.152.065.188.057.37-.028.51-.086.142-.236.24-.419.27-.169.028-.347.049-.523.07-.26.028-.508.055-.748.106-.096.02-.182.093-.269.228-.264.41-.57.855-.971 1.196-.315.27-.661.453-1.067.527-.242.044-.495.069-.753.088-.387.027-.774.055-1.14.147-.348.087-.665.243-.955.393-.274.142-.545.281-.825.4-.313.138-.635.187-.99.138-.225-.031-.45-.092-.664-.181-.166-.069-.331-.15-.5-.242-.172-.092-.344-.191-.542-.267-.172-.068-.354-.113-.54-.15-.127-.026-.258-.043-.389-.057-.237-.025-.476-.043-.72-.077-.243-.035-.434-.157-.516-.317-.092-.182-.077-.402.04-.614a8.04 8.04 0 0 1 .553-.952c.256-.408.532-.846.727-1.296.11-.252.128-.461.053-.609-.138-.266-.548-.393-.938-.515-.067-.02-.135-.042-.2-.064-.64-.207-1.297-.44-1.71-.885-.128-.139-.176-.323-.124-.483.053-.167.188-.29.385-.345.107-.03.213-.036.293-.02.296.063.634.195.972.329.316.125.64.254.953.321.143.031.269-.02.365-.076-.026-.149-.047-.32-.067-.497-.093-.752-.211-1.898-.08-2.67.377-2.268 1.574-3.783 3.538-4.488a5.68 5.68 0 0 1 1.851-.315"/>
                          </svg>
                          <span className="font-medium">Snapchat:</span>
                          <span>{influencerDetails.snapchat_username}</span>
                        </div>
                      )}
                      {!influencerDetails?.instagram_handle && !influencerDetails?.tiktok_username && !influencerDetails?.snapchat_username && (
                        <p className="text-sm text-muted-foreground">لا توجد حسابات مسجلة</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Expected Reach */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">الوصول المتوقع</h4>
                  <div className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <span className="font-bold">
                      {selectedInfluencer.avg_views_val 
                        ? formatViewsCount(selectedInfluencer.avg_views_val)
                        : 'غير محدد'
                      }
                    </span>
                    <span className="text-muted-foreground text-sm">مشاهدة متوقعة</span>
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">السعر</h4>
                  <div className="flex items-center gap-2">
                    {selectedInfluencer.type_label?.toLowerCase() === 'hospitality' ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-lg py-1 px-3">
                        <Gift className="h-4 w-4 me-2" />
                        ضيافة (مجاني)
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2 text-lg">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        <span className="font-bold text-emerald-600">
                          {selectedInfluencer.min_price?.toLocaleString() || 0} ر.س
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  {selectedInfluencer.city_served && (
                    <div>
                      <p className="text-xs text-muted-foreground">المدينة</p>
                      <p className="font-medium">{selectedInfluencer.city_served}</p>
                    </div>
                  )}
                  {selectedInfluencer.content_type && (
                    <div>
                      <p className="text-xs text-muted-foreground">نوع المحتوى</p>
                      <p className="font-medium">{selectedInfluencer.content_type}</p>
                    </div>
                  )}
                  {selectedInfluencer.platform && (
                    <div>
                      <p className="text-xs text-muted-foreground">المنصة</p>
                      <p className="font-medium">{selectedInfluencer.platform}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <FloatingWhatsApp />
    </div>
  );
};

export default CampaignDetail;
