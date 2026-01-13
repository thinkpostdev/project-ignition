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
            <Label htmlFor="iban" className="text-base font-semibold">رقم الآيبان (IBAN)</Label>
            <Input
              id="iban"
              value={iban}
              onChange={handleIbanChange}
              placeholder="SA00 0000 0000 0000 0000 0000"
              className="text-left font-mono text-lg tracking-wider"
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
