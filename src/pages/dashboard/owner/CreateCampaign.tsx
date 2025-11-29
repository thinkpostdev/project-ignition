import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CalendarIcon, Sparkles, Building2, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const campaignSchema = z.object({
  title: z.string().trim().min(5, 'العنوان يجب أن يكون 5 أحرف على الأقل').max(200, 'العنوان طويل جداً'),
  description: z.string().trim().min(20, 'الوصف يجب أن يكون 20 حرف على الأقل').max(2000, 'الوصف طويل جداً'),
  branch_id: z.string().optional(),
  goal: z.enum(['opening', 'promotions', 'new_products', 'other']),
  goal_details: z.string().trim().max(500).optional(),
  content_requirements: z.string().trim().max(1000).optional(),
  budget: z.number().min(500, 'الميزانية يجب أن تكون 500 ريال على الأقل'),
  start_date: z.date().optional(),
  duration_days: z.number().min(1).max(90).optional(),
  add_bonus_hospitality: z.boolean(),
  target_followers_min: z.number().min(0).optional(),
  target_followers_max: z.number().min(0).optional(),
  target_engagement_min: z.number().min(0).max(100).optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const CreateCampaign = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      description: '',
      goal_details: '',
      content_requirements: '',
      duration_days: 10,
      add_bonus_hospitality: false,
    },
  });

  useEffect(() => {
    if (user) {
      fetchOwnerData();
    }
  }, [user]);

  const fetchOwnerData = async () => {
    // Fetch owner profile
    const { data: profile } = await supabase
      .from('owner_profiles')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (!profile) {
      toast.error('يرجى إكمال ملف المنشأة أولاً');
      navigate('/onboarding/owner');
      return;
    }

    setOwnerProfile(profile);

    // Fetch branches
    const { data: branchesData } = await supabase
      .from('branches')
      .select('*')
      .eq('owner_id', profile.id)
      .order('created_at', { ascending: false });

    setBranches(branchesData || []);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success(t('common.logout'));
    navigate('/auth/login');
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (!user || !ownerProfile) return;
    
    setLoading(true);
    try {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert([{
          owner_id: user.id,
          title: data.title,
          description: data.description,
          branch_id: data.branch_id || null,
          goal: data.goal,
          goal_details: data.goal_details || null,
          content_requirements: data.content_requirements || null,
          budget: data.budget,
          start_date: data.start_date ? format(data.start_date, 'yyyy-MM-dd') : null,
          duration_days: data.duration_days || 10,
          add_bonus_hospitality: data.add_bonus_hospitality,
          target_followers_min: data.target_followers_min || null,
          target_followers_max: data.target_followers_max || null,
          target_engagement_min: data.target_engagement_min || null,
          status: 'draft',
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('تم إنشاء الحملة بنجاح!');
      
      // Trigger AI matching in background
      toast.info('جاري تحليل المؤثرين المناسبين...');
      supabase.functions.invoke('match-influencers', {
        body: { campaign_id: campaign.id }
      }).then(({ error: matchError }) => {
        if (matchError) {
          console.error('Matching error:', matchError);
          toast.error('حدث خطأ في تحليل المؤثرين');
        } else {
          toast.success('تم العثور على مؤثرين مناسبين!');
        }
      });

      navigate(`/dashboard/owner/campaigns/${campaign.id}`);
    } catch (error: any) {
      toast.error(error.message || 'فشل في إنشاء الحملة');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof CampaignFormData)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ['title', 'description', 'goal', 'goal_details'];
    } else if (step === 2) {
      fieldsToValidate = ['target_followers_min', 'target_followers_max', 'target_engagement_min'];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            InfluencerHub
          </h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/dashboard/owner')}
        >
          <ArrowLeft className="h-4 w-4 me-2" />
          العودة للوحة التحكم
        </Button>

        {/* Progress Indicator */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">إنشاء حملة جديدة</h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={cn(
                    'h-2 rounded-full transition-all flex-1',
                    s <= step ? 'bg-primary' : 'bg-muted'
                  )}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>تفاصيل الحملة</span>
            <span>الجمهور المستهدف</span>
            <span>الميزانية والجدولة</span>
          </div>
        </div>

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Campaign Details */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">معلومات الحملة</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الحملة *</Label>
                  <Input
                    id="title"
                    placeholder="مثال: افتتاح فرع جديد في الرياض"
                    {...form.register('title')}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">وصف الحملة *</Label>
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="اشرح أهداف حملتك، قيم علامتك التجارية، وما تبحث عنه في شراكات المؤثرين..."
                    {...form.register('description')}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>

                {branches.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="branch_id">الفرع (اختياري)</Label>
                    <Select onValueChange={(value) => form.setValue('branch_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر فرع محدد للحملة" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {branch.city} - {branch.address}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="goal">هدف الحملة *</Label>
                  <Select onValueChange={(value) => form.setValue('goal', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الهدف الرئيسي" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening">افتتاح</SelectItem>
                      <SelectItem value="promotions">عروض ترويجية</SelectItem>
                      <SelectItem value="new_products">منتجات جديدة</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.goal && (
                    <p className="text-sm text-destructive">{form.formState.errors.goal.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal_details">تفاصيل الهدف</Label>
                  <Textarea
                    id="goal_details"
                    rows={3}
                    placeholder="تفاصيل إضافية عن الهدف..."
                    {...form.register('goal_details')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content_requirements">متطلبات المحتوى</Label>
                  <Textarea
                    id="content_requirements"
                    rows={4}
                    placeholder="حدد متطلبات المحتوى: عدد المنشورات، القصص، الريلز، الهاشتاجات، إلخ."
                    {...form.register('content_requirements')}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Target Audience */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">المؤثرون المستهدفون</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_followers_min">الحد الأدنى للمتابعين</Label>
                    <Input
                      id="target_followers_min"
                      type="number"
                      placeholder="10000"
                      {...form.register('target_followers_min', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_followers_max">الحد الأقصى للمتابعين</Label>
                    <Input
                      id="target_followers_max"
                      type="number"
                      placeholder="100000"
                      {...form.register('target_followers_max', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_engagement_min">الحد الأدنى لمعدل التفاعل (%)</Label>
                  <Input
                    id="target_engagement_min"
                    type="number"
                    step="0.1"
                    placeholder="3.0"
                    {...form.register('target_engagement_min', { valueAsNumber: true })}
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>نصيحة:</strong> سيقوم الذكاء الاصطناعي تلقائياً بمطابقة حملتك مع المؤثرين ذوي الصلة بناءً على معاييرك. ستتمكن من مراجعتهم ودعوتهم بعد إنشاء الحملة.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Budget & Schedule */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">الميزانية والجدولة</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">ميزانية الحملة (ريال سعودي) *</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="5000"
                    {...form.register('budget', { valueAsNumber: true })}
                  />
                  {form.formState.errors.budget && (
                    <p className="text-sm text-destructive">{form.formState.errors.budget.message}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>تاريخ البدء</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !form.watch('start_date') && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {form.watch('start_date') ? format(form.watch('start_date')!, 'PPP') : 'اختر تاريخ'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('start_date')}
                          onSelect={(date) => form.setValue('start_date', date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration_days">مدة الحملة (بالأيام)</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      placeholder="10"
                      {...form.register('duration_days', { valueAsNumber: true })}
                    />
                    {form.formState.errors.duration_days && (
                      <p className="text-sm text-destructive">{form.formState.errors.duration_days.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse p-4 bg-muted/30 rounded-lg">
                  <Checkbox
                    id="add_bonus_hospitality"
                    checked={form.watch('add_bonus_hospitality')}
                    onCheckedChange={(checked) => form.setValue('add_bonus_hospitality', checked as boolean)}
                  />
                  <Label htmlFor="add_bonus_hospitality" className="font-normal cursor-pointer">
                    إضافة ضيافة كمكافأة إضافية للمؤثرين
                  </Label>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>ملاحظة:</strong> بعد إنشاء الحملة، سيتم تشغيل خوارزمية الذكاء الاصطناعي لاقتراح أفضل المؤثرين. يمكنك مراجعة الاقتراحات وإرسال الدعوات.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 me-2" />
                  السابق
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button type="button" onClick={nextStep}>
                  التالي
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="shadow-glow">
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الحملة'}
                </Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateCampaign;
