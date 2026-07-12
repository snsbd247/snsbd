import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!ok) throw new Error("Admins only");
}

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const sendAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subject: string; body: string; segment?: "all" | "customers" | "admins" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const segment = data.segment ?? "all";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");

    // Build recipient list
    let recipients: { email: string; full_name: string | null }[] = [];
    if (segment === "all") {
      const { data: p } = await supabaseAdmin.from("profiles").select("email, full_name").not("email", "is", null);
      recipients = (p ?? []) as any;
    } else {
      const role = segment === "admins" ? "admin" : "customer";
      const { data: rls } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", role as any);
      const ids = (rls ?? []).map((r: any) => r.user_id);
      if (ids.length) {
        const { data: p } = await supabaseAdmin.from("profiles").select("email, full_name").in("id", ids).not("email", "is", null);
        recipients = (p ?? []) as any;
      }
    }

    const { data: ann, error: annErr } = await supabaseAdmin
      .from("announcements")
      .insert({ subject: data.subject, body: data.body, segment, created_by: context.userId })
      .select().single();
    if (annErr) throw new Error(annErr.message);

    let sent = 0, failed = 0;
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || "SNS BD <onboarding@resend.dev>";
    if (key && recipients.length) {
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111"><h2>${esc(data.subject)}</h2><div>${data.body}</div></div>`;
      // Resend batch endpoint (up to 100 per call)
      for (let i = 0; i < recipients.length; i += 100) {
        const batch = recipients.slice(i, i + 100);
        try {
          const res = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify(batch.map((r) => ({ from, to: [r.email], subject: data.subject, html }))),
          });
          if (res.ok) sent += batch.length; else failed += batch.length;
        } catch { failed += batch.length; }
      }
    } else if (!key) {
      failed = recipients.length;
    }

    await supabaseAdmin
      .from("announcements")
      .update({ sent_count: sent, fail_count: failed, sent_at: new Date().toISOString() })
      .eq("id", ann.id);

    await logAudit({
      actor_id: context.userId,
      action: "announcement.sent",
      entity: "announcement",
      entity_id: ann.id,
      meta: { segment, sent, failed, recipients: recipients.length },
    });

    return { id: ann.id, sent, failed, total: recipients.length };
  });
