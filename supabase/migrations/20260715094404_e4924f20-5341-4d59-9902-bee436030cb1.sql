
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invoice_templates TO authenticated;
GRANT ALL ON public.invoice_templates TO service_role;

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view templates" ON public.invoice_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage templates" ON public.invoice_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_invoice_templates_updated
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS invoice_template_key TEXT DEFAULT 'classic-red',
  ADD COLUMN IF NOT EXISTS invoice_theme JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invoice_logo_style TEXT DEFAULT 'shadow',
  ADD COLUMN IF NOT EXISTS invoice_background_url TEXT;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS theme_override JSONB;

INSERT INTO public.invoice_templates (template_key, name, description, is_default, sort_order, theme) VALUES
('classic-red', 'Classic Red', 'Bold red header with white text', true, 1, '{
  "primary": "#dc2626",
  "accent": "#fecaca",
  "textOnPrimary": "#ffffff",
  "fontHeading": "Inter",
  "fontBody": "Inter",
  "logoStyle": "shadow",
  "showBackground": false,
  "backgroundOpacity": 0.08
}'::jsonb),
('modern-minimal', 'Modern Minimal', 'Clean neutral layout with subtle accents', false, 2, '{
  "primary": "#0f172a",
  "accent": "#e2e8f0",
  "textOnPrimary": "#ffffff",
  "fontHeading": "Poppins",
  "fontBody": "Inter",
  "logoStyle": "plain",
  "showBackground": false,
  "backgroundOpacity": 0.05
}'::jsonb),
('corporate-blue', 'Corporate Blue', 'Professional blue theme', false, 3, '{
  "primary": "#1e40af",
  "accent": "#dbeafe",
  "textOnPrimary": "#ffffff",
  "fontHeading": "Inter",
  "fontBody": "Inter",
  "logoStyle": "badge",
  "showBackground": false,
  "backgroundOpacity": 0.06
}'::jsonb),
('elegant-dark', 'Elegant Dark', 'Sophisticated dark theme with serif headings', false, 4, '{
  "primary": "#0b1220",
  "accent": "#f59e0b",
  "textOnPrimary": "#f5f5f4",
  "fontHeading": "Playfair Display",
  "fontBody": "Inter",
  "logoStyle": "stroke",
  "showBackground": false,
  "backgroundOpacity": 0.1
}'::jsonb);
