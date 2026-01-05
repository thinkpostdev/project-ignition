import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BankInfoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencerProfileId: string;
  onSuccess?: () => void;
}

export const BankInfoPopup = ({ open, onOpenChange, influencerProfileId, onSuccess }: BankInfoPopupProps) => {
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!bankName.trim()) {
      toast.error('يرجى إدخال اسم البنك');
      return;
    }
    if (!iban.trim()) {
      toast.error('يرجى إدخال رقم الآيبان');
      return;
    }

    // Basic IBAN validation for Saudi Arabia (starts with SA and is 24 characters)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (!cleanIban.startsWith('SA') || cleanIban.length !== 24) {
      toast.error('رقم الآيبان غير صالح. يجب أن يبدأ بـ SA ويتكون من 24 حرف');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('influencer_profiles')
        .update({ 
          bank_name: bankName.trim(),
          iban: cleanIban,
          updated_at: new Date().toISOString()
        })
        .eq('id', influencerProfileId);

      if (error) throw error;

      toast.success('تم حفظ معلومات البنك بنجاح');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving bank info:', error);
      toast.error('فشل حفظ معلومات البنك');
    } finally {
      setSaving(false);
    }
  };

  const handleRemindLater = () => {
    toast.info('يمكنك إضافة معلومات البنك لاحقاً من الإعدادات');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">معلومات الحساب البنكي</DialogTitle>
          </div>
          <DialogDescription className="text-right">
            لاستلام أتعابك، يرجى إدخال معلومات حسابك البنكي
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name">اسم البنك</Label>
            <Input
              id="bank_name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="مثال: الراجحي، الأهلي، سامبا..."
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">رقم الآيبان (IBAN)</Label>
            <Input
              id="iban"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="SA0000000000000000000000"
              className="text-left font-mono"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              رقم الآيبان السعودي يبدأ بـ SA ويتكون من 24 حرف
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="flex-1"
          >
            لاحقاً
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
