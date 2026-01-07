import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from 'react-router-dom';
import { Sparkles, Target, CreditCard } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';

const Landing = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            InfluencersHub
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3" asChild>
              <Link to="/auth/login">{t('common.login')}</Link>
            </Button>
            <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-3" asChild>
              <Link to="/auth/register">{t('common.register')}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              {t('landing.hero.subtitle')}
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight px-2">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                {t('landing.hero.title')}
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              {t('landing.hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4 px-4">
              <Button 
                size="lg" 
                className="text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 shadow-glow w-full sm:w-auto"
                asChild
              >
                <Link to="/auth/register?role=owner">
                  {t('landing.hero.ctaOwner')}
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-base sm:text-lg h-12 sm:h-14 px-6 sm:px-8 w-full sm:w-auto"
                asChild
              >
                <Link to="/auth/register?role=influencer">
                  {t('landing.hero.ctaInfluencer')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-10 md:mb-12 animate-slide-up">
            {t('landing.features.title')}
          </h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="p-5 sm:p-6 md:p-8 hover:shadow-elevated transition-all duration-300 animate-slide-up border-2">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
                <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">
                {t('landing.features.matching.title')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {t('landing.features.matching.description')}
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 hover:shadow-elevated transition-all duration-300 animate-slide-up border-2" style={{ animationDelay: '0.1s' }}>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 sm:mb-6">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">
                {t('landing.features.management.title')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {t('landing.features.management.description')}
              </p>
            </Card>

            <Card className="p-5 sm:p-6 md:p-8 hover:shadow-elevated transition-all duration-300 animate-slide-up border-2 sm:col-span-2 md:col-span-1" style={{ animationDelay: '0.2s' }}>
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 sm:mb-6">
                <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">
                {t('landing.features.payments.title')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {t('landing.features.payments.description')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 InfluencersHub. All rights reserved.</p>
        </div>
      </footer>

      <FloatingWhatsApp />
    </div>
  );
};

export default Landing;
