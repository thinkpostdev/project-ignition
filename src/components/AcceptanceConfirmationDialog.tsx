import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Video, Upload, DollarSign, CheckCircle2, Calendar } from 'lucide-react';

interface AcceptanceConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignTitle?: string;
  scheduledDate?: string | null;
  location?: string;
}

export const AcceptanceConfirmationDialog = ({
  open,
  onOpenChange,
  campaignTitle,
  scheduledDate,
  location,
}: AcceptanceConfirmationDialogProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const steps = [
    {
      icon: MapPin,
      title: isRTL ? 'توجه للموقع' : 'Visit Location',
      description: isRTL 
        ? 'توجه للموقع في التاريخ المحدد واستمتع بالتجربة'
        : 'Go to the location on the scheduled date and enjoy the experience',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: Video,
      title: isRTL ? 'صوّر المحتوى' : 'Create Content',
      description: isRTL 
        ? 'صوّر الفيديو حسب متطلبات الحملة وأنشره على منصتك'
        : 'Record the video according to campaign requirements and post it on your platform',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      icon: Upload,
      title: isRTL ? 'ارفع الرابط' : 'Upload Link',
      description: isRTL 
        ? 'ارفع رابط المحتوى المنشور على المنصة من خلال لوحة التحكم'
        : 'Upload the published content link through the dashboard',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      icon: DollarSign,
      title: isRTL ? 'استلم المبلغ (للتعاون المدفوع فقط)' : 'Get Paid (for paid only)',
      description: isRTL 
        ? ' بعد اعتماد المحتوى، يتم تحويل المبلغ خلال 24 ساعة للتعاون المدفوع'
        : 'After content approval by the restaurant owner, payment will be transferred within 24 hours',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[550px] p-4 sm:p-6">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl">
            {isRTL ? 'تم قبول العرض بنجاح! 🎉' : 'Offer Accepted Successfully! 🎉'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isRTL 
              ? 'اتبع الخطوات التالية لإكمال التعاون واستلام المبلغ'
              : 'Follow these steps to complete the collaboration and receive payment'}
          </DialogDescription>
        </DialogHeader>

        {/* Campaign Info */}
        {(campaignTitle || scheduledDate || location) && (
          <div className="bg-muted/50 rounded-lg p-3 my-3">
            {campaignTitle && (
              <p className="font-semibold text-sm mb-1">{campaignTitle}</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {scheduledDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(scheduledDate).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                      calendar: 'gregory',
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3 py-2">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${step.bgColor} flex items-center justify-center`}>
                <step.icon className={`h-5 w-5 ${step.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  <h4 className="font-semibold text-sm">{step.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Important Note */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
          <p className="text-amber-800 dark:text-amber-200">
            <strong>{isRTL ? '⚡ هام:' : '⚡ Important:'}</strong>{' '}
            {isRTL 
              ? 'يجب رفع رابط المحتوى في نفس تاريخ الزيارة'
              : 'Content link must be uploaded in same date of the visit'}
          </p>
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          className="w-full mt-2"
          size="lg"
        >
          {isRTL ? 'فهمت، شكراً ✓' : 'Got it, Thanks ✓'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
