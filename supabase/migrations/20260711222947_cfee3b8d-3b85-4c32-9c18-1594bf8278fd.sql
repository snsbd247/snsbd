ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS cpanel_url text,
  ADD COLUMN IF NOT EXISTS cpanel_username text,
  ADD COLUMN IF NOT EXISTS cpanel_password text;