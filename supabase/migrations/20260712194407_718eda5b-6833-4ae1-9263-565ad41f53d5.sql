
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS renewal_reminder_stage smallint NOT NULL DEFAULT 0;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_renewal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_services_expiry_renewable
  ON public.services (expiry_date)
  WHERE renewable = true AND status = 'active';
