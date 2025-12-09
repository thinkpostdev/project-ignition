import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Home } from 'lucide-react';
import { toast } from 'sonner';

const PendingApproval = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    // Check approval status periodically (every 30 seconds)
    const checkApproval = async () => {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!userRole) return;

      if (userRole.role === 'owner') {
        const { data: ownerProfile } = await supabase
          .from('owner_profiles')
          .select('is_approved')
          .eq('user_id', user.id)
          .single();

        if (ownerProfile?.is_approved) {
          toast.success('تم الموافقة على حسابك!');
          navigate('/dashboard/owner');
        }
      } else if (userRole.role === 'influencer') {
        const { data: influencerProfile } = await supabase
          .from('influencer_profiles')
          .select('is_approved')
          .eq('user_id', user.id)
          .single();

        if (influencerProfile?.is_approved) {
          toast.success('تم الموافقة على حسابك!');
          navigate('/dashboard/influencer');
        }
      }
    };

    const interval = setInterval(checkApproval, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, navigate]);

  const handleGoToLanding = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-lg p-8 shadow-elevated text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-amber-100 p-4">
            <Clock className="h-12 w-12 text-amber-600" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold">حسابك قيد المراجعة</h1>
          <p className="text-xl text-muted-foreground">
            شكراً لتسجيلك معنا
          </p>
        </div>

        <div className="bg-muted/50 p-6 rounded-lg">
          <p className="text-lg leading-relaxed">
            تم استلام طلبك بنجاح. سنقوم بمراجعة المعلومات المُقدمة والتواصل معك في حال الموافقة على حسابك.
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
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

