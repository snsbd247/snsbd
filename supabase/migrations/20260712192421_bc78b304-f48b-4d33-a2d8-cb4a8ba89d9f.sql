
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provisioning_status text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS registrar_order_id text;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS registrar_meta jsonb;

CREATE TABLE IF NOT EXISTS public.service_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  status text NOT NULL,
  message text,
  actor_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_events_service_idx ON public.service_events(service_id, created_at DESC);

GRANT SELECT, INSERT ON public.service_events TO authenticated;
GRANT ALL ON public.service_events TO service_role;

ALTER TABLE public.service_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own or admin service events"
ON public.service_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_events.service_id
      AND (s.customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Admin insert service events"
ON public.service_events FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
