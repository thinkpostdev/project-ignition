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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Trash2, Save, Building2, Lock } from 'lucide-react';
import ChangePassword from './ChangePassword';

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

const profileSchema = z.object({
  business_name: z.string().min(2, 'اسم المنشأة مطلوب'),
  main_type: z.enum(['restaurant', 'cafe']),
  sub_category: z.string().optional(),
  price_level: z.enum(['cheap', 'moderate', 'expensive']),
  instagram_handle: z.string().optional(),
  tiktok_username: z.string().optional(),
  snapchat_username: z.string().optional(),
  target_audience: z.string().optional(),
}).refine((data) => {
  const hasInstagram = data.instagram_handle && data.instagram_handle.length > 0;
  const hasTiktok = data.tiktok_username && data.tiktok_username.length > 0;
  const hasSnapchat = data.snapchat_username && data.snapchat_username.length > 0;
  return hasInstagram || hasTiktok || hasSnapchat;
}, {
  message: 'يجب إدخال معلومات حساب واحد على الأقل',
  path: ['instagram_handle'],
});

const branchSchema = z.object({
  id: z.string().optional(),
  city: z.string().min(1, 'المدينة مطلوبة'),
  neighborhood: z.string().min(1, 'اسم الحي مطلوب'),
  google_map_url: z.string().min(1, 'رابط خرائط جوجل مطلوب').url('يجب إدخال رابط صحيح من خرائط جوجل'),
});

type ProfileData = z.infer<typeof profileSchema>;
type Branch = z.infer<typeof branchSchema>;

