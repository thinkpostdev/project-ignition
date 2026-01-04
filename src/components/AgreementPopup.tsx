import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AgreementPopupProps {
  open: boolean;
  onAccept: () => Promise<void>;
  agreementText?: string;
}

export const AgreementPopup = ({ open, onAccept, agreementText }: AgreementPopupProps) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Default agreement text - can be replaced later
  const defaultText = `
    حرصاً على تنظيم العمل وضمان حقوق جميع الأطراف (المؤثر – صاحب العلامة التجارية – المنصّة)، يرجى الاطلاع على التعليمات التالية والموافقة عليها قبل استخدام المنصّة وقبول أي حملة:

أولاً: طبيعة المنصّة
المنصّة تعمل كوسيط يربط المؤثرين بالجهات التجارية (مثل المطاعم والمقاهي) لتنفيذ حملات تسويقية عبر منصّات التواصل الاجتماعي.
قبول المؤثر لأي حملة عبر المنصّة يُعد التزاماً كاملاً بتنفيذها وفق هذه التعليمات وتفاصيل الحملة.

ثانياً: الالتزام بالمواعيد
يلتزم المؤثر عند قبوله للحملة بـ التصوير في التاريخ المحدد في تفاصيل الحملة.
يلتزم المؤثر بـ رفع المحتوى على المنصّة خلال مدة لا تتجاوز (24 ساعة) من تاريخ التصوير، وذلك لغرض المراجعة والموافقة.
في حال عدم رفع المحتوى خلال المدة المحددة دون عذر مقبول، يحق للمنصّة اتخاذ الإجراء المناسب.

ثالثاً: آلية المراجعة والموافقة
يتم إثبات التنفيذ من خلال رفع المحتوى على المنصّة، ليتم عرضه على صاحب العلامة التجارية  لأخذ الموافقة قبل النشر.
يُمنح صاحب العلامة التجارية مهلة بحد أقصى (24 ساعة) لمراجعة المحتوى والموافقة عليه أو طلب تعديلات.
في حال عدم صدور أي رد من صاحب العلامة التجارية خلال المهلة المحددة، يحق للمؤثر نشر المحتوى مباشرة دون انتظار موافقة إضافية.
في حال طلب تعديلات معقولة تتوافق مع متطلبات الحملة، يلتزم المؤثر بتنفيذها خلال مدة لا تتجاوز 3 ايام.

رابعاً: تنفيذ المحتوى
يجب أن يكون المحتوى مطابقاً لتفاصيل الحملة ومتطلباتها (المنصّة، عدد المقاطع، المدة، النص، الوسوم, ...الى اخره).
يلتزم المؤثر بالإفصاح الواضح بأن المحتوى إعلاني/ترويجي وفق الأنظمة المعمول بها.
يمنع نشر أي محتوى مخالف للأنظمة أو مسيء أو يتضمن إساءة لصاحب العلامة التجارية  أو المنصّة.

خامساً: المقابل المالي

يستحق المؤثر المقابل المالي للحملة في إحدى الحالتين:
⦁	بعد موافقة صاحب العلامة التجارية  على المحتوى المرفوع على المنصّة، أو
⦁	بعد انقضاء مهلة (24 ساعة) دون رد من صاحب العلامة التجارية .
يتم تحويل المستحقات المالية إلى حساب المؤثر المسجّل في المنصّة خلال يومي عمل من تاريخ تحقق إحدى الحالتين أعلاه.
يحق للمنصّة إيقاف أو تأجيل التحويل في حال ثبوت مخالفة صريحة لتفاصيل الحملة أو لهذه التعليمات.

سادساً: المخالفات والإجراءات

في حال مخالفة المؤثر لهذه التعليمات أو لتفاصيل الحملة، يحق للمنصّة — بحسب تقديرها — اتخاذ أحد الإجراءات التالية:
⦁	توجيه إنذار.
⦁	تأجيل أو إلغاء مستحقات الحملة المخالفة.
⦁	تعليق الحساب مؤقتاً.
⦁	إيقاف التعاون مع المؤثر نهائياً.

سابعاً: أحكام عامة
هذه التعليمات مكملة لشروط استخدام المنصّة، ويُعد قبول المؤثر لها موافقة ملزمة.
للمنصّة الحق في تحديث هذه التعليمات، وسيتم إشعار المؤثر بأي تعديل.
استمرار استخدام المنصّة بعد التحديث يُعد قبولاً بالتعديلات.
  `;

  const handleAccept = async () => {
    if (!agreed) return;
    
    setLoading(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('Error accepting agreement:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} modal={true}>
      <DialogContent 
        className="w-[95vw] sm:max-w-[600px] max-h-[85vh] p-0 [&>button]:hidden" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold text-center">
           نبارك لك قبولك في منصة Influencers-Hub
          </DialogTitle>
          <DialogDescription className="text-center">
            يرجى قراءة الاتفاقية بعناية والموافقة عليها للمتابعة وبدء العمل على المنصة
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-4">
          <ScrollArea className="h-[400px] w-full border rounded-lg p-4 mb-4">
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-justify">
              {agreementText || defaultText}
            </div>
          </ScrollArea>
          
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg mb-4">
            <Checkbox
              id="agreement-checkbox"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-1"
            />
            <label
              htmlFor="agreement-checkbox"
              className="text-sm leading-relaxed cursor-pointer flex-1"
            >
              أقرّ بمراجعتي وفهمي لهذه الاتفاقية, وأوافق على الالتزام بها عند قبول أي حملة عبر المنصّة.
            </label>
          </div>
          
          <Button
            onClick={handleAccept}
            disabled={!agreed || loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'جاري الحفظ...' : 'أوافق وأتابع'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

