CREATE TABLE public.page_contents (
  slug text PRIMARY KEY,
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.page_contents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_contents TO authenticated;
GRANT ALL ON public.page_contents TO service_role;

ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_contents readable by everyone"
  ON public.page_contents FOR SELECT
  USING (true);

CREATE POLICY "page_contents writable by admins"
  ON public.page_contents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER page_contents_updated_at
  BEFORE UPDATE ON public.page_contents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
