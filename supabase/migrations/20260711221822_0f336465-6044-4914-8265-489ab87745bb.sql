
CREATE TABLE public.company_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  company_name TEXT NOT NULL DEFAULT 'Sync & Solutions IT',
  logo_url TEXT,
  favicon_url TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  footer_copyright TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_settings_singleton CHECK (id = TRUE)
);

GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view company settings" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert company settings" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update company settings" ON public.company_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER company_settings_set_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.company_settings (id, company_name, address) VALUES (TRUE, 'Sync & Solutions IT', 'Bangladesh') ON CONFLICT DO NOTHING;

-- Add receipt number to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
