import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Automated renewals & invoicing.
 *
 * Reminder stages (services.renewal_reminder_stage):
 *   0 = none
 *   1 = 30-day heads-up email sent
 *   2 = 14-day: renewal invoice generated + email
 *   3 = 7-day reminder sent
 *   4 = 1-day final reminder sent
 *   5 = overdue: service marked suspended + email
 */

type Stage = 0 | 1 | 2 | 3 | 4 | 5;

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00Z").getTime();
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((d - today) / 86400000);
}

async function sendMail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const from = process.env.RESEND_FROM || "SNS BD <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const b: any = await res.json().catch(() => ({}));
    return { ok: false, error: b?.message || `Resend ${res.status}` };
  }
  return { ok: true };
}

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function reminderHtml(o: { name: string; service: string; expiry: string; days: number; amount: number; brand: string; invoiceNo?: string }) {
  const heading =
    o.days < 0 ? `Your service has expired`
    : o.days === 0 ? `Your service expires today`
    : `Renewal reminder — ${o.days} day${o.days === 1 ? "" : "s"} left`;
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2>${esc(heading)}</h2>
    <p>Hi ${esc(o.name)},</p>
    <p>Your service <b>${esc(o.service)}</b> ${o.days < 0 ? "expired" : "is due for renewal"} on <b>${esc(o.expiry)}</b>.</p>
    <p>Renewal amount: <b>${o.amount.toFixed(2)}</b> BDT${o.invoiceNo ? ` — Invoice <b>${esc(o.invoiceNo)}</b>` : ""}.</p>
    <p>Please pay from your client portal to keep the service active.</p>
    <p>— ${esc(o.brand)}</p>
  </div>`;
}

async function makeRenewalInvoice(admin: any, svc: any): Promise<string> {
  const price = Number(svc.sale_price) || 0;
  const invoice_number =
    "INV-R-" + Date.now().toString().slice(-8) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  const dueDate = new Date();
  dueDate.setUTCDate(dueDate.getUTCDate() + 14);
  const { data: inv, error } = await admin
    .from("invoices")
    .insert({
      customer_id: svc.customer_id,
      project_id: svc.project_id ?? null,
      invoice_number,
      due_date: dueDate.toISOString().slice(0, 10),
      subtotal: price, tax: 0, total: price,
      status: "sent",
      is_renewal: true,
      notes: `Auto-generated renewal for ${svc.name} (expires ${svc.expiry_date})`,
    })
    .select("id, invoice_number")
    .single();
  if (error) throw error;
  await admin.from("invoice_items").insert({
    invoice_id: inv.id,
    service_id: svc.id,
    description: `Renewal — ${svc.name}`,
    quantity: 1, unit_price: price, total: price,
  });
  await admin.from("services").update({ last_renewal_invoice_at: new Date().toISOString() }).eq("id", svc.id);
  return inv.invoice_number as string;
}

export async function processRenewalsBatch(): Promise<{
  processed: number;
  invoices_created: number;
  emails_sent: number;
  suspended: number;
  errors: string[];
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: company } = await supabaseAdmin.from("company_settings").select("company_name").limit(1).maybeSingle();
  const brand = company?.company_name || "SNS BD";

  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const { data: services, error } = await supabaseAdmin
    .from("services")
    .select("id, name, customer_id, project_id, sale_price, expiry_date, renewal_reminder_stage, status, profiles!services_customer_id_fkey(email, full_name)")
    .eq("renewable", true)
    .eq("status", "active")
    .not("expiry_date", "is", null)
    .lte("expiry_date", horizonStr);
  if (error) throw new Error(error.message);

  const out = { processed: 0, invoices_created: 0, emails_sent: 0, suspended: 0, errors: [] as string[] };

  for (const s of services ?? []) {
    try {
      out.processed++;
      if (!s.expiry_date) continue;
      const days = daysUntil(s.expiry_date);
      const stage = (s.renewal_reminder_stage ?? 0) as Stage;
      const prof: any = (s as any).profiles;
      const to = prof?.email as string | undefined;
      const name = (prof?.full_name as string | undefined) || "there";
      const price = Number(s.sale_price) || 0;

      let target: Stage = stage;
      let invoiceNo: string | undefined;

      if (days < 0 && stage < 5) {
        target = 5;
        await supabaseAdmin.from("services").update({ status: "suspended" as any }).eq("id", s.id);
        out.suspended++;
      } else if (days <= 1 && stage < 4) {
        target = 4;
      } else if (days <= 7 && stage < 3) {
        target = 3;
      } else if (days <= 14 && stage < 2) {
        target = 2;
        invoiceNo = await makeRenewalInvoice(supabaseAdmin, s);
        out.invoices_created++;
      } else if (days <= 30 && stage < 1) {
        target = 1;
      }

      if (target === stage) continue;

      if (to) {
        const subject =
          target === 5 ? `[${brand}] ${s.name} has expired`
          : target === 4 ? `[${brand}] Final reminder — ${s.name} expires tomorrow`
          : target === 3 ? `[${brand}] ${s.name} expires in 7 days`
          : target === 2 ? `[${brand}] Renewal invoice for ${s.name}`
          : `[${brand}] ${s.name} expires in 30 days`;
        const r = await sendMail(
          to,
          subject,
          reminderHtml({ name, service: s.name, expiry: s.expiry_date, days, amount: price, brand, invoiceNo }),
        );
        if (r.ok) out.emails_sent++;
        await supabaseAdmin.from("service_events").insert({
          service_id: s.id,
          status: `renewal_stage_${target}`,
          message: r.ok ? `Sent renewal email (stage ${target}) to ${to}` : `Email failed: ${r.error}`,
        } as any);
      }

      await supabaseAdmin.from("services").update({ renewal_reminder_stage: target }).eq("id", s.id);
    } catch (e: any) {
      out.errors.push(`${s.id}: ${e?.message ?? String(e)}`);
    }
  }

  return out;
}

export const runRenewalsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    return processRenewalsBatch();
  });

export const listUpcomingRenewals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only");
    const horizon = new Date();
    horizon.setUTCDate(horizon.getUTCDate() + 60);
    const { data, error } = await context.supabase
      .from("services")
      .select("id, name, type, expiry_date, sale_price, status, renewal_reminder_stage, customer_id, profiles!services_customer_id_fkey(email, full_name)")
      .eq("renewable", true)
      .not("expiry_date", "is", null)
      .lte("expiry_date", horizon.toISOString().slice(0, 10))
      .order("expiry_date", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });
