
CREATE TABLE public.order_domain_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
  actor_id uuid,
  old_domain text,
  new_domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_domain_changes_order_id_idx ON public.order_domain_changes(order_id, created_at DESC);

GRANT SELECT, INSERT ON public.order_domain_changes TO authenticated;
GRANT ALL ON public.order_domain_changes TO service_role;

ALTER TABLE public.order_domain_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all domain changes"
  ON public.order_domain_changes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers view own order domain changes"
  ON public.order_domain_changes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

CREATE POLICY "Admins insert domain changes"
  ON public.order_domain_changes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
