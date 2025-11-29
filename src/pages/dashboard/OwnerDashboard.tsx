import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Plus, TrendingUp, Users, DollarSign } from 'lucide-react';
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
      fetchProfile();
      fetchCampaigns();
    }
  }, [user]);

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
      const active = data.filter(c => c.status === 'active').length;
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
          <div className="text-center py-12 text-muted-foreground">
            <p>لا توجد حملات حالياً</p>
            <Button variant="link" className="mt-2" asChild>
              <Link to="/dashboard/owner/campaigns/new">
                إنشاء حملة جديدة
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OwnerDashboard;
