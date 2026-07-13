ALTER TABLE public.page_contents
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS hero_image text;

CREATE TABLE IF NOT EXISTS public.page_content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title text,
  seo_description text,
  og_image text,
  hero_image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, DELETE ON public.page_content_versions TO authenticated;
GRANT ALL ON public.page_content_versions TO service_role;

ALTER TABLE public.page_content_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versions readable by admins"
  ON public.page_content_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "versions writable by admins"
  ON public.page_content_versions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS page_content_versions_slug_idx
  ON public.page_content_versions (slug, created_at DESC);
