import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, User, Lock, Building2 } from 'lucide-react';
import ChangePassword from './ChangePassword';

const SAUDI_CITIES = [
  'الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 
  'الطائف', 'بريدة', 'تبوك', 'خميس مشيط', 'الهفوف', 'حائل', 'نجران', 
  'الجبيل', 'ينبع', 'أبها', 'عرعر', 'سكاكا', 'جازان', 'القطيف'
];

const PLATFORMS = ['Instagram', 'TikTok', 'Snapchat', 'YouTube'];

const profileSchema = z.object({
  display_name: z.string().min(2, 'الاسم مطلوب'),
  bio: z.string().optional(),
  cities: z.array(z.string()).min(1, 'اختر مدينة واحدة على الأقل'),
  primary_platforms: z.array(z.string()).min(1, 'اختر منصة واحدة على الأقل'),
  instagram_handle: z.string().optional(),
  tiktok_username: z.string().optional(),
  snapchat_username: z.string().optional(),
  category: z.enum(['food_reviews', 'lifestyle', 'fashion', 'travel', 'comedy', 'general']),
  content_type: z.string().optional(),
  avg_views_instagram: z.enum(['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+']).optional(),
  avg_views_tiktok: z.enum(['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+']).optional(),
  avg_views_snapchat: z.enum(['0-10k', '10k-50k', '50k-100k', '100k-500k', '500k+']).optional(),
  collaboration_type: z.enum(['hospitality', 'paid']),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
}).refine((data) => {
  const hasInstagram = data.instagram_handle && data.instagram_handle.length > 0;
  const hasTiktok = data.tiktok_username && data.tiktok_username.length > 0;
  const hasSnapchat = data.snapchat_username && data.snapchat_username.length > 0;
  return hasInstagram || hasTiktok || hasSnapchat;
}, {
  message: 'يجب إدخال معلومات حساب واحد على الأقل',
  path: ['instagram_handle'],
});

type ProfileData = z.infer<typeof profileSchema>;

