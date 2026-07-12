import { createFileRoute } from "@tanstack/react-router";

// pg_cron calls this daily. It:
// 1) Marks unpaid invoices past due_date as `overdue` and adds a one-time
//    late fee (percentage from company_settings.late_fee_percent).
// 2) After `grace_days` past the due date, suspends hosting services
//    (DB status + WHM suspendacct when linked) and expires domain services.
//    Auto-suspend can be disabled via company_settings.auto_suspend.
export const Route = createFileRoute("/api/public/hooks/enforce-overdue")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: settings } = await supabaseAdmin
          .from("company_settings")
          .select("late_fee_percent, grace_days, auto_suspend")
          .maybeSingle();
        const feePct = Number((settings as any)?.late_fee_percent ?? 2);
        const graceDays = Number((settings as any)?.grace_days ?? 7);
        const autoSuspend = (settings as any)?.auto_suspend !== false;

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const graceCut = new Date(today);
        graceCut.setDate(today.getDate() - graceDays);
        const graceCutISO = graceCut.toISOString().slice(0, 10);

        // 1) Overdue invoices — apply late fee once, mark overdue
        const { data: overdueInvs } = await supabaseAdmin
          .from("invoices")
          .select("id, subtotal, tax, total, amount_paid, status, late_fee, late_fee_applied_at, due_date")
          .lt("due_date", todayISO)
          .in("status", ["draft", "sent", "partial", "overdue"]);

        const updatedInvoices: string[] = [];
        for (const inv of overdueInvs ?? []) {
          const balance = Number(inv.total) - Number(inv.amount_paid);
          if (balance <= 0) continue;
          const patch: {
            late_fee?: number;
            total?: number;
            late_fee_applied_at?: string;
            status?: "overdue";
          } = {};
          if (!inv.late_fee_applied_at && feePct > 0) {
            const fee = Math.round(Number(inv.subtotal) * feePct) / 100;
            patch.late_fee = Number(inv.late_fee ?? 0) + fee;
            patch.total = Number(inv.total) + fee;
            patch.late_fee_applied_at = new Date().toISOString();
          }
          if (inv.status !== "overdue") patch.status = "overdue";
          if (Object.keys(patch).length) {
            await supabaseAdmin.from("invoices").update(patch).eq("id", inv.id);
            updatedInvoices.push(inv.id);
          }
        }

        const result = {
          ok: true,
          invoices_updated: updatedInvoices.length,
          hosting_suspended: 0,
          hosting_whm_suspended: 0,
          domains_deactivated: 0,
          grace_days: graceDays,
          late_fee_percent: feePct,
          auto_suspend: autoSuspend,
        };

        if (!autoSuspend) return Response.json(result);

        // 2 & 3) Suspend/deactivate services with invoices past grace period
        const { data: staleItems } = await supabaseAdmin
          .from("invoice_items")
          .select("service_id, invoices!inner(due_date, status, total, amount_paid)")
          .not("service_id", "is", null)
          .lte("invoices.due_date", graceCutISO)
          .in("invoices.status", ["overdue", "sent", "partial", "draft"]);

        const serviceIds = Array.from(
          new Set(
            (staleItems ?? [])
              .filter((r: any) => Number(r.invoices.total) - Number(r.invoices.amount_paid) > 0)
              .map((r: any) => r.service_id as string),
          ),
        );

        if (serviceIds.length) {
          const { data: svcs } = await supabaseAdmin
            .from("services")
            .select("id, type, status, whm_server_id, whm_account_user, cpanel_username")
            .in("id", serviceIds)
            .in("status", ["active", "pending"]);
          for (const s of svcs ?? []) {
            const nextStatus = s.type === "hosting" ? "suspended" : "expired";
            await supabaseAdmin.from("services").update({ status: nextStatus }).eq("id", s.id);
            if (nextStatus === "suspended") {
              result.hosting_suspended++;
              const user = s.whm_account_user || s.cpanel_username;
              if (s.whm_server_id && user) {
                try {
                  const { data: srv } = await supabaseAdmin
                    .from("whm_servers")
                    .select("hostname, port, username, api_token, auth_type")
                    .eq("id", s.whm_server_id)
                    .maybeSingle();
                  if (srv) {
                    const auth = srv.auth_type === "password"
                      ? `Basic ${btoa(`${srv.username}:${srv.api_token}`)}`
                      : `whm ${srv.username}:${srv.api_token}`;
                    const url = `https://${srv.hostname}:${srv.port}/json-api/suspendacct?api.version=1&user=${encodeURIComponent(user)}&reason=${encodeURIComponent("Overdue invoice - auto-suspended")}`;
                    const res = await fetch(url, { headers: { Authorization: auth, Accept: "application/json" } });
                    if (res.ok) result.hosting_whm_suspended++;
                  }
                } catch (_) {
                  // swallow — DB status is source of truth; retry next run
                }
              }
            } else {
              result.domains_deactivated++;
            }
          }
        }

        return Response.json(result);
      },
    },
  },
});
