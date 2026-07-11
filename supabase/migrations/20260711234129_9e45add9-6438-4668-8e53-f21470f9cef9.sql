
-- Add late fee configuration and overdue enforcement fields

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS late_fee_percent numeric NOT NULL DEFAULT 2;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS late_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_applied_at timestamptz;

-- Add 'suspended' status to service_status enum for hosting suspension
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='suspended' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='service_status')) THEN
    ALTER TYPE public.service_status ADD VALUE 'suspended';
  END IF;
END $$;
