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
  const [influencers, setInfluencers] = useState<any[]>([]);

  useEffect(() => {
    if (user && id) {
      fetchCampaign();
      fetchMatchedInfluencers();
    }
  }, [user, id]);

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error: any) {
      toast.error('Failed to load campaign');
      navigate('/dashboard/owner');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchedInfluencers = async () => {
    try {
      const { data, error } = await supabase
        .from('influencer_profiles')
        .select('*, profiles(full_name, avatar_url)')
        .limit(10);

      if (error) throw error;
      setInfluencers(data || []);
    } catch (error) {
      console.error('Error fetching influencers:', error);
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
      in_progress: 'bg-primary text-primary-foreground',
      plan_ready: 'bg-secondary text-secondary-foreground',
      waiting_influencer_responses: 'bg-warning text-warning-foreground',
      completed: 'bg-success text-success-foreground',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
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
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status.replace(/_/g, ' ')}
              </Badge>
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
                <p className="text-sm text-muted-foreground">Budget</p>
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
                <p className="text-sm text-muted-foreground">Target Followers</p>
                <p className="text-xl font-bold">
                  {campaign.target_followers_min?.toLocaleString() || '0'} - {campaign.target_followers_max?.toLocaleString() || '∞'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-xl font-bold">
                  {new Date(campaign.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Description */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Campaign Description</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {campaign.description}
          </p>
          
          {campaign.content_requirements && (
            <>
              <h4 className="text-lg font-semibold mt-6 mb-3">Content Requirements</h4>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {campaign.content_requirements}
              </p>
            </>
          )}
        </Card>

        {/* Matched Influencers */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">AI-Matched Influencers</h3>
            </div>
            <Badge variant="outline">{influencers.length} matches</Badge>
          </div>

          {influencers.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {influencers.map((influencer) => (
                <Card key={influencer.id} className="p-4 hover:shadow-elevated transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary" />
                    <div className="flex-1">
                      <h4 className="font-semibold">
                        {influencer.profiles?.full_name || influencer.instagram_handle}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        @{influencer.instagram_handle}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{influencer.followers_count?.toLocaleString()} followers</span>
                        <span>•</span>
                        <span>{influencer.engagement_rate}% engagement</span>
                      </div>
                    </div>
                    <Button size="sm">Invite</Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No matching influencers found yet. Our AI is analyzing the best matches for your campaign.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CampaignDetail;
