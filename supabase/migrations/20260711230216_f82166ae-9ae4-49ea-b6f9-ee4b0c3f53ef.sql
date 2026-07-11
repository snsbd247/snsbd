
CREATE TYPE public.payment_provider AS ENUM ('bkash', 'nagad');
CREATE TYPE public.gateway_mode AS ENUM ('sandbox', 'live');
CREATE TYPE public.gateway_txn_status AS ENUM ('initiated', 'pending', 'completed', 'failed', 'cancelled');

CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider public.payment_provider NOT NULL,
  mode public.gateway_mode NOT NULL DEFAULT 'sandbox',
  app_key TEXT,
  app_secret TEXT,
  username TEXT,
  password TEXT,
  merchant_number TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gateways" ON public.payment_gateways
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_payment_gateways_updated BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  provider_payment_id TEXT,
  provider_trx_id TEXT,
  status public.gateway_txn_status NOT NULL DEFAULT 'initiated',
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pt_invoice_idx ON public.payment_transactions(invoice_id);
CREATE INDEX pt_payment_id_idx ON public.payment_transactions(provider_payment_id);
GRANT SELECT, INSERT, UPDATE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own txns" ON public.payment_transactions
  FOR SELECT USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Create own txns" ON public.payment_transactions
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins update txns" ON public.payment_transactions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_pt_updated BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
