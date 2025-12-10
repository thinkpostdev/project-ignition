# دليل الموافقة على الدفع للمسؤولين / Admin Payment Approval Guide

## نظرة عامة / Overview

تم تحديث نظام إرسال الدعوات بحيث يتطلب موافقة المسؤول قبل إرسال الدعوات إلى المؤثرين. هذا يضمن أن الدفع قد تم التحقق منه قبل المتابعة.

The invitation sending system has been updated to require admin approval before sending invitations to influencers. This ensures that payment has been verified before proceeding.

## كيفية الموافقة على الدفع / How to Approve Payment

### الطريقة 1: استخدام Supabase Dashboard (الأسهل)

1. قم بتسجيل الدخول إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. افتح مشروعك
3. انتقل إلى **Table Editor** في القائمة الجانبية
4. اختر جدول **campaigns**
5. ابحث عن الحملة التي تريد الموافقة عليها (ستجد `payment_submitted_at` غير فارغ)
6. انقر على الصف لتحريره
7. غيّر قيمة `payment_approved` من `false` إلى `true`
8. احفظ التغييرات

**النتيجة:** سيتم إرسال الدعوات تلقائياً إلى جميع المؤثرين المختارين فور الحفظ! ✅

### Method 1: Using Supabase Dashboard (Easiest)

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project
3. Go to **Table Editor** in the sidebar
4. Select the **campaigns** table
5. Find the campaign you want to approve (it will have `payment_submitted_at` not null)
6. Click on the row to edit it
7. Change `payment_approved` from `false` to `true`
8. Save the changes

**Result:** Invitations will be sent automatically to all selected influencers immediately upon saving! ✅

---

### الطريقة 2: استخدام SQL Query

يمكنك أيضاً استخدام SQL Query في Supabase SQL Editor:

```sql
-- الموافقة على دفع حملة معينة
UPDATE campaigns 
SET payment_approved = true 
WHERE id = 'CAMPAIGN_ID_HERE';

-- عرض جميع الحملات التي تنتظر الموافقة
SELECT id, title, payment_submitted_at, payment_approved 
FROM campaigns 
WHERE payment_submitted_at IS NOT NULL 
  AND payment_approved = false
ORDER BY payment_submitted_at DESC;
```

### Method 2: Using SQL Query

You can also use an SQL Query in Supabase SQL Editor:

```sql
-- Approve payment for a specific campaign
UPDATE campaigns 
SET payment_approved = true 
WHERE id = 'CAMPAIGN_ID_HERE';

-- View all campaigns awaiting approval
SELECT id, title, payment_submitted_at, payment_approved 
FROM campaigns 
WHERE payment_submitted_at IS NOT NULL 
  AND payment_approved = false
ORDER BY payment_submitted_at DESC;
```

---

## آلية العمل التقنية / Technical Flow

1. **عند ضغط صاحب الحملة على "تم الدفع":**
   - يتم حفظ التواريخ المحددة
   - يتم تعليم المؤثرين كـ `selected = true`
   - يتم تعيين `payment_submitted_at` بالتاريخ والوقت الحالي
   - يتم عرض رسالة للمالك: "سيتم مراجعة الدفع ومن ثم إرسال الدعوات"

2. **عند موافقة المسؤول (تغيير `payment_approved` إلى `true`):**
   - يتم تفعيل Database Trigger تلقائياً
   - يتم إنشاء دعوات لجميع المؤثرين المختارين
   - يتم إرسال الدعوات بحالة `pending`

3. **المؤثرون يستلمون الدعوات:**
   - يمكنهم قبول أو رفض الدعوة
   - يتم تتبع حالة كل دعوة في النظام

### Technical Flow

1. **When campaign owner clicks "Payment Done":**
   - Scheduled dates are saved
   - Influencers are marked as `selected = true`
   - `payment_submitted_at` is set to current timestamp
   - Owner sees message: "Payment will be reviewed and invitations will be sent"

2. **When admin approves (changes `payment_approved` to `true`):**
   - Database Trigger is automatically activated
   - Invitations are created for all selected influencers
   - Invitations are sent with `pending` status

3. **Influencers receive invitations:**
   - They can accept or decline the invitation
   - Each invitation status is tracked in the system

---

## الأعمدة الجديدة في جدول campaigns / New Columns in campaigns Table

| Column Name | Type | Default | Description (AR) | Description (EN) |
|-------------|------|---------|------------------|------------------|
| `payment_approved` | `boolean` | `false` | هل تمت الموافقة على الدفع من قبل المسؤول | Whether payment has been approved by admin |
| `payment_submitted_at` | `timestamp` | `null` | تاريخ ووقت تأكيد صاحب الحملة للدفع | Timestamp when owner confirmed payment |

---

## ملاحظات مهمة / Important Notes

⚠️ **تحذير:** عند تغيير `payment_approved` إلى `true`، سيتم إرسال الدعوات **فوراً وتلقائياً**. تأكد من التحقق من الدفع قبل الموافقة!

⚠️ **Warning:** When changing `payment_approved` to `true`, invitations will be sent **immediately and automatically**. Make sure to verify payment before approving!

✅ **نصيحة:** يمكنك البحث عن الحملات التي تنتظر الموافقة بالبحث عن الحملات التي لديها `payment_submitted_at` غير فارغ و `payment_approved` = `false`

✅ **Tip:** You can find campaigns awaiting approval by looking for campaigns with `payment_submitted_at` not null and `payment_approved` = `false`

---

## استكشاف الأخطاء / Troubleshooting

### لم يتم إرسال الدعوات بعد الموافقة / Invitations Not Sent After Approval

1. تحقق من أن `payment_approved` تم تغييره إلى `true`
2. تحقق من أن المؤثرين معلّمين كـ `selected = true` في جدول `campaign_influencer_suggestions`
3. تحقق من logs في Supabase Dashboard > Database > Logs
4. تأكد من أن Trigger نشط: `trigger_send_invitations_on_payment_approval`

### Invitations Not Sent After Approval

1. Verify that `payment_approved` was changed to `true`
2. Check that influencers are marked as `selected = true` in `campaign_influencer_suggestions` table
3. Check logs in Supabase Dashboard > Database > Logs
4. Ensure Trigger is active: `trigger_send_invitations_on_payment_approval`

---

## التواصل / Contact

في حال واجهتك أي مشاكل، يرجى التواصل مع فريق التطوير.

If you encounter any issues, please contact the development team.

