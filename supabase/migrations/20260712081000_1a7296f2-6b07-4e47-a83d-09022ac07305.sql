
-- Domain pricing (admin-managed TLD prices, publicly readable)
CREATE TABLE IF NOT EXISTS public.domain_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tld text NOT NULL UNIQUE,
  register_price numeric NOT NULL DEFAULT 0,
  renew_price numeric NOT NULL DEFAULT 0,
  transfer_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BDT',
  featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.domain_pricing TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.domain_pricing TO authenticated;
GRANT ALL ON public.domain_pricing TO service_role;

ALTER TABLE public.domain_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active domain pricing" ON public.domain_pricing
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage domain pricing" ON public.domain_pricing
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_domain_pricing_updated
  BEFORE UPDATE ON public.domain_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed common TLDs
INSERT INTO public.domain_pricing (tld, register_price, renew_price, transfer_price, sort_order, featured) VALUES
  ('.com', 1150, 1250, 1150, 10, true),
  ('.net', 1350, 1450, 1350, 20, false),
  ('.org', 1250, 1350, 1250, 30, false),
  ('.xyz', 299, 1100, 1100, 40, false),
  ('.info', 499, 1850, 1850, 50, false),
  ('.io', 4500, 4500, 4500, 60, false),
  ('.co', 2600, 2600, 2600, 70, false),
  ('.online', 299, 3900, 3900, 80, false),
  ('.shop', 299, 2700, 2700, 90, false),
  ('.dev', 1600, 1600, 1600, 100, false)
ON CONFLICT (tld) DO NOTHING;

-- Add category + marketing fields to hosting_packages
ALTER TABLE public.hosting_packages
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge text;

-- Extend customer_orders for full order flow
ALTER TABLE public.customer_orders
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS manual_trx_id text,
  ADD COLUMN IF NOT EXISTS manual_sender text,
  ADD COLUMN IF NOT EXISTS activated_service_id uuid,
  ADD COLUMN IF NOT EXISTS whm_server_id uuid REFERENCES public.whm_servers(id) ON DELETE SET NULL;
