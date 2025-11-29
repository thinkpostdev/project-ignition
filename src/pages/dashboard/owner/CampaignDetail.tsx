import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Users, DollarSign, Calendar, Sparkles } from 'lucide-react';

const CampaignDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (user && id) {
      fetchCampaign();
      fetchSuggestions();
    }
  }, [user, id]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          owner_profiles (
            business_name,
            main_type
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error: any) {
      toast.error('فشل تحميل الحملة');
      navigate('/dashboard/owner');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_influencer_suggestions')
        .select(`
          *,
          influencer_profiles (
            display_name,
            instagram_handle,
            bio,
            cities,
            primary_platforms,
            category
          )
        `)
        .eq('campaign_id', id)
        .order('match_score', { ascending: false });

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSendInvitation = async (suggestionId: string, influencerId: string) => {
    try {
      // Mark suggestion as selected
      await supabase
        .from('campaign_influencer_suggestions')
        .update({ selected: true })
        .eq('id', suggestionId);

      // Create invitation
      const { error } = await supabase
        .from('influencer_invitations')
        .insert({
          campaign_id: id,
          influencer_id: influencerId,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('تم إرسال الدعوة بنجاح!');
      fetchSuggestions();
    } catch (error: any) {
      toast.error(error.message || 'فشل إرسال الدعوة');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) return null;

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
          Back to Dashboard
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
          </div>
        </div>

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
                <strong>الهدف:</strong> {campaign.goal === 'opening' ? 'افتتاح' : 
                  campaign.goal === 'promotions' ? 'عروض ترويجية' : 
                  campaign.goal === 'new_products' ? 'منتجات جديدة' : 'أخرى'}
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
            <Badge variant="outline">{suggestions.length} مقترح</Badge>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="p-5 hover:shadow-elevated transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                        {suggestion.influencer_profiles?.display_name?.charAt(0) || 'M'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-lg">
                            {suggestion.name || suggestion.influencer_profiles?.display_name}
                          </h4>
                          <Badge variant="outline" className="bg-primary/5">
                            {suggestion.match_score}% تطابق
                          </Badge>
                          {suggestion.selected && (
                            <Badge variant="default">تم الإرسال</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          @{suggestion.influencer_profiles?.instagram_handle}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          {suggestion.city_served && (
                            <span>📍 {suggestion.city_served}</span>
                          )}
                          {suggestion.platform && (
                            <span>• {suggestion.platform}</span>
                          )}
                          {suggestion.content_type && (
                            <span>• {suggestion.content_type}</span>
                          )}
                        </div>
                        {suggestion.min_price && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-success" />
                            <span className="font-semibold text-success">
                              {suggestion.min_price.toLocaleString()} ر.س
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      disabled={suggestion.selected}
                      onClick={() => handleSendInvitation(suggestion.id, suggestion.influencer_id)}
                    >
                      {suggestion.selected ? 'تم الإرسال' : 'إرسال دعوة'}
                    </Button>
                  </div>
                </Card>
              ))}
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
                <p className="text-muted-foreground">
                  لم يتم العثور على مؤثرين مناسبين بعد.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CampaignDetail;
