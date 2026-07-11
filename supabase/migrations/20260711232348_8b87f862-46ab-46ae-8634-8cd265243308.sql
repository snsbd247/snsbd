
CREATE TABLE public.whm_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hostname TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 2087,
  username TEXT NOT NULL DEFAULT 'root',
  api_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whm_servers TO authenticated;
GRANT ALL ON public.whm_servers TO service_role;

ALTER TABLE public.whm_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whm servers"
  ON public.whm_servers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_whm_servers_updated_at
BEFORE UPDATE ON public.whm_servers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS whm_server_id UUID REFERENCES public.whm_servers(id) ON DELETE SET NULL;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS whm_account_user TEXT;

CREATE INDEX IF NOT EXISTS idx_services_whm_account ON public.services(whm_server_id, whm_account_user);
