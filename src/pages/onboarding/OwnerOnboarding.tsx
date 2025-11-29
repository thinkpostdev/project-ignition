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
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 
  'الطائف', 'بريدة', 'تبوك', 'خميس مشيط', 'الهفوف', 'حائل', 'نجران', 
  'الجبيل', 'ينبع', 'أبها', 'عرعر', 'سكاكا', 'جازان', 'القطيف'
];

const step1Schema = z.object({
  business_name: z.string().min(2, 'اسم المنشأة مطلوب'),
  main_type: z.enum(['restaurant', 'cafe']),
  sub_category: z.string().optional(),
  price_level: z.enum(['cheap', 'moderate', 'expensive']),
});

const step2Schema = z.object({
  location: z.string().min(2, 'الموقع مطلوب'),
  cities: z.array(z.string()).min(1, 'اختر مدينة واحدة على الأقل'),
});

const step3Schema = z.object({
  instagram_handle: z.string().optional(),
  tiktok_url: z.string().url('رابط غير صحيح').optional().or(z.literal('')),
  snapchat_url: z.string().url('رابط غير صحيح').optional().or(z.literal('')),
  target_audience: z.string().optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const OwnerOnboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data>>({});
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: formData,
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { ...formData, cities: selectedCities },
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
    setCurrentStep(3);
  };

  const handleStep3 = async (data: Step3Data) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const finalData = { ...formData, ...data };
      
      const { error } = await supabase.from('owner_profiles').insert([{
        user_id: user.id,
        business_name: finalData.business_name!,
        main_type: finalData.main_type,
        sub_category: finalData.sub_category,
        price_level: finalData.price_level,
        location: finalData.location!,
        cities: finalData.cities,
        instagram_handle: finalData.instagram_handle,
        tiktok_url: finalData.tiktok_url,
        snapchat_url: finalData.snapchat_url,
        target_audience: finalData.target_audience,
      }]);

      if (error) throw error;

      toast.success('تم إنشاء الملف الشخصي بنجاح');
      navigate('/dashboard/owner');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
    form2.setValue('cities', selectedCities.includes(city) 
      ? selectedCities.filter(c => c !== city)
      : [...selectedCities, city]
    );
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
              <Select onValueChange={(value) => form1.setValue('main_type', value as any)}>
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
              <Input
                id="sub_category"
                {...form1.register('sub_category')}
                placeholder="مطعم إيطالي، مقهى متخصص"
              />
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
            <div className="space-y-2">
              <Label htmlFor="location">العنوان *</Label>
              <Input
                id="location"
                {...form2.register('location')}
                placeholder="الرياض، حي النخيل"
              />
              {form2.formState.errors.location && (
                <p className="text-sm text-destructive">{form2.formState.errors.location.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>المدن التي تخدمها *</Label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded-md">
                {SAUDI_CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={`p-2 text-sm rounded-md transition-colors ${
                      selectedCities.includes(city)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
              {form2.formState.errors.cities && (
                <p className="text-sm text-destructive">{form2.formState.errors.cities.message}</p>
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
            <div className="space-y-2">
              <Label htmlFor="instagram_handle">حساب إنستجرام</Label>
              <Input
                id="instagram_handle"
                {...form3.register('instagram_handle')}
                placeholder="@restaurant_name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok_url">رابط تيك توك</Label>
              <Input
                id="tiktok_url"
                {...form3.register('tiktok_url')}
                placeholder="https://tiktok.com/@username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchat_url">رابط سناب شات</Label>
              <Input
                id="snapchat_url"
                {...form3.register('snapchat_url')}
                placeholder="https://snapchat.com/add/username"
              />
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
