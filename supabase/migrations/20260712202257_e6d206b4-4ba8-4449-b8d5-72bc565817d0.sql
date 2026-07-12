
-- Add 'reseller' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reseller';

-- Currencies
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  rate_to_bdt NUMERIC(14,6) NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies read all" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "currencies admin write" ON public.currencies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.currencies (code, name, symbol, rate_to_bdt) VALUES
  ('BDT', 'Bangladeshi Taka', '৳', 1),
  ('USD', 'US Dollar', '$', 0.0091),
  ('EUR', 'Euro', '€', 0.0084);

-- Profile prefs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'BDT' REFERENCES public.currencies(code),
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','bn'));

-- Reseller customers
CREATE TABLE public.reseller_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reseller_id, customer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reseller_customers TO authenticated;
GRANT ALL ON public.reseller_customers TO service_role;
ALTER TABLE public.reseller_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reseller sees own" ON public.reseller_customers FOR SELECT TO authenticated
  USING (reseller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manages reseller links" ON public.reseller_customers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Reseller custom pricing
CREATE TABLE public.reseller_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hosting_package_id UUID NOT NULL REFERENCES public.hosting_packages(id) ON DELETE CASCADE,
  markup_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  override_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reseller_id, hosting_package_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reseller_pricing TO authenticated;
GRANT ALL ON public.reseller_pricing TO service_role;
ALTER TABLE public.reseller_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reseller pricing own" ON public.reseller_pricing FOR ALL TO authenticated
  USING (reseller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (reseller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_reseller_pricing_updated_at BEFORE UPDATE ON public.reseller_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- API keys (hashed)
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys owner" ON public.api_keys FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Outbound webhooks
CREATE TABLE public.outbound_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY['invoice.paid'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_webhooks TO authenticated;
GRANT ALL ON public.outbound_webhooks TO service_role;
ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks owner" ON public.outbound_webhooks FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_outbound_webhooks_updated_at BEFORE UPDATE ON public.outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Webhook deliveries
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.outbound_webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INT,
  response_body TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries owner read" ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.outbound_webhooks w WHERE w.id = webhook_id AND (w.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
