import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, ChevronLeft, Check, Plus, Trash2 } from 'lucide-react';

const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 
  'الطائف', 'بريدة', 'تبوك', 'خميس مشيط', 'الهفوف', 'حائل', 'نجران', 
  'الجبيل', 'ينبع', 'أبها', 'عرعر', 'سكاكا', 'جازان', 'القطيف'
];

const RESTAURANT_SUB_CATEGORIES = [
  'مطعم شعبي',
  'مطعم إيطالي',
  'مطعم أمريكي',
  'مطعم يمني',
  'مطعم شامي (سوري / لبناني)',
  'مطعم تركي',
  'مطعم مصري',
  'مطعم هندي',
  'مطعم باكستاني',
  'مطعم صيني',
  'مطعم ياباني (سوشي، رامِن)',
  'مطعم آسيوي فيوجن (خلطات آسيوية عامة)',
  'مطعم مكسيكي',
  'مطعم ستيك / مشاوي',
  'مطعم بحري (سي فود)',
  'مطعم برجر',
  'مطعم بيتزا',
  'مطعم شاورما / بروست',
];

const CAFE_SUB_CATEGORIES = [
  'كوفي شوب قهوة مختصة (Specialty Coffee)',
  'كوفي شوب تجاري (Brands معروفة / قهوة عادية)',
  'كوفي شوب درايف ثرو (فاست قهوة بالسيارة)',
];

const step1Schema = z.object({
  business_name: z.string().min(2, 'اسم المنشأة مطلوب'),
  main_type: z.enum(['restaurant', 'cafe']),
  sub_category: z.string().optional(),
  price_level: z.enum(['cheap', 'moderate', 'expensive']),
});

const branchSchema = z.object({
  city: z.string().min(1, 'المدينة مطلوبة'),
  neighborhood: z.string().min(1, 'اسم الحي مطلوب'),
  google_map_url: z.string().min(1, 'رابط خرائط جوجل مطلوب').url('رابط خرائط جوجل غير صحيح'),
});

const step2Schema = z.object({
  branches: z.array(branchSchema).min(1, 'يجب إضافة فرع واحد على الأقل'),
});

const step3Schema = z.object({
  instagram_handle: z.string().optional(),
  tiktok_username: z.string().optional(),
  snapchat_username: z.string().optional(),
  target_audience: z.string().optional(),
}).refine((data) => {
  // Ensure at least one social media account is provided
  const hasInstagram = data.instagram_handle && data.instagram_handle.length > 0;
  const hasTiktok = data.tiktok_username && data.tiktok_username.length > 0;
  const hasSnapchat = data.snapchat_username && data.snapchat_username.length > 0;
  
  return hasInstagram || hasTiktok || hasSnapchat;
}, {
  message: 'يجب إدخال معلومات حساب واحد على الأقل',
  path: ['instagram_handle'],
});

