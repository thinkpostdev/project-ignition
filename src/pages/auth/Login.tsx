import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from 'sonner';

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Simulate login - will be replaced with actual auth
    setTimeout(() => {
      toast.success(t('common.success'));
      // For demo, redirect to owner dashboard
      navigate('/dashboard/owner');
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
          <h1 className="text-3xl font-bold mb-2">{t('auth.login.title')}</h1>
          <p className="text-muted-foreground">{t('auth.login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.login.email')}</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.login.password')}</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm font-normal">
                {t('auth.login.rememberMe')}
              </Label>
            </div>
            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('common.loading') : t('common.login')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {t('auth.login.noAccount')}{' '}
          </span>
          <Link to="/auth/register" className="text-primary hover:underline font-medium">
            {t('auth.login.registerLink')}
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
