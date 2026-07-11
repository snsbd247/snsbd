
CREATE TYPE public.customer_order_type AS ENUM ('hosting', 'service', 'domain');
CREATE TYPE public.customer_order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'rejected');
CREATE TYPE public.domain_action AS ENUM ('register', 'transfer', 'use_existing', 'renew');

CREATE TABLE public.customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_type public.customer_order_type NOT NULL,
  hosting_package_id UUID REFERENCES public.hosting_packages(id) ON DELETE SET NULL,
  service_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  domain_name TEXT,
  domain_action public.domain_action,
  quoted_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.customer_order_status NOT NULL DEFAULT 'pending',
  customer_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX customer_orders_customer_idx ON public.customer_orders(customer_id);
CREATE INDEX customer_orders_status_idx ON public.customer_orders(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_orders TO authenticated;
GRANT ALL ON public.customer_orders TO service_role;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers view own orders" ON public.customer_orders
  FOR SELECT USING (auth.uid() = customer_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customers create own orders" ON public.customer_orders
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins manage orders" ON public.customer_orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete orders" ON public.customer_orders
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_customer_orders_updated BEFORE UPDATE ON public.customer_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
