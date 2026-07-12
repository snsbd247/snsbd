
-- Lock down SECURITY DEFINER functions: revoke public execute on ones that should not be callable via the API.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_milestone_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_service_package_change() FROM PUBLIC, anon, authenticated;

-- has_role / is_admin: only signed-in users should evaluate roles.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- email_for_username is intentionally callable by anon for username-based login lookup;
-- leave EXECUTE for anon but drop broad PUBLIC.
REVOKE EXECUTE ON FUNCTION public.email_for_username(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.email_for_username(text) TO anon, authenticated, service_role;

-- Fix always-true INSERT policy on service_package_changes: rows are written by the
-- SECURITY DEFINER trigger, which bypasses RLS as its owner. Restrict direct API inserts to service_role.
DROP POLICY IF EXISTS "System can insert package changes" ON public.service_package_changes;
CREATE POLICY "Only service role can insert package changes"
  ON public.service_package_changes FOR INSERT TO service_role WITH CHECK (true);

-- Tighten anon lead submission: require a plausible email/name so WITH CHECK is not trivially true.
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead"
  ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND char_length(email) BETWEEN 3 AND 320
    AND email LIKE '%_@_%.__%'
    AND char_length(coalesce(name, '')) <= 200
    AND char_length(coalesce(message, '')) <= 5000
  );
