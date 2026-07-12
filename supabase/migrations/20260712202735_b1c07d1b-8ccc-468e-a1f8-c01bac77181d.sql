
-- Reseller branding
CREATE TABLE public.reseller_branding (
  reseller_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  custom_hostname TEXT UNIQUE,
  support_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reseller_branding TO authenticated;
GRANT SELECT ON public.reseller_branding TO anon;
GRANT ALL ON public.reseller_branding TO service_role;
ALTER TABLE public.reseller_branding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branding public read" ON public.reseller_branding FOR SELECT USING (true);
CREATE POLICY "branding self manage" ON public.reseller_branding FOR ALL TO authenticated
  USING (reseller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (reseller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_reseller_branding_updated_at BEFORE UPDATE ON public.reseller_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Product addons
CREATE TABLE public.product_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  hosting_package_id UUID REFERENCES public.hosting_packages(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_addons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_addons TO authenticated;
GRANT ALL ON public.product_addons TO service_role;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addons public read" ON public.product_addons FOR SELECT USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "addons admin write" ON public.product_addons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_product_addons_updated_at BEFORE UPDATE ON public.product_addons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Service <-> addon links
CREATE TABLE public.service_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.product_addons(id) ON DELETE CASCADE,
  price_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, addon_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_addons TO authenticated;
GRANT ALL ON public.service_addons TO service_role;
ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_addons owner" ON public.service_addons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND (s.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND (s.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_percent NUMERIC(5,2),
  discount_amount NUMERIC(12,2),
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (discount_percent IS NOT NULL OR discount_amount IS NOT NULL)
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons read" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "coupons admin write" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push subs owner" ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
