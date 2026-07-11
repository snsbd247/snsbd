
CREATE TABLE public.hosting_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  disk_space TEXT,
  bandwidth TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'yearly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hosting_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hosting_packages TO authenticated;
GRANT ALL ON public.hosting_packages TO service_role;
ALTER TABLE public.hosting_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active hosting packages" ON public.hosting_packages FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage hosting packages" ON public.hosting_packages FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_hosting_packages_updated BEFORE UPDATE ON public.hosting_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'one_time',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_catalog TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_catalog TO authenticated;
GRANT ALL ON public.service_catalog TO service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active catalog items" ON public.service_catalog FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage service catalog" ON public.service_catalog FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_service_catalog_updated BEFORE UPDATE ON public.service_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
