
-- Add 'other' to service_type enum
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'other';

-- Link services to projects (optional)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_services_project ON public.services(project_id);

-- Link invoices to projects (optional)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_project ON public.invoices(project_id);
