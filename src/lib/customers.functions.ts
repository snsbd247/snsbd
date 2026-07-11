import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { customer_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles").select("email").eq("id", data.customer_id).maybeSingle();
    if (pErr || !profile?.email) throw new Error("Customer email not found");

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error(linkErr?.message ?? "Failed to generate portal link");
    }

    // Verify the OTP with a non-persistent public client to obtain session tokens
    // without touching the admin's browser session.
    const pub = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: verified, error: vErr } = await pub.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (vErr || !verified.session) throw new Error(vErr?.message ?? "Failed to mint session");

    return {
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
    };
  });



export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    email: string;
    full_name?: string;
    phone?: string;
    company?: string;
    address?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    // Verify caller is admin
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin only");
    if (!data.email || !/^\S+@\S+\.\S+$/.test(data.email)) throw new Error("Valid email required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Generate a random password; user can reset via magic link
    const password = crypto.randomUUID().replace(/-/g, "") + "Aa1!";

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name ?? data.email },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");

    // handle_new_user trigger creates the profile + customer role. Update extra fields.
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name ?? data.email,
        phone: data.phone ?? null,
        company: data.company ?? null,
        address: data.address ?? null,
      })
      .eq("id", created.user.id);
    if (upErr) throw upErr;

    return { id: created.user.id };
  });
