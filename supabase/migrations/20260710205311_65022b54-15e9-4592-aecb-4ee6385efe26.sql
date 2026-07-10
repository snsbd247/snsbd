
CREATE TABLE public.project_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID,
  actor_id UUID,
  action TEXT NOT NULL,
  milestone_title TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.project_activity_log TO authenticated;
GRANT ALL ON public.project_activity_log TO service_role;

ALTER TABLE public.project_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all activity" ON public.project_activity_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Customers view own project activity" ON public.project_activity_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.customer_id = auth.uid()));

CREATE INDEX idx_project_activity_project ON public.project_activity_log(project_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_milestone_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_project UUID;
  v_title TEXT;
  v_mid UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'added';
    v_project := NEW.project_id; v_title := NEW.title; v_mid := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_project := OLD.project_id; v_title := OLD.title; v_mid := OLD.id;
  ELSE
    v_project := NEW.project_id; v_title := NEW.title; v_mid := NEW.id;
    IF NEW.completed IS DISTINCT FROM OLD.completed THEN
      v_action := CASE WHEN NEW.completed THEN 'completed' ELSE 'uncompleted' END;
    ELSE
      v_action := 'updated';
    END IF;
  END IF;

  INSERT INTO public.project_activity_log (project_id, milestone_id, actor_id, action, milestone_title)
  VALUES (v_project, v_mid, auth.uid(), v_action, v_title);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_milestone_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.log_milestone_activity();
