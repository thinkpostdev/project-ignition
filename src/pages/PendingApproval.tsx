import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Home, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const PendingApproval = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    // Check approval status periodically (every 30 seconds) - only for influencers
    const checkApproval = async () => {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!userRole) return;

      // Only influencers need approval
      if (userRole.role === 'influencer') {
        const { data: influencerProfile } = await supabase
          .from('influencer_profiles')
          .select('is_approved')
          .eq('user_id', user.id)
          .single();

        if (influencerProfile?.is_approved) {
          toast.success('تم الموافقة على حسابك!');
          navigate('/dashboard/influencer');
        }
      } else if (userRole.role === 'owner') {
        // Owners don't need approval, redirect them directly
        navigate('/dashboard/owner');
      }
    };

    const interval = setInterval(checkApproval, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleGoToLanding = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-muted/30">
      <Card className="w-full max-w-lg p-5 sm:p-8 shadow-elevated text-center space-y-4 sm:space-y-6 relative">
        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="absolute top-4 right-4 gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">تسجيل خروج</span>
        </Button>

        <div className="flex justify-center pt-4">
          <div className="rounded-full bg-amber-100 p-3 sm:p-4">
            <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-amber-600" />
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold">حسابك قيد المراجعة</h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            شكراً لتسجيلك معنا
          </p>
        </div>

        <div className="bg-muted/50 p-4 sm:p-6 rounded-lg">
          <p className="text-base sm:text-lg leading-relaxed">
            تم استلام طلبك بنجاح. سنقوم بمراجعة المعلومات المُقدمة والتواصل معك في حال الموافقة على حسابك.
          </p>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
          <p>• عادةً ما تستغرق عملية المراجعة من 24 إلى 48 ساعة</p>
          <p>• سيتم إعلامك عبر البريد الإلكتروني عند الموافقة</p>
          <p>• يمكنك تسجيل الدخول لاحقاً للتحقق من حالة حسابك</p>
        </div>

        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleGoToLanding}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PendingApproval;

