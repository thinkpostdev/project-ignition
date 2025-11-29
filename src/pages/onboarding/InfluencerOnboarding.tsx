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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';

const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 
  'الطائف', 'بريدة', 'تبوك', 'خميس مشيط', 'الهفوف', 'حائل', 'نجران', 
  'الجبيل', 'ينبع', 'أبها', 'عرعر', 'سكاكا', 'جازان', 'القطيف'
];

const PLATFORMS = ['Instagram', 'TikTok', 'Snapchat', 'YouTube'];

const step1Schema = z.object({
  display_name: z.string().min(2, 'الاسم مطلوب'),
  instagram_handle: z.string().min(2, 'حساب إنستجرام مطلوب'),
  bio: z.string().optional(),
  cities: z.array(z.string()).min(1, 'اختر مدينة واحدة على الأقل'),
});

const step2Schema = z.object({
  primary_platforms: z.array(z.string()).min(1, 'اختر منصة واحدة على الأقل'),
  tiktok_url: z.string().url('رابط غير صحيح').optional().or(z.literal('')),
  snapchat_username: z.string().optional(),
  category: z.enum(['food_reviews', 'lifestyle', 'fashion', 'travel', 'comedy', 'general']),
  content_type: z.string().optional(),
});

const step3Schema = z.object({
  avg_views_instagram: z.enum(['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+']).optional(),
  avg_views_tiktok: z.enum(['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+']).optional(),
  avg_views_snapchat: z.enum(['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+']).optional(),
  accept_hospitality: z.boolean(),
  accept_paid: z.boolean(),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;

const InfluencerOnboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Step1Data & Step2Data & Step3Data>>({
    accept_hospitality: false,
    accept_paid: false,
  });
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const form1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { ...formData, cities: selectedCities },
  });

  const form2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { ...formData, primary_platforms: selectedPlatforms },
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
      
      const { error } = await supabase.from('influencer_profiles').insert([{
        user_id: user.id,
        display_name: finalData.display_name!,
        instagram_handle: finalData.instagram_handle!,
        bio: finalData.bio,
        cities: finalData.cities,
        primary_platforms: finalData.primary_platforms,
        tiktok_url: finalData.tiktok_url,
        snapchat_username: finalData.snapchat_username,
        category: finalData.category,
        content_type: finalData.content_type,
        avg_views_instagram: finalData.avg_views_instagram,
        avg_views_tiktok: finalData.avg_views_tiktok,
        avg_views_snapchat: finalData.avg_views_snapchat,
        accept_hospitality: finalData.accept_hospitality,
        accept_paid: finalData.accept_paid,
        min_price: finalData.min_price,
        max_price: finalData.max_price,
      }]);

      if (error) throw error;

      toast.success('تم إنشاء الملف الشخصي بنجاح');
      navigate('/dashboard/influencer');
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
    form1.setValue('cities', selectedCities.includes(city) 
      ? selectedCities.filter(c => c !== city)
      : [...selectedCities, city]
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
    form2.setValue('primary_platforms', selectedPlatforms.includes(platform) 
      ? selectedPlatforms.filter(p => p !== platform)
      : [...selectedPlatforms, platform]
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-2xl p-8 shadow-elevated">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">إعداد ملف المؤثر</h1>
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
              <Label htmlFor="display_name">الاسم الظاهر *</Label>
              <Input
                id="display_name"
                {...form1.register('display_name')}
                placeholder="أحمد المؤثر"
              />
              {form1.formState.errors.display_name && (
                <p className="text-sm text-destructive">{form1.formState.errors.display_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram_handle">حساب إنستجرام *</Label>
              <Input
                id="instagram_handle"
                {...form1.register('instagram_handle')}
                placeholder="@username"
              />
              {form1.formState.errors.instagram_handle && (
                <p className="text-sm text-destructive">{form1.formState.errors.instagram_handle.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">نبذة عنك</Label>
              <Textarea
                id="bio"
                {...form1.register('bio')}
                placeholder="أخبرنا عن نفسك وأسلوب المحتوى الخاص بك..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>المدن التي تغطيها *</Label>
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
              {form1.formState.errors.cities && (
                <p className="text-sm text-destructive">{form1.formState.errors.cities.message}</p>
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
              <Label>المنصات الأساسية *</Label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      selectedPlatforms.includes(platform)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
              {form2.formState.errors.primary_platforms && (
                <p className="text-sm text-destructive">{form2.formState.errors.primary_platforms.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok_url">رابط تيك توك</Label>
              <Input
                id="tiktok_url"
                {...form2.register('tiktok_url')}
                placeholder="https://tiktok.com/@username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="snapchat_username">سناب شات</Label>
              <Input
                id="snapchat_username"
                {...form2.register('snapchat_username')}
                placeholder="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">التصنيف *</Label>
              <Select onValueChange={(value) => form2.setValue('category', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food_reviews">مراجعات طعام</SelectItem>
                  <SelectItem value="lifestyle">نمط حياة</SelectItem>
                  <SelectItem value="travel">سفر</SelectItem>
                  <SelectItem value="fashion">موضة</SelectItem>
                  <SelectItem value="comedy">كوميديا</SelectItem>
                  <SelectItem value="general">عام</SelectItem>
                </SelectContent>
              </Select>
              {form2.formState.errors.category && (
                <p className="text-sm text-destructive">{form2.formState.errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_type">نوع المحتوى</Label>
              <Input
                id="content_type"
                {...form2.register('content_type')}
                placeholder="مراجعات، فيديوهات قصيرة، قصص..."
              />
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
            <div className="space-y-4">
              <Label>متوسط المشاهدات</Label>
              
              <div className="space-y-2">
                <Label htmlFor="avg_views_instagram" className="text-sm font-normal">Instagram</Label>
                <Select onValueChange={(value) => form3.setValue('avg_views_instagram', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النطاق" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-10k">0 - 10K</SelectItem>
                    <SelectItem value="10k-50k">10K - 50K</SelectItem>
                    <SelectItem value="50k-100k">50K - 100K</SelectItem>
                    <SelectItem value="100k-500k">100K - 500K</SelectItem>
                    <SelectItem value="500k+">500K+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avg_views_tiktok" className="text-sm font-normal">TikTok</Label>
                <Select onValueChange={(value) => form3.setValue('avg_views_tiktok', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النطاق" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-10k">0 - 10K</SelectItem>
                    <SelectItem value="10k-50k">10K - 50K</SelectItem>
                    <SelectItem value="50k-100k">50K - 100K</SelectItem>
                    <SelectItem value="100k-500k">100K - 500K</SelectItem>
                    <SelectItem value="500k+">500K+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avg_views_snapchat" className="text-sm font-normal">Snapchat</Label>
                <Select onValueChange={(value) => form3.setValue('avg_views_snapchat', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النطاق" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-10k">0 - 10K</SelectItem>
                    <SelectItem value="10k-50k">10K - 50K</SelectItem>
                    <SelectItem value="50k-100k">50K - 100K</SelectItem>
                    <SelectItem value="100k-500k">100K - 500K</SelectItem>
                    <SelectItem value="500k+">500K+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>أنواع التعاون</Label>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="accept_hospitality"
                  checked={form3.watch('accept_hospitality')}
                  onCheckedChange={(checked) => form3.setValue('accept_hospitality', checked as boolean)}
                />
                <Label htmlFor="accept_hospitality" className="font-normal cursor-pointer">
                  أقبل التعاون مقابل الضيافة فقط
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="accept_paid"
                  checked={form3.watch('accept_paid')}
                  onCheckedChange={(checked) => form3.setValue('accept_paid', checked as boolean)}
                />
                <Label htmlFor="accept_paid" className="font-normal cursor-pointer">
                  أقبل التعاون المدفوع
                </Label>
              </div>
            </div>

            {form3.watch('accept_paid') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_price">الحد الأدنى للسعر (ريال)</Label>
                  <Input
                    id="min_price"
                    type="number"
                    {...form3.register('min_price', { valueAsNumber: true })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_price">الحد الأقصى للسعر (ريال)</Label>
                  <Input
                    id="max_price"
                    type="number"
                    {...form3.register('max_price', { valueAsNumber: true })}
                    placeholder="5000"
                  />
                </div>
              </div>
            )}

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

export default InfluencerOnboarding;
