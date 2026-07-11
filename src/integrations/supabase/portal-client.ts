// Portal-scoped Supabase client (per-tab, isolated from admin's default client).
// Uses sessionStorage + a unique storageKey so signing in here does NOT clobber
// the admin session stored in localStorage under the default key.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

let _portal: ReturnType<typeof createClient<Database>> | undefined;

export function getPortalClient() {
  if (_portal) return _portal;
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  _portal = createClient<Database>(url, key, {
    auth: {
      storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
      storageKey: "sb-portal-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return _portal;
}
