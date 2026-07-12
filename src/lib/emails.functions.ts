import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

async function sendViaResend(args: SendArgs): Promise<{ ok: boolean; skipped?: boolean; error?: string; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };
  const from = args.from || process.env.RESEND_FROM || "SNS BD <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [args.to], subject: args.subject, html: args.html }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body?.message || `Resend ${res.status}` };
  return { ok: true, id: body?.id };
}

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function welcomeHtml(o: {
  fullName?: string | null;
  domain: string;
  cpanelUrl?: string | null;
  cpanelUser: string;
  cpanelPass: string;
  packageName?: string | null;
  companyName?: string;
}) {
  const name = o.fullName?.trim() || "there";
  const brand = o.companyName || "SNS BD";
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2>Welcome to ${escape(brand)} hosting 🎉</h2>
    <p>Hi ${escape(name)},</p>
    <p>Your hosting for <strong>${escape(o.domain)}</strong> is now active${o.packageName ? ` on the <strong>${escape(o.packageName)}</strong> plan` : ""}.</p>
    <h3>cPanel access</h3>
    <table cellpadding="6" style="border-collapse:collapse;background:#f6f7f9;border-radius:8px">
      ${o.cpanelUrl ? `<tr><td><b>URL</b></td><td><a href="${escape(o.cpanelUrl)}">${escape(o.cpanelUrl)}</a></td></tr>` : ""}
      <tr><td><b>Username</b></td><td><code>${escape(o.cpanelUser)}</code></td></tr>
      <tr><td><b>Password</b></td><td><code>${escape(o.cpanelPass)}</code></td></tr>
    </table>
    <p style="margin-top:16px">Please change your password after first login. Point your domain's nameservers or A record as instructed to start serving traffic.</p>
    <p>— ${escape(brand)}</p>
  </div>`;
}

export const sendHostingWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { service_id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: svc, error } = await supabaseAdmin
      .from("services")
      .select("id, name, cpanel_url, cpanel_username, cpanel_password, customer_id, hosting_packages(name), profiles!services_customer_id_fkey(email, full_name)")
      .eq("id", data.service_id)
      .maybeSingle();
    if (error || !svc) throw new Error("Service not found");
    const prof: any = (svc as any).profiles;
    if (!prof?.email) throw new Error("Customer email missing");
    if (!svc.cpanel_username || !svc.cpanel_password) throw new Error("cPanel credentials missing");

    const { data: company } = await supabaseAdmin.from("company_settings").select("company_name").limit(1).maybeSingle();

    const result = await sendViaResend({
      to: prof.email,
      subject: `Your hosting for ${svc.name} is ready`,
      html: welcomeHtml({
        fullName: prof.full_name,
        domain: svc.name,
        cpanelUrl: svc.cpanel_url,
        cpanelUser: svc.cpanel_username,
        cpanelPass: svc.cpanel_password,
        packageName: (svc as any).hosting_packages?.name,
        companyName: company?.company_name || undefined,
      }),
    });

    await supabaseAdmin.from("service_events").insert({
      service_id: svc.id,
      status: result.ok ? "welcome_email_sent" : "welcome_email_skipped",
      message: result.ok ? `Welcome email sent to ${prof.email}` : (result.error || "Email skipped"),
      actor_id: context.userId,
    } as any);

    return result;
  });

/** Internal helper (server-only) used by activateHostingOrder. */
export async function sendWelcomeForService(service_id: string, actor_id: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: svc } = await supabaseAdmin
    .from("services")
    .select("id, name, cpanel_url, cpanel_username, cpanel_password, customer_id, hosting_packages(name), profiles!services_customer_id_fkey(email, full_name)")
    .eq("id", service_id)
    .maybeSingle();
  if (!svc) return { ok: false, error: "service not found" };
  const prof: any = (svc as any).profiles;
  if (!prof?.email || !svc.cpanel_username || !svc.cpanel_password) return { ok: false, error: "missing data" };
  const { data: company } = await supabaseAdmin.from("company_settings").select("company_name").limit(1).maybeSingle();
  const result = await sendViaResend({
    to: prof.email,
    subject: `Your hosting for ${svc.name} is ready`,
    html: welcomeHtml({
      fullName: prof.full_name,
      domain: svc.name,
      cpanelUrl: svc.cpanel_url,
      cpanelUser: svc.cpanel_username,
      cpanelPass: svc.cpanel_password,
      packageName: (svc as any).hosting_packages?.name,
      companyName: company?.company_name || undefined,
    }),
  });
  await supabaseAdmin.from("service_events").insert({
    service_id,
    status: result.ok ? "welcome_email_sent" : "welcome_email_skipped",
    message: result.ok ? `Welcome email sent to ${prof.email}` : (result.error || "Email skipped"),
    actor_id,
  } as any);
  return result;
}
