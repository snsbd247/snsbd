import { createFileRoute } from "@tanstack/react-router";

// pg_cron calls this daily. It:
// 1) Marks unpaid invoices past due_date as `overdue` and adds a one-time late fee
//    (percentage configured in company_settings.late_fee_percent, default 2%).
// 2) Suspends hosting services whose overdue invoice is >= 1 day past due.
// 3) Deactivates (expires) domain services whose overdue invoice is >= 1 day past due.
export const Route = createFileRoute("/api/public/hooks/enforce-overdue")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayISO = yesterday.toISOString().slice(0, 10);

        const { data: settings } = await supabaseAdmin
          .from("company_settings")
          .select("late_fee_percent")
          .maybeSingle();
        const feePct = Number((settings as any)?.late_fee_percent ?? 2);

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
          const patch: Record<string, unknown> = {};
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

        // 2 & 3) Suspend/deactivate services tied to invoices past due (>= 1 day)
        const { data: staleItems } = await supabaseAdmin
          .from("invoice_items")
          .select("service_id, invoices!inner(due_date, status, total, amount_paid)")
          .not("service_id", "is", null)
          .lte("invoices.due_date", yesterdayISO)
          .in("invoices.status", ["overdue", "sent", "partial", "draft"]);

        const serviceIds = Array.from(
          new Set(
            (staleItems ?? [])
              .filter((r: any) => Number(r.invoices.total) - Number(r.invoices.amount_paid) > 0)
              .map((r: any) => r.service_id as string),
          ),
        );

        const suspended: string[] = [];
        const deactivated: string[] = [];
        if (serviceIds.length) {
          const { data: svcs } = await supabaseAdmin
            .from("services")
            .select("id, type, status")
            .in("id", serviceIds)
            .in("status", ["active", "pending"]);
          for (const s of svcs ?? []) {
            const nextStatus = s.type === "hosting" ? "suspended" : "expired";
            await supabaseAdmin.from("services").update({ status: nextStatus }).eq("id", s.id);
            if (nextStatus === "suspended") suspended.push(s.id);
            else deactivated.push(s.id);
          }
        }

        return Response.json({
          ok: true,
          invoices_updated: updatedInvoices.length,
          hosting_suspended: suspended.length,
          domains_deactivated: deactivated.length,
          late_fee_percent: feePct,
        });
      },
    },
  },
});
