import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(searchParams.get('role') || 'owner');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      // Redirect to appropriate dashboard
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === 'owner') {
            navigate('/dashboard/owner');
          } else if (data?.role === 'influencer') {
            navigate('/dashboard/influencer');
          }
        });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('auth.register.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
        });

        // Create user role
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: role as 'owner' | 'influencer',
        });

        toast.success(t('auth.register.success'));
        
        if (role === 'owner') {
          navigate('/dashboard/owner');
        } else {
          navigate('/dashboard/influencer');
        }
      }
    } catch (error: any) {
      toast.error(error.message || t('auth.register.error'));
    } finally {
      setLoading(false);
    }
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
            <Input 
              id="fullName" 
              required 
              placeholder="أحمد محمد"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.register.email')}</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('auth.register.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              required
              placeholder="+966 XX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.register.password')}</Label>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
