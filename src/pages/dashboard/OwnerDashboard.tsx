import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Plus, TrendingUp, Users, DollarSign, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const OwnerDashboard = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    pendingOffers: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (user) {
      checkOwnerProfile();
    }
  }, [user]);

  const checkOwnerProfile = async () => {
    // Check if owner profile exists
    const { data: ownerProfile } = await supabase
      .from('owner_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (!ownerProfile) {
      toast.info('يرجى إكمال ملف المنشأة');
      navigate('/onboarding/owner');
      return;
    }

    fetchProfile();
    fetchCampaigns();
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(data);
  };

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*, offers(count)')
      .eq('owner_id', user?.id)
      .order('created_at', { ascending: false });
    
    setCampaigns(data || []);
    
    if (data) {
      const active = data.filter(c => 
        c.status === 'in_progress' || 
        c.status === 'plan_ready' || 
        c.status === 'waiting_influencer_responses'
      ).length;
      const pending = data.reduce((acc, c) => acc + (c.offers?.[0]?.count || 0), 0);
      const spent = data.reduce((acc: number, c: any) => acc + (parseFloat(c.budget?.toString() || '0') || 0), 0);
      
      setStats({
        activeCampaigns: active,
        pendingOffers: pending,
        totalSpent: spent,
      });
    }
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
              <Link to="/settings/owner">
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
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {t('dashboard.owner.greeting')} {profile?.full_name || ''} 👋
          </h2>
          <Button size="lg" className="shadow-glow" asChild>
            <Link to="/dashboard/owner/campaigns/new">
              <Plus className="h-5 w-5 me-2" />
              {t('dashboard.owner.createCampaign')}
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <span className="text-3xl font-bold">{stats.activeCampaigns}</span>
            </div>
            <h3 className="font-semibold text-muted-foreground">
              {t('dashboard.owner.activeCampaigns')}
            </h3>
          </Card>

          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <span className="text-3xl font-bold">{stats.pendingOffers}</span>
            </div>
            <h3 className="font-semibold text-muted-foreground">
              {t('dashboard.owner.pendingResponses')}
            </h3>
          </Card>

          <Card className="p-6 hover:shadow-elevated transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-accent" />
              </div>
              <span className="text-3xl font-bold">{stats.totalSpent.toLocaleString()}</span>
            </div>
            <h3 className="font-semibold text-muted-foreground">
              {t('dashboard.owner.moneySpent')} ر.س
            </h3>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">حملاتي</h3>
          {campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Link 
                  key={campaign.id} 
                  to={`/dashboard/owner/campaigns/${campaign.id}`}
                  className="block"
                >
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">{campaign.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {campaign.description?.slice(0, 100)}{campaign.description?.length > 100 ? '...' : ''}
                        </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>الميزانية: {campaign.budget?.toLocaleString()} ر.س</span>
                          {campaign.created_at && (
                            <span>تاريخ الإنشاء: {new Date(campaign.created_at).toLocaleDateString('ar-SA', { calendar: 'gregory' })}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'plan_ready' ? 'bg-blue-100 text-blue-700' :
                          campaign.status === 'waiting_influencer_responses' ? 'bg-yellow-100 text-yellow-700' :
                          campaign.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {campaign.status === 'in_progress' ? 'جارية' :
                           campaign.status === 'plan_ready' ? 'الخطة جاهزة' :
                           campaign.status === 'waiting_influencer_responses' ? 'بانتظار الردود' :
                           campaign.status === 'completed' ? 'مكتملة' :
                           campaign.status === 'draft' ? 'مسودة' :
                           campaign.status || 'جديدة'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>لا توجد حملات حالياً</p>
              <Button variant="link" className="mt-2" asChild>
                <Link to="/dashboard/owner/campaigns/new">
                  إنشاء حملة جديدة
                </Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;
