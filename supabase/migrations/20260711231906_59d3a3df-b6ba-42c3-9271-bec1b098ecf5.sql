
CREATE TABLE public.service_package_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  old_package_id UUID REFERENCES public.hosting_packages(id) ON DELETE SET NULL,
  new_package_id UUID REFERENCES public.hosting_packages(id) ON DELETE SET NULL,
  old_package_name TEXT,
  new_package_name TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.service_package_changes TO authenticated;
GRANT ALL ON public.service_package_changes TO service_role;

ALTER TABLE public.service_package_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all package changes"
  ON public.service_package_changes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers view own service package changes"
  ON public.service_package_changes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.customer_id = auth.uid()));

CREATE POLICY "System can insert package changes"
  ON public.service_package_changes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_service_package_changes_service ON public.service_package_changes(service_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_service_package_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_name TEXT;
  new_name TEXT;
BEGIN
  IF NEW.hosting_package_id IS DISTINCT FROM OLD.hosting_package_id THEN
    SELECT name INTO old_name FROM public.hosting_packages WHERE id = OLD.hosting_package_id;
    SELECT name INTO new_name FROM public.hosting_packages WHERE id = NEW.hosting_package_id;
    INSERT INTO public.service_package_changes
      (service_id, old_package_id, new_package_id, old_package_name, new_package_name, actor_id)
    VALUES
      (NEW.id, OLD.hosting_package_id, NEW.hosting_package_id, old_name, new_name, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_service_package_change ON public.services;
CREATE TRIGGER trg_log_service_package_change
AFTER UPDATE OF hosting_package_id ON public.services
FOR EACH ROW EXECUTE FUNCTION public.log_service_package_change();
