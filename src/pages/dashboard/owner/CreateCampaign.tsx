import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CalendarIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const campaignSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(2000, 'Description too long'),
  content_requirements: z.string().trim().max(1000, 'Content requirements too long').optional(),
  niche: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  target_followers_min: z.number().min(0).optional(),
  target_followers_max: z.number().min(0).optional(),
  target_engagement_min: z.number().min(0).max(100).optional(),
  budget: z.number().min(100, 'Budget must be at least 100 SAR'),
  start_date: z.date().optional(),
  end_date: z.date().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

const CreateCampaign = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      description: '',
      content_requirements: '',
      niche: '',
      location: '',
      target_followers_min: undefined,
      target_followers_max: undefined,
      target_engagement_min: undefined,
      budget: undefined,
    },
  });

  const handleLogout = async () => {
    await signOut();
    toast.success(t('common.logout'));
    navigate('/auth/login');
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({
          owner_id: user.id,
          title: data.title,
          description: data.description,
          content_requirements: data.content_requirements || null,
          budget: data.budget,
          target_followers_min: data.target_followers_min || null,
          target_followers_max: data.target_followers_max || null,
          target_engagement_min: data.target_engagement_min || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Campaign created successfully!');
      navigate(`/dashboard/owner/campaigns/${campaign.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof CampaignFormData)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ['title', 'description', 'content_requirements'];
    } else if (step === 2) {
      fieldsToValidate = ['niche', 'location', 'target_followers_min', 'target_followers_max', 'target_engagement_min'];
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
          Back to Dashboard
        </Button>

        {/* Progress Indicator */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">Create New Campaign</h2>
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
            <span>Basic Info</span>
            <span>Target Audience</span>
            <span>Budget & Schedule</span>
          </div>
        </div>

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Campaign Details</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Campaign Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Summer Fashion Collection 2024"
                    {...form.register('title')}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="Describe your campaign goals, brand values, and what you're looking for in influencer partnerships..."
                    {...form.register('description')}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content_requirements">Content Requirements</Label>
                  <Textarea
                    id="content_requirements"
                    rows={4}
                    placeholder="Specify content requirements: number of posts, stories, reels, hashtags, etc."
                    {...form.register('content_requirements')}
                  />
                  {form.formState.errors.content_requirements && (
                    <p className="text-sm text-destructive">{form.formState.errors.content_requirements.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Target Audience */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Target Influencers</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="niche">Niche/Category</Label>
                  <Input
                    id="niche"
                    placeholder="e.g., Fashion, Beauty, Fitness, Tech"
                    {...form.register('niche')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Riyadh, Jeddah, Saudi Arabia"
                    {...form.register('location')}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_followers_min">Min Followers</Label>
                    <Input
                      id="target_followers_min"
                      type="number"
                      placeholder="10000"
                      {...form.register('target_followers_min', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_followers_max">Max Followers</Label>
                    <Input
                      id="target_followers_max"
                      type="number"
                      placeholder="100000"
                      {...form.register('target_followers_max', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_engagement_min">Min Engagement Rate (%)</Label>
                  <Input
                    id="target_engagement_min"
                    type="number"
                    step="0.1"
                    placeholder="3.0"
                    {...form.register('target_engagement_min', { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Budget & Schedule */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Budget & Timeline</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget">Campaign Budget (SAR) *</Label>
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
                    <Label>Start Date</Label>
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
                          {form.watch('start_date') ? format(form.watch('start_date')!, 'PPP') : 'Pick a date'}
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
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !form.watch('end_date') && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {form.watch('end_date') ? format(form.watch('end_date')!, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('end_date')}
                          onSelect={(date) => form.setValue('end_date', date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    💡 <strong>Tip:</strong> Our AI will automatically match your campaign with relevant influencers based on your criteria. You'll be able to review and invite them after creating the campaign.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 me-2" />
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={loading} className="shadow-glow">
                  {loading ? 'Creating...' : 'Create Campaign'}
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
