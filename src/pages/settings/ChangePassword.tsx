import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Save } from 'lucide-react';

const passwordSchema = z.object({
  newPassword: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(72, 'كلمة المرور طويلة جداً'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const ChangePassword = () => {
  const [saving, setSaving] = useState(false);

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: PasswordFormData) => {
    setSaving(true);
    try {
      // Supabase auth.updateUser() to change password
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      toast.success('تم تغيير كلمة المرور بنجاح');
      form.reset();
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      
      // Handle specific Supabase errors
      if (error instanceof Error) {
        if (error.message.includes('New password should be different')) {
          toast.error('كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة');
        } else if (error.message.includes('Password is too weak')) {
          toast.error('كلمة المرور ضعيفة. استخدم كلمة مرور أقوى');
        } else {
          toast.error(error.message || 'فشل تغيير كلمة المرور');
        }
      } else {
        toast.error('فشل تغيير كلمة المرور');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">تغيير كلمة المرور</h3>
          <p className="text-sm text-muted-foreground">قم بتحديث كلمة المرور الخاصة بك</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">كلمة المرور الجديدة *</Label>
            <Input
              id="newPassword"
              type="password"
              {...form.register('newPassword')}
              placeholder="••••••••"
              disabled={saving}
            />
            {form.formState.errors.newPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              يجب أن تتكون كلمة المرور من 6 أحرف على الأقل
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...form.register('confirmPassword')}
              placeholder="••••••••"
              disabled={saving}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? 'جاري الحفظ...' : (
              <>
                <Save className="h-4 w-4 me-2" />
                تحديث كلمة المرور
              </>
            )}
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>ملاحظة:</strong> بعد تغيير كلمة المرور، ستظل مسجلاً للدخول في الجلسة الحالية.
          </p>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;

