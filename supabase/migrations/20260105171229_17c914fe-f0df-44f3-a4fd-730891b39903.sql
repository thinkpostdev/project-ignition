-- Add bank account fields to influencer_profiles
ALTER TABLE public.influencer_profiles
ADD COLUMN bank_name TEXT,
ADD COLUMN iban TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.influencer_profiles.bank_name IS 'Bank name for payment (اسم البنك)';
COMMENT ON COLUMN public.influencer_profiles.iban IS 'IBAN number for payment (رقم الآيبان)';