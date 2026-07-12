import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Get branding for the current reseller (or admin editing self). */
export const getMyBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("reseller_branding")
      .select("*")
      .eq("reseller_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { branding: data };
  });

/** Public lookup by hostname (for portal theming). */
export const getBrandingByHost = createServerFn({ method: "GET" })
  .inputValidator((d: { host: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("reseller_branding")
      .select("company_name, logo_url, primary_color, support_email, custom_hostname")
      .eq("custom_hostname", data.host)
      .maybeSingle();
    return { branding: row };
  });

export const upsertMyBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    company_name?: string; logo_url?: string; primary_color?: string;
    custom_hostname?: string; support_email?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    // require reseller or admin
    const { data: isReseller } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "reseller" as any });
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isReseller && !isAdmin) throw new Error("Reseller role required");
    const { error } = await context.supabase
      .from("reseller_branding")
      .upsert({ reseller_id: context.userId, ...data }, { onConflict: "reseller_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