const OwnerProfile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([{ city: '', neighborhood: '', google_map_url: '' }]);

  const form = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch owner profile
      const { data: ownerProfile, error: profileError } = await supabase
        .from('owner_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      if (!ownerProfile) {
        toast.error('الملف الشخصي غير موجود');
        navigate('/dashboard/owner');
        return;
      }

      setOwnerProfileId(ownerProfile.id);

      // Set form values
      form.reset({
        business_name: ownerProfile.business_name || '',
        main_type: ownerProfile.main_type || 'restaurant',
        sub_category: ownerProfile.sub_category || '',
        price_level: ownerProfile.price_level || 'moderate',
        instagram_handle: ownerProfile.instagram_handle || '',
        tiktok_username: ownerProfile.tiktok_username || '',
        snapchat_username: ownerProfile.snapchat_username || '',
        target_audience: ownerProfile.target_audience || '',
      });

      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('owner_id', ownerProfile.id);

      if (branchesError) throw branchesError;

      if (branchesData && branchesData.length > 0) {
        setBranches(branchesData.map(b => ({
          id: b.id,
          city: b.city || '',
          neighborhood: b.neighborhood || '',
          google_map_url: b.google_map_url || '',
        })));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileData) => {
    if (!ownerProfileId) return;

    // Validate branches
    const validBranches = branches.filter(b => b.city && b.neighborhood && b.google_map_url);
    
    if (validBranches.length === 0) {
      toast.error('يجب إضافة فرع واحد على الأقل');
      return;
    }
    
    // Validate each branch has a valid URL
    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      if (branch.city || branch.neighborhood || branch.google_map_url) {
        // If any field is filled, all fields must be filled
        if (!branch.city) {
          toast.error(`الفرع ${i + 1}: المدينة مطلوبة`);
          return;
        }
        if (!branch.neighborhood) {
          toast.error(`الفرع ${i + 1}: اسم الحي مطلوب`);
          return;
        }
        if (!branch.google_map_url) {
          toast.error(`الفرع ${i + 1}: رابط خرائط جوجل مطلوب`);
          return;
        }
        // Validate URL format
        try {
          new URL(branch.google_map_url);
        } catch {
          toast.error(`الفرع ${i + 1}: يجب إدخال رابط صحيح من خرائط جوجل`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Update owner profile
      const { error: updateError } = await supabase
        .from('owner_profiles')
        .update({
          business_name: data.business_name,
          main_type: data.main_type,
          sub_category: data.sub_category,
          price_level: data.price_level,
          instagram_handle: data.instagram_handle,
          tiktok_username: data.tiktok_username,
          snapchat_username: data.snapchat_username,
          target_audience: data.target_audience,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Handle branches: delete old ones and insert new ones
      await supabase
        .from('branches')
        .delete()
        .eq('owner_id', ownerProfileId);

      const branchesData = validBranches.map(branch => ({
        owner_id: ownerProfileId,
        city: branch.city,
        neighborhood: branch.neighborhood,
        google_map_url: branch.google_map_url || null,
      }));

      const { error: branchesError } = await supabase
        .from('branches')
        .insert(branchesData);

      if (branchesError) throw branchesError;

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

  const addBranch = () => {
    setBranches([...branches, { city: '', neighborhood: '', google_map_url: '' }]);
  };

  const removeBranch = (index: number) => {
    if (branches.length === 1) {
      toast.error('يجب الاحتفاظ بفرع واحد على الأقل');
      return;
    }
    setBranches(branches.filter((_, i) => i !== index));
  };

  const updateBranch = (index: number, field: keyof Branch, value: string) => {
    const newBranches = [...branches];
    newBranches[index] = { ...newBranches[index], [field]: value };
    setBranches(newBranches);
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/owner')}>
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
              <Building2 className="h-4 w-4" />
              معلومات المنشأة
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="h-4 w-4" />
              تغيير كلمة المرور
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-8">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Business Info Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">معلومات المنشأة الأساسية</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business_name">اسم المنشأة *</Label>
                    <Input
                      id="business_name"
                      {...form.register('business_name')}
                      placeholder="مطعم الذوق الرفيع"
                    />
                    {form.formState.errors.business_name && (
                      <p className="text-sm text-destructive">{form.formState.errors.business_name.message}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="main_type">نوع المنشأة *</Label>
                      <Select 
                        value={form.watch('main_type')}
                        onValueChange={(value) => {
                          form.setValue('main_type', value as 'restaurant' | 'cafe');
                          form.setValue('sub_category', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant">مطعم</SelectItem>
                          <SelectItem value="cafe">مقهى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price_level">الفئة السعرية *</Label>
                      <Select 
                        value={form.watch('price_level')}
                        onValueChange={(value) => form.setValue('price_level', value as 'cheap' | 'moderate' | 'expensive')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الفئة السعرية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cheap">اقتصادي</SelectItem>
                          <SelectItem value="moderate">متوسط</SelectItem>
                          <SelectItem value="expensive">غالي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sub_category">الفئة الفرعية</Label>
                    <Select 
                      value={form.watch('sub_category')}
                      onValueChange={(value) => form.setValue('sub_category', value)}
                      disabled={!form.watch('main_type')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفئة الفرعية" />
                      </SelectTrigger>
                      <SelectContent>
                        {form.watch('main_type') === 'restaurant' && 
                          RESTAURANT_SUB_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))
                        }
                        {form.watch('main_type') === 'cafe' && 
                          CAFE_SUB_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Branches Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold">الفروع *</h3>
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
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            يجب إدخال رابط صحيح من خرائط جوجل (مثال: https://maps.google.com/...)
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Social Media Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    حسابات التواصل الاجتماعي *
                  </h3>
                  <p className="text-sm text-muted-foreground">يجب إدخال معلومات حساب واحد على الأقل</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram_handle">حساب إنستجرام</Label>
                      <Input
                        id="instagram_handle"
                        {...form.register('instagram_handle')}
                        placeholder="@restaurant_name"
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
                      <Label htmlFor="snapchat_username">اسم المستخدم في سناب شات</Label>
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

                {/* Target Audience Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold border-b pb-2">معلومات إضافية</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target_audience">الجمهور المستهدف</Label>
                    <Textarea
                      id="target_audience"
                      {...form.register('target_audience')}
                      placeholder="عائلات، شباب، محترفون..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/owner')}
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

export default OwnerProfile;