const InfluencerProfile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');

  // Format IBAN with spaces as user types (SA00 0000 0000 0000 0000 0000)
  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Remove all non-alphanumeric
    
    // Ensure it starts with SA
    if (value.length > 0 && !value.startsWith('SA')) {
      value = 'SA' + value.replace(/^SA/gi, '');
    }
    
    // Limit to 24 characters (SA + 22 digits)
    value = value.slice(0, 24);
    
    // Add spaces: SA00 0000 0000 0000 0000 0000
    let formatted = value;
    if (value.length > 2) {
      formatted = value.slice(0, 4); // SA00
      for (let i = 4; i < value.length; i += 4) {
        formatted += ' ' + value.slice(i, i + 4);
      }
    }
    
    setIban(formatted);
  };

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      cities: [],
      primary_platforms: [],
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const { data: profile, error } = await supabase
        .from('influencer_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (!profile) {
        toast.error('الملف الشخصي غير موجود');
        navigate('/dashboard/influencer');
        return;
      }

      // Set cities and platforms
      const cities = profile.cities || [];
      const platforms = profile.primary_platforms || [];
      setSelectedCities(cities);
      setSelectedPlatforms(platforms);
      
      // Set bank info
      setBankName(profile.bank_name || '');
      
      // Format existing IBAN with spaces
      if (profile.iban) {
        const cleanIban = profile.iban.replace(/\s/g, '');
        let formatted = cleanIban.slice(0, 4);
        for (let i = 4; i < cleanIban.length; i += 4) {
          formatted += ' ' + cleanIban.slice(i, i + 4);
        }
        setIban(formatted);
      } else {
        setIban('');
      }

      // Determine collaboration type
      const collaborationType = profile.accept_paid ? 'paid' : 'hospitality';

      // Set form values
      form.reset({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        cities,
        primary_platforms: platforms,
        instagram_handle: profile.instagram_handle || '',
        tiktok_username: profile.tiktok_username || '',
        snapchat_username: profile.snapchat_username || '',
        category: profile.category || 'food_reviews',
        content_type: profile.content_type || '',
        avg_views_instagram: profile.avg_views_instagram || undefined,
        avg_views_tiktok: profile.avg_views_tiktok || undefined,
        avg_views_snapchat: profile.avg_views_snapchat || undefined,
        collaboration_type: collaborationType,
        min_price: profile.min_price || undefined,
        max_price: profile.max_price || undefined,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileData) => {
    // Validate IBAN if provided
    if (iban.trim()) {
      const cleanIban = iban.replace(/\s/g, '').toUpperCase();
      if (!cleanIban.startsWith('SA') || cleanIban.length !== 24) {
        toast.error('رقم الآيبان غير صالح. يجب أن يبدأ بـ SA ويتكون من 24 حرف');
        return;
      }
    }
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('influencer_profiles')
        .update({
          display_name: data.display_name,
          bio: data.bio,
          cities: data.cities,
          primary_platforms: data.primary_platforms,
          instagram_handle: data.instagram_handle || null,
          tiktok_username: data.tiktok_username || null,
          snapchat_username: data.snapchat_username || null,
          category: data.category,
          content_type: data.content_type,
          avg_views_instagram: data.avg_views_instagram,
          avg_views_tiktok: data.avg_views_tiktok,
          avg_views_snapchat: data.avg_views_snapchat,
          accept_hospitality: data.collaboration_type === 'hospitality',
          accept_paid: data.collaboration_type === 'paid',
          min_price: data.min_price,
          max_price: data.max_price,
          bank_name: bankName.trim() || null,
          iban: iban.trim() ? iban.replace(/\s/g, '').toUpperCase() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('تم حفظ التعديلات بنجاح');
      await fetchProfile(); // Refresh data
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'فشل حفظ التعديلات';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const toggleCity = (city: string) => {
    const newCities = selectedCities.includes(city)
      ? selectedCities.filter(c => c !== city)
      : [...selectedCities, city];
    setSelectedCities(newCities);
    form.setValue('cities', newCities);
  };

  const togglePlatform = (platform: string) => {
    const newPlatforms = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter(p => p !== platform)
      : [...selectedPlatforms, platform];
    setSelectedPlatforms(newPlatforms);
    form.setValue('primary_platforms', newPlatforms);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('تم تسجيل الخروج');
    navigate('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/influencer')}>
              <ArrowLeft className="h-4 w-4 me-2" />
              العودة
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              إعدادات الحساب
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              معلومات الملف الشخصي
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="h-4 w-4" />
              تغيير كلمة المرور
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-8">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">المعلومات الأساسية</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="display_name">الاسم الظاهر *</Label>
                    <Input
                      id="display_name"
                      {...form.register('display_name')}
                      placeholder="أحمد المؤثر"
                    />
                    {form.formState.errors.display_name && (
                      <p className="text-sm text-destructive">{form.formState.errors.display_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">نبذة عنك</Label>
                    <Textarea
                      id="bio"
                      {...form.register('bio')}
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
                    {form.formState.errors.cities && (
                      <p className="text-sm text-destructive">{form.formState.errors.cities.message}</p>
                    )}
                  </div>
                </div>

                {/* Platform Info Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">المنصات والحسابات</h3>
                  
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
                    {form.formState.errors.primary_platforms && (
                      <p className="text-sm text-destructive">{form.formState.errors.primary_platforms.message}</p>
                    )}
                  </div>

                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <Label className="text-base font-semibold">معلومات الحسابات (يجب إدخال حساب واحد على الأقل) *</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor="instagram_handle">حساب إنستجرام</Label>
                      <Input
                        id="instagram_handle"
                        {...form.register('instagram_handle')}
                        placeholder="@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tiktok_username">اسم المستخدم في تيك توك</Label>
                      <Input
                        id="tiktok_username"
                        {...form.register('tiktok_username')}
                        placeholder="@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="snapchat_username">سناب شات</Label>
                      <Input
                        id="snapchat_username"
                        {...form.register('snapchat_username')}
                        placeholder="username"
                      />
                    </div>

                    {form.formState.errors.instagram_handle && (
                      <p className="text-sm text-destructive font-semibold">
                        {form.formState.errors.instagram_handle.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Content Info Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">معلومات المحتوى</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">التصنيف *</Label>
                    <Select 
                      value={form.watch('category')}
                      onValueChange={(value) => form.setValue('category', value as ProfileData['category'])}
                    >
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content_type">نوع المحتوى</Label>
                    <Input
                      id="content_type"
                      {...form.register('content_type')}
                      placeholder="مراجعات، فيديوهات قصيرة، قصص..."
                    />
                  </div>
                </div>

                {/* Views Stats Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">متوسط المشاهدات</h3>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="avg_views_instagram" className="text-sm font-normal">Instagram</Label>
                      <Select 
                        value={form.watch('avg_views_instagram')}
                        onValueChange={(value) => form.setValue('avg_views_instagram', value as ProfileData['avg_views_instagram'])}
                      >
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
                      <Select 
                        value={form.watch('avg_views_tiktok')}
                        onValueChange={(value) => form.setValue('avg_views_tiktok', value as ProfileData['avg_views_tiktok'])}
                      >
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
                      <Select 
                        value={form.watch('avg_views_snapchat')}
                        onValueChange={(value) => form.setValue('avg_views_snapchat', value as ProfileData['avg_views_snapchat'])}
                      >
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
                </div>

                {/* Collaboration Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">نوع التعاون</h3>
                  
                  <RadioGroup
                    value={form.watch('collaboration_type')}
                    onValueChange={(value) => form.setValue('collaboration_type', value as 'hospitality' | 'paid')}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="hospitality" id="hospitality" />
                      <Label htmlFor="hospitality" className="font-normal cursor-pointer">
                        أقبل التعاون مقابل الضيافة فقط
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="paid" id="paid" />
                      <Label htmlFor="paid" className="font-normal cursor-pointer">
                        أقبل التعاون المدفوع
                      </Label>
                    </div>
                  </RadioGroup>

                  {form.watch('collaboration_type') === 'paid' && (
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="min_price">الحد الأدنى للسعر (ريال)</Label>
                        <Input
                          id="min_price"
                          type="number"
                          {...form.register('min_price', { valueAsNumber: true })}
                          placeholder="500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max_price">الحد الأقصى للسعر (ريال)</Label>
                        <Input
                          id="max_price"
                          type="number"
                          {...form.register('max_price', { valueAsNumber: true })}
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bank Info Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    معلومات الحساب البنكي
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    لاستلام أتعابك، يرجى إدخال معلومات حسابك البنكي
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">اسم البنك</Label>
                      <Input
                        id="bank_name"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="مثال: الراجحي، الأهلي، سامبا..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iban" className="text-base font-semibold">رقم الآيبان (IBAN)</Label>
                      <Input
                        id="iban"
                        value={iban}
                        onChange={handleIbanChange}
                        placeholder="SA00 0000 0000 0000 0000 0000"
                        className="font-mono text-lg tracking-wider"
                        dir="ltr"
                        maxLength={29}
                      />
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                          📋 التنسيق الصحيح:
                        </p>
                        <p className="text-sm font-mono text-blue-700 dark:text-blue-300 tracking-wider">
                          SA00 0000 0000 0000 0000 0000
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                          • يبدأ بـ SA ثم 22 رقم
                          <br />
                          • يتم إضافة المسافات تلقائياً
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/influencer')}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? 'جاري الحفظ...' : (
                      <>
                        <Save className="h-4 w-4 me-2" />
                        حفظ التعديلات
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card className="p-8">
              <ChangePassword />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InfluencerProfile;

