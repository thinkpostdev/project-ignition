import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from 'sonner';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(searchParams.get('role') || 'owner');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Simulate registration - will be replaced with actual auth
    setTimeout(() => {
      toast.success(t('common.success'));
      navigate(`/onboarding/${role}`);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('auth.register.title')}</h1>
          <p className="text-muted-foreground">{t('auth.register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('auth.register.fullName')}</Label>
            <Input id="fullName" required placeholder="أحمد محمد" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.register.email')}</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('auth.register.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              required
              placeholder="+966 XX XXX XXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.register.password')}</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t('auth.register.confirmPassword')}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-3">
            <Label>{t('auth.register.role')}</Label>
            <RadioGroup value={role} onValueChange={setRole}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner" className="font-normal cursor-pointer">
                  {t('auth.register.roleOwner')}
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="influencer" id="influencer" />
                <Label htmlFor="influencer" className="font-normal cursor-pointer">
                  {t('auth.register.roleInfluencer')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="terms" required />
            <Label htmlFor="terms" className="text-sm font-normal">
              {t('auth.register.acceptTerms')}
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('common.register')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {t('auth.register.haveAccount')}{' '}
          </span>
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            {t('auth.register.loginLink')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
