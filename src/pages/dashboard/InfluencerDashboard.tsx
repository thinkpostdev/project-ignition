import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Wallet, Briefcase, Mail } from 'lucide-react';

const InfluencerDashboard = () => {
  const { t } = useTranslation();

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
            <Button variant="ghost" size="sm">
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
              <span className="text-3xl font-bold">12,500</span>
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
              <span className="text-3xl font-bold">5</span>
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
              <span className="text-3xl font-bold">3</span>
            </div>
            <h3 className="font-semibold text-muted-foreground">
              {t('dashboard.influencer.pendingInvitations')}
            </h3>
          </Card>
        </div>

        {/* New Opportunities */}
        <Card className="p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">
            {t('dashboard.influencer.newOpportunities')}
          </h3>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="p-4 hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">مطعم البيك - الرياض</h4>
                      <Badge>منتجات جديدة</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      حي النرجس، الرياض • 3 فيديوهات • 10 أيام
                    </p>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-success">
                        2,500 ر.س
                      </span>
                      <span className="text-sm text-muted-foreground">
                        متبقي 36 ساعة
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      {t('dashboard.influencer.viewDetails')}
                    </Button>
                    <Button size="sm">
                      {t('dashboard.influencer.accept')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* My Collaborations */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            {t('dashboard.influencer.myCollaborations')}
          </h3>
          <div className="text-center py-12 text-muted-foreground">
            <p>لا توجد تعاونات نشطة حالياً</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InfluencerDashboard;
