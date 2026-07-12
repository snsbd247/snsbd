-- Phase 2: SSLCommerz + configurable billing settings

ALTER TYPE public.payment_provider ADD VALUE IF NOT EXISTS 'sslcommerz';

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS vat_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_lead_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS grace_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS auto_suspend boolean NOT NULL DEFAULT true;