type Step1Data = z.infer<typeof step1Schema>;
type Branch = z.infer<typeof branchSchema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const OwnerOnboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data>>({});
  const [branches, setBranches] = useState<Branch[]>([{ city: '', neighborhood: '', google_map_url: '' }]);

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: formData,
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { branches },
  });

  const form3 = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: formData,
  });

  const handleStep1 = (data: Step1Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
  };

  const handleStep2 = (data: Step2Data) => {
    setFormData({ ...formData, ...data });
    setBranches(data.branches);
    setCurrentStep(3);
  };

  const handleStep3 = async (data: Step3Data) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const finalData = { ...formData, ...data };
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('owner_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let ownerProfile;

      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabase
          .from('owner_profiles')
          .update({
            business_name: finalData.business_name!,
            main_type: finalData.main_type,
            sub_category: finalData.sub_category,
            price_level: finalData.price_level,
            instagram_handle: finalData.instagram_handle,
            tiktok_username: finalData.tiktok_username,
            snapchat_username: finalData.snapchat_username,
            target_audience: finalData.target_audience,
            is_approved: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        ownerProfile = updatedProfile;

        // Delete existing branches before adding new ones
        await supabase
          .from('branches')
          .delete()
          .eq('owner_id', existingProfile.id);
      } else {
        // Create new profile
        const { data: newProfile, error: profileError } = await supabase
          .from('owner_profiles')
          .insert([{
            user_id: user.id,
            business_name: finalData.business_name!,
            main_type: finalData.main_type,
            sub_category: finalData.sub_category,
            price_level: finalData.price_level,
            instagram_handle: finalData.instagram_handle,
            tiktok_username: finalData.tiktok_username,
            snapchat_username: finalData.snapchat_username,
            target_audience: finalData.target_audience,
            is_approved: false,
          }])
          .select()
          .single();

        if (profileError) throw profileError;
        ownerProfile = newProfile;
      }

      // Then, create the branches
      if (branches.length > 0 && ownerProfile) {
        const branchesData = branches.map(branch => ({
          owner_id: ownerProfile.id,
          city: branch.city,
          neighborhood: branch.neighborhood,
          google_map_url: branch.google_map_url,
        }));

        const { error: branchesError } = await supabase
          .from('branches')
          .insert(branchesData);

        if (branchesError) throw branchesError;
      }

      toast.success('تم حفظ الملف الشخصي بنجاح');
      navigate('/pending-approval');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  const addBranch = () => {
    const newBranches = [...branches, { city: '', neighborhood: '', google_map_url: '' }];
    setBranches(newBranches);
    form2.setValue('branches', newBranches);
  };

  const removeBranch = (index: number) => {
    const newBranches = branches.filter((_, i) => i !== index);
    setBranches(newBranches);
    form2.setValue('branches', newBranches);
  };

  const updateBranch = (index: number, field: keyof Branch, value: string) => {
    const newBranches = [...branches];
    newBranches[index] = { ...newBranches[index], [field]: value };
    setBranches(newBranches);
    form2.setValue('branches', newBranches);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl p-8 shadow-elevated">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">إعداد ملف المنشأة</h1>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <form onSubmit={form1.handleSubmit(handleStep1)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="business_name">اسم المنشأة *</Label>
              <Input
                id="business_name"
                {...form1.register('business_name')}
                placeholder="مطعم الذوق الرفيع"
              />
              {form1.formState.errors.business_name && (
                <p className="text-sm text-destructive">{form1.formState.errors.business_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="main_type">نوع المنشأة *</Label>
              <Select onValueChange={(value) => {
                form1.setValue('main_type', value as any);
                // Reset subcategory when main type changes
                form1.setValue('sub_category', undefined);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">مطعم</SelectItem>
                  <SelectItem value="cafe">مقهى</SelectItem>
                </SelectContent>
              </Select>
              {form1.formState.errors.main_type && (
                <p className="text-sm text-destructive">{form1.formState.errors.main_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub_category">الفئة الفرعية</Label>
              <Select 
                onValueChange={(value) => form1.setValue('sub_category', value)}
                disabled={!form1.watch('main_type')}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    form1.watch('main_type') 
                      ? "اختر الفئة الفرعية" 
                      : "اختر نوع المنشأة أولاً"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {form1.watch('main_type') === 'restaurant' && 
                    RESTAURANT_SUB_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))
                  }
                  {form1.watch('main_type') === 'cafe' && 
                    CAFE_SUB_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_level">الفئة السعرية *</Label>
              <Select onValueChange={(value) => form1.setValue('price_level', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة السعرية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheap">اقتصادي</SelectItem>
                  <SelectItem value="moderate">متوسط</SelectItem>
                  <SelectItem value="expensive">غالي</SelectItem>
                </SelectContent>
              </Select>
              {form1.formState.errors.price_level && (
                <p className="text-sm text-destructive">{form1.formState.errors.price_level.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full">
              التالي <ChevronRight className="mr-2 h-4 w-4" />
            </Button>
          </form>
        )}

        {currentStep === 2 && (
          <form onSubmit={form2.handleSubmit(handleStep2)} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">أضف فروع منشأتك *</Label>
                <Button
                  type="button"
                  onClick={addBranch}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  إضافة فرع
                </Button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {branches.map((branch, index) => (
                  <Card key={index} className="p-4 space-y-3 relative">
                    {branches.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeBranch(index)}
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 left-2 h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor={`branch-city-${index}`}>المدينة *</Label>
                      <Select
                        value={branch.city}
                        onValueChange={(value) => updateBranch(index, 'city', value)}
                      >
                        <SelectTrigger id={`branch-city-${index}`}>
                          <SelectValue placeholder="اختر المدينة" />
                        </SelectTrigger>
                        <SelectContent>
                          {SAUDI_CITIES.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`branch-neighborhood-${index}`}>اسم الحي *</Label>
                      <Input
                        id={`branch-neighborhood-${index}`}
                        value={branch.neighborhood}
                        onChange={(e) => updateBranch(index, 'neighborhood', e.target.value)}
                        placeholder="حي الياسمين، حي الملقا"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`branch-map-${index}`}>رابط خرائط جوجل *</Label>
                      <Input
                        id={`branch-map-${index}`}
                        value={branch.google_map_url}
                        onChange={(e) => updateBranch(index, 'google_map_url', e.target.value)}
                        placeholder="https://maps.google.com/..."
                        dir="ltr"
                      />
                      <p className="text-xs text-muted-foreground">
                        يرجى نسخ رابط موقع الفرع من خرائط جوجل
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              {form2.formState.errors.branches && (
                <p className="text-sm text-destructive">
                  {form2.formState.errors.branches.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                <ChevronLeft className="ml-2 h-4 w-4" /> السابق
              </Button>
              <Button type="submit" className="flex-1">
                التالي <ChevronRight className="mr-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {currentStep === 3 && (
          <form onSubmit={form3.handleSubmit(handleStep3)} className="space-y-6">
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">معلومات الحسابات (يجب إدخال حساب واحد على الأقل) *</Label>
              
              <div className="space-y-2">
                <Label htmlFor="instagram_handle">حساب إنستجرام</Label>
                <Input
                  id="instagram_handle"
                  {...form3.register('instagram_handle')}
                  placeholder="@restaurant_name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok_username">اسم المستخدم في تيك توك</Label>
                <Input
                  id="tiktok_username"
                  {...form3.register('tiktok_username')}
                  placeholder="@username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="snapchat_username">اسم المستخدم في سناب شات</Label>
                <Input
                  id="snapchat_username"
                  {...form3.register('snapchat_username')}
                  placeholder="username"
                />
              </div>

              {form3.formState.errors.instagram_handle && (
                <p className="text-sm text-destructive font-semibold">{form3.formState.errors.instagram_handle.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">الجمهور المستهدف</Label>
              <Textarea
                id="target_audience"
                {...form3.register('target_audience')}
                placeholder="عائلات، شباب، محترفون..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="flex-1"
              >
                <ChevronLeft className="ml-2 h-4 w-4" /> السابق
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'جاري الحفظ...' : (
                  <>
                    إنهاء <Check className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default OwnerOnboarding;
