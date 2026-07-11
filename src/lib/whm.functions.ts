import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type WhmServer = {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  api_token: string;
};

function whmBase(s: WhmServer) {
  return `https://${s.hostname}:${s.port}`;
}

function whmHeaders(s: WhmServer) {
  return {
    Authorization: `whm ${s.username}:${s.api_token}`,
    Accept: "application/json",
  };
}

async function whmGet(s: WhmServer, path: string) {
  const url = `${whmBase(s)}${path}${path.includes("?") ? "&" : "?"}api.version=1`;
  const res = await fetch(url, { headers: whmHeaders(s) });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { throw new Error(`WHM returned non-JSON (${res.status}): ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(`WHM ${res.status}: ${body?.metadata?.reason ?? text.slice(0, 200)}`);
  if (body?.metadata?.result === 0) throw new Error(body?.metadata?.reason ?? "WHM API error");
  return body;
}

async function loadServer(supabase: any, id: string): Promise<WhmServer> {
  const { data, error } = await supabase.from("whm_servers").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("WHM server not found");
  return data as WhmServer;
}

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admins only");
}

async function loadServiceForUser(context: any, service_id: string, adminOverride = false) {
  const { data: svc, error } = await context.supabase
    .from("services")
    .select("id, customer_id, type, whm_server_id, whm_account_user, cpanel_username, cpanel_url")
    .eq("id", service_id)
    .maybeSingle();
  if (error || !svc) throw new Error("Service not found");
  if (svc.type !== "hosting") throw new Error("Not a hosting service");
  if (!adminOverride && svc.customer_id !== context.userId) {
    const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!ok) throw new Error("Not your hosting");
  }
  if (!svc.whm_server_id) throw new Error("This hosting is not linked to a WHM server");
  const user = svc.whm_account_user || svc.cpanel_username;
  if (!user) throw new Error("cPanel username missing on this hosting");
  return { svc, user };
}

/** Admin: sync all cPanel accounts from a WHM server into customers + hosting services. */
export const whmSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { server_id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const server = await loadServer(context.supabase, data.server_id);
    const list = await whmGet(server, "/json-api/listaccts");
    const accts: any[] = list?.data?.acct ?? [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let created = 0, updated = 0, customersCreated = 0, skipped = 0;
    const errors: string[] = [];

    for (const a of accts) {
      const email = (a.email || "").trim().toLowerCase();
      const cpuser = a.user as string;
      if (!email || !cpuser) { skipped++; continue; }

      try {
        // 1) find or create customer profile
        let customerId: string | null = null;
        const { data: existing } = await supabaseAdmin
          .from("profiles").select("id").ilike("email", email).maybeSingle();
        if (existing) {
          customerId = existing.id;
        } else {
          const { data: created2, error: cErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: a.domain || email },
          });
          if (cErr || !created2.user) throw new Error(`create user ${email}: ${cErr?.message ?? "failed"}`);
          customerId = created2.user.id;
          customersCreated++;
        }

        // 2) upsert the hosting service (identify by whm_server + whm_account_user)
        const { data: svc } = await supabaseAdmin
          .from("services")
          .select("id")
          .eq("whm_server_id", server.id)
          .eq("whm_account_user", cpuser)
          .maybeSingle();

        const details = [a.plan, a.domain].filter(Boolean).join(" · ");
        const payload = {
          customer_id: customerId,
          type: "hosting" as const,
          name: a.domain || cpuser,
          details,
          status: (a.suspended ? "cancelled" : "active") as any,
          cpanel_url: `${whmBase(server)}`,
          cpanel_username: cpuser,
          whm_server_id: server.id,
          whm_account_user: cpuser,
        };

        if (svc) {
          const { error } = await supabaseAdmin.from("services").update(payload).eq("id", svc.id);
          if (error) throw new Error(`update ${cpuser}: ${error.message}`);
          updated++;
        } else {
          const { error } = await supabaseAdmin.from("services").insert(payload);
          if (error) throw new Error(`insert ${cpuser}: ${error.message}`);
          created++;
        }
      } catch (e: any) {
        errors.push(`${cpuser}: ${e.message}`);
      }
    }

    const summary = `Accounts: ${accts.length}, created: ${created}, updated: ${updated}, new customers: ${customersCreated}, skipped: ${skipped}${errors.length ? `, errors: ${errors.length}` : ""}`;
    await supabaseAdmin.from("whm_servers")
      .update({ last_sync_at: new Date().toISOString(), last_sync_result: summary })
      .eq("id", server.id);

    return { ok: true, summary, created, updated, customersCreated, skipped, errors };
  });

/** Customer or admin: change cPanel password via WHM. */
export const cpanelChangePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { service_id: string; new_password: string }) => {
    if (!data?.new_password || data.new_password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { svc, user } = await loadServiceForUser(context, data.service_id);
    const server = await loadServer(context.supabase, svc.whm_server_id!);
    const params = new URLSearchParams({ user, password: data.new_password, db_pass_update: "1" });
    await whmGet(server, `/json-api/passwd?${params.toString()}`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("services").update({ cpanel_password: data.new_password }).eq("id", svc.id);
    return { ok: true };
  });

/** Customer or admin: create a single-signon cPanel URL. */
export const cpanelSsoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { service_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { svc, user } = await loadServiceForUser(context, data.service_id);
    const server = await loadServer(context.supabase, svc.whm_server_id!);
    const params = new URLSearchParams({ user, service: "cpaneld" });
    const body = await whmGet(server, `/json-api/create_user_session?${params.toString()}`);
    const url = body?.data?.url as string | undefined;
    if (!url) throw new Error("WHM did not return an SSO URL");
    return { url };
  });

/** Admin: test connection to a WHM server. */
export const whmTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { server_id: string }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const server = await loadServer(context.supabase, data.server_id);
    const body = await whmGet(server, "/json-api/version");
    return { ok: true, version: body?.data?.version ?? "unknown" };
  });